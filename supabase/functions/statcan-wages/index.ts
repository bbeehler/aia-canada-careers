// statcan-wages: pulls the latest auto care earnings from Statistics Canada's Web Data Service and
// saves them for the Salary Information section. Runs daily (pg_cron with the server-only secret)
// or on demand by AIA staff. Source: Survey of Employment, Payrolls and Hours (SEPH),
// tables 14-10-0203-01 (average weekly earnings) and 14-10-0205-01 (average hourly earnings, hourly-paid).
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const WDS = "https://www150.statcan.gc.ca/t1/wds/rest/getDataFromCubePidCoordAndLatestNPeriods";
const GEOS: [number, string][] = [
  [1, "Canada"], [2, "Newfoundland and Labrador"], [3, "Prince Edward Island"], [4, "Nova Scotia"], [5, "New Brunswick"],
  [6, "Quebec"], [7, "Ontario"], [8, "Manitoba"], [9, "Saskatchewan"], [10, "Alberta"], [11, "British Columbia"],
  [12, "Yukon"], [14, "Northwest Territories"], [15, "Nunavut"],
];
const INDUSTRIES: [number, string, string][] = [
  [379, "Automotive repair and maintenance", "8111"],
  [182, "Automotive parts, accessories and tire retailers", "4413"],
  [160, "New motor vehicle parts and accessories merchant wholesalers", "4153"],
  [134, "Motor vehicle parts manufacturing", "3363"],
  [2, "All industries (for comparison)", ""],
];
const N = 13; // latest 13 months: current value plus the same month last year

async function fetchSeries(requests: { productId: number; coordinate: string; latestN: number }[]) {
  const out: any[] = [];
  for (let i = 0; i < requests.length; i += 50) {
    const res = await fetch(WDS, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requests.slice(i, i + 50)) });
    if (!res.ok) throw new Error(`Statistics Canada ${res.status}`);
    out.push(...await res.json());
  }
  return out;
}

const summarize = (points: any[]) => {
  const pts = (points ?? []).map((p: any) => ({ period: String(p.refPer).slice(0, 7), value: p.value == null ? null : Number(p.value) }))
    .sort((a: any, b: any) => a.period.localeCompare(b.period));
  const latest = [...pts].reverse().find((p) => p.value != null) ?? null;
  let yoy: number | null = null;
  if (latest) {
    const [y, m] = latest.period.split("-");
    const prior = pts.find((p: any) => p.period === `${Number(y) - 1}-${m}`);
    if (prior?.value) yoy = Math.round(((latest.value! - prior.value) / prior.value) * 1000) / 10;
  }
  return { latest: latest?.value ?? null, period: latest?.period ?? null, yoy };
};

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

  const reqs: { productId: number; coordinate: string; latestN: number }[] = [];
  for (const [g] of GEOS) for (const [n] of INDUSTRIES) {
    reqs.push({ productId: 14100203, coordinate: `${g}.1.1.${n}.0.0.0.0.0.0`, latestN: N }); // weekly, all employees, incl. overtime
    reqs.push({ productId: 14100205, coordinate: `${g}.1.${n}.0.0.0.0.0.0.0`, latestN: N }); // hourly, hourly-paid, incl. overtime
  }

  let raw: any[];
  try { raw = await fetchSeries(reqs); } catch (e) { console.error(e); return json({ error: "Statistics Canada is unavailable; the last saved figures are still shown." }, 502); }

  const byKey = new Map<string, any>();
  raw.forEach((r) => { if (r?.status === "SUCCESS") byKey.set(`${r.object.productId}|${r.object.coordinate}`, summarize(r.object.vectorDataPoint)); });

  const regions = GEOS.map(([g, name]) => ({
    name,
    industries: INDUSTRIES.map(([n, label, naics]) => {
      const weekly = byKey.get(`14100203|${g}.1.1.${n}.0.0.0.0.0.0`) ?? { latest: null, period: null, yoy: null };
      const hourly = byKey.get(`14100205|${g}.1.${n}.0.0.0.0.0.0.0`) ?? { latest: null, period: null, yoy: null };
      return { label, naics, comparison: n === 2, weekly, hourly };
    }),
  }));
  const periods = regions.flatMap((r) => r.industries.map((i) => i.weekly.period)).filter(Boolean).sort();
  const data = { latest_period: periods[periods.length - 1] ?? null, regions };

  if (!data.latest_period) return json({ error: "No figures came back from Statistics Canada; keeping the last saved copy." }, 502);
  await admin.from("statcan_wages").upsert({ id: "latest", fetched_at: new Date().toISOString(), data });
  return json({ ok: true, latest_period: data.latest_period, series: byKey.size });
});
