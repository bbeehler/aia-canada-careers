// check-membership: checks one company against Insightly. Called when an employer adds their company,
// from the employer dashboard, and by staff from the Companies tab (staff can also link a company
// to a specific Insightly organisation ID). See _shared/insightly.ts for the matching rules.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { companyEmail, cors, evaluateCompany, insightlyConfig, json, makeInsightly } from "../_shared/insightly.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: u } = await asUser.auth.getUser();
  if (!u?.user) return json({ error: "Sign in required" }, 401);

  let body: { company_id?: string; insightly_org_id?: string | null } = {};
  try { body = await req.json(); } catch { /* empty */ }
  if (!body.company_id) return json({ error: "company_id is required" }, 400);

  const { data: company } = await admin.from("companies").select("*").eq("id", body.company_id).maybeSingle();
  if (!company) return json({ error: "Company not found" }, 404);
  const [{ data: profile }, { data: link }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", u.user.id).maybeSingle(),
    admin.from("company_users").select("user_id").eq("company_id", company.id).eq("user_id", u.user.id).maybeSingle(),
  ]);
  const isStaff = profile?.role === "admin" || profile?.role === "staff";
  if (!link && !isStaff) return json({ error: "Not allowed" }, 403);

  // Staff can link (or unlink) a company to a specific Insightly organisation
  if (isStaff && body.insightly_org_id !== undefined) {
    const id = (body.insightly_org_id ?? "").toString().replace(/\D/g, "") || null;
    await admin.from("companies").update({ insightly_org_id: id }).eq("id", company.id);
    company.insightly_org_id = id;
  }

  const cfg = insightlyConfig();
  if (!cfg) return json({ status: "not_configured" });
  const email = await companyEmail(admin, company, link ? u.user.id : undefined);
  const result = await evaluateCompany(admin, makeInsightly(cfg), company, email);
  return json({ status: result.outcome, organisation: result.organisation, changed: result.changed });
});
