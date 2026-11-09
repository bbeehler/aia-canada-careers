// sync-memberships: re-checks every member company (and every company linked to Insightly) every night.
// Non-renewed memberships lose free posting; renewed ones get it back. Runs from a scheduled job
// (pg_cron, authenticated with a server-only secret), or on demand by AIA staff from the Companies tab.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { companyEmail, cors, evaluateCompany, insightlyConfig, json, makeInsightly } from "../_shared/insightly.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Who is asking: the nightly job (secret header) or a signed-in staff member
  let trigger = "";
  const secret = req.headers.get("x-cron-secret");
  if (secret) {
    const { data } = await admin.from("app_secrets").select("value").eq("name", "cron_secret").maybeSingle();
    if (data?.value && data.value === secret) trigger = "nightly";
  } else {
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: u } = await asUser.auth.getUser();
    if (u?.user) {
      const { data: p } = await admin.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
      if (p?.role === "admin" || p?.role === "staff") trigger = `manual:${u.user.email}`;
    }
  }
  if (!trigger) return json({ error: "Not allowed" }, 403);

  const cfg = insightlyConfig();
  if (!cfg) return json({ status: "not_configured" });
  const ins = makeInsightly(cfg);

  const { data: companies } = await admin.from("companies").select("*")
    .or("is_member.eq.true,insightly_org_id.not.is.null").order("name");
  const summary = { checked: 0, members: 0, revoked: 0, restored: 0, not_found: 0, errors: 0, revoked_companies: [] as string[], restored_companies: [] as string[] };

  for (const company of companies ?? []) {
    const email = await companyEmail(admin, company);
    const r = await evaluateCompany(admin, ins, company, email);
    summary.checked++;
    if (r.outcome === "member") summary.members++;
    if (r.outcome === "not_found") summary.not_found++;
    if (r.outcome === "error") summary.errors++;
    if (r.changed === "revoked") { summary.revoked++; summary.revoked_companies.push(company.name); }
    if (r.changed === "restored") { summary.restored++; summary.restored_companies.push(company.name); }
    await new Promise((res) => setTimeout(res, 150)); // stay well under Insightly's rate limits
  }

  await admin.from("membership_sync_runs").insert({ trigger, summary });
  return json({ status: "ok", ...summary });
});
