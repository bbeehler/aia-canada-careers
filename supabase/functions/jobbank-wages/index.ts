// jobbank-wages: loads Job Bank (Employment and Social Development Canada) prevailing wages for the
// occupations used on career pages. Finds the newest "Wages" CSV on the Government of Canada open data
// portal (dataset adad580f-76b0-4502-bd05-20c125de9116), keeps the rows for each career's NOC 2021 code,
// and saves them. Runs weekly (pg_cron with the server-only secret) or on demand by AIA staff.
// It skips the download when the file hasn't changed and every career's occupation is already loaded.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const PACKAGE = "https://open.canada.ca/data/api/action/package_show?id=adad580f-76b0-4502-bd05-20c125de9116";

// Splits one CSV line, handling quoted fields and doubled quotes.
function parseLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}
const num = (s: string | undefined) => { const n = Number(String(s ?? "").replace(/[$,\s]/g, "")); return s && Number.isFinite(n) && n > 0 ? n : null; };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let allowed = false;
  const secret = req.headers.get("x-cron-secret");
  if (secret) {
    const { data } = await admin.from("app_secrets").select("value").eq("name", "cron_secret").maybeSingle();
    allowed = !!data?.value && data.value === secret;
  } else {
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: u } = await asUser.auth.getUser();
    if (u?.user) {
      const { data: p } = await admin.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
      allowed = p?.role === "admin" || p?.role === "staff";
    }
  }
  if (!allowed) return json({ error: "Not allowed" }, 403);
  let force = false;
  try { force = !!(await req.json()).force; } catch { /* no body */ }

  // Which occupations do careers need?
  const { data: careers } = await admin.from("careers").select("noc_code").neq("noc_code", "");
  const nocs = new Set((careers ?? []).map((c: any) => c.noc_code as string));
  if (!nocs.size) return json({ ok: true, note: "No careers have an occupation code yet." });

  // Newest English "Wages" CSV in the dataset
  let resource: any;
  try {
    const pkg = await (await fetch(PACKAGE)).json();
    resource = (pkg?.result?.resources ?? [])
      .filter((r: any) => String(r.format).toUpperCase() === "CSV" && /wages/i.test(r.name ?? ""))
      .sort((a: any, b: any) => String(b.name).localeCompare(String(a.name), undefined, { numeric: true }))[0];
  } catch (e) { console.error(e); }
  if (!resource?.url) return json({ error: "Couldn’t reach the open data portal; keeping the saved wages." }, 502);

  const { data: meta } = await admin.from("jobbank_meta").select("*").eq("id", "latest").maybeSingle();
  const { data: have } = await admin.from("jobbank_wages").select("noc").eq("region_code", "ER00").eq("prov", "NAT");
  const loaded = new Set((have ?? []).map((r: any) => r.noc));
  const missing = [...nocs].filter((n) => !loaded.has(n));
  if (!force && meta?.resource_url === resource.url && missing.length === 0) {
    await admin.from("jobbank_meta").update({ fetched_at: new Date().toISOString() }).eq("id", "latest");
    return json({ ok: true, unchanged: true, file: resource.name });
  }

  const res = await fetch(resource.url);
  if (!res.ok) return json({ error: `Download failed (${res.status}); keeping the saved wages.` }, 502);
  const text = (await res.text()).replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/);
  const header = parseLine(lines[0]);
  const col = (re: RegExp) => header.findIndex((h) => re.test(h));
  const c = {
    noc: col(/^NOC_CNP/i), title: col(/^NOC_Title_eng/i), prov: col(/^prov$/i), er: col(/^ER_Code/i), erName: col(/^ER_Name/i),
    low: col(/^Low_Wage/i), median: col(/^Median_Wage/i), high: col(/^High_Wage/i), avg: col(/^Average_Wage/i),
    period: col(/^Reference_Period/i), revised: col(/^Revision_Date/i), annual: col(/^Annual_Wage_Flag/i),
  };
  if (c.noc < 0 || c.median < 0 || c.prov < 0) return json({ error: "The wage file’s layout has changed; keeping the saved wages." }, 502);

  const prefixes = [...nocs].map((n) => `NOC_${n},`);
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i];
    if (!prefixes.some((p) => l.startsWith(p))) continue;
    const f = parseLine(l);
    const noc = f[c.noc].replace(/^NOC_/, "");
    const median = num(f[c.median]);
    if (!median) continue; // Job Bank leaves wages blank where there isn't enough data
    rows.push({
      noc, noc_title: f[c.title] ?? "", prov: f[c.prov], region_code: f[c.er] || "ER00", region_name: f[c.erName] || f[c.prov],
      low: num(f[c.low]), median, high: num(f[c.high]), average: num(f[c.avg]),
      annual: String(f[c.annual] ?? "0").trim() === "1",
      reference_period: f[c.period] || null, revised: /^\d{4}-\d{2}-\d{2}$/.test(f[c.revised] ?? "") ? f[c.revised] : null,
    });
  }
  if (!rows.length) return json({ error: "No wages found for the careers’ occupation codes; keeping the saved wages." }, 502);

  // Replace the saved wages for these occupations
  await admin.from("jobbank_wages").delete().in("noc", [...nocs]);
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin.from("jobbank_wages").upsert(rows.slice(i, i + 500));
    if (error) return json({ error: error.message }, 500);
  }
  await admin.from("jobbank_meta").upsert({
    id: "latest", resource_name: resource.name, resource_url: resource.url,
    published: resource.last_modified ?? resource.created ?? null, fetched_at: new Date().toISOString(), rows: rows.length,
  });
  return json({ ok: true, file: resource.name, rows: rows.length, occupations: nocs.size });
});
