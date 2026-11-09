// check-membership: looks up a company in Insightly and marks it as an AIA Canada member if it is one.
// Called by the site when an employer adds their company, and by staff from the review queue.
// The Insightly API key never leaves the server. Configure these secrets in Supabase
// (Edge Functions > Secrets):
//   INSIGHTLY_API_KEY       your Insightly API key (User Settings > API in Insightly)
//   INSIGHTLY_POD           the pod in your Insightly API URL, e.g. na1 (from https://api.na1.insightly.com)
//   INSIGHTLY_MEMBER_FIELD  where membership is recorded on an Organisation: a field name such as
//                           Membership_Status__c, or TAG:<tag name> if members are tagged, e.g. TAG:Member
//   INSIGHTLY_MEMBER_VALUES values that mean "current member", comma-separated (default: Active,Member,Current,Yes,true)
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Free email providers can't prove which company someone works for.
const FREE_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "hotmail.ca", "live.com", "live.ca", "msn.com",
  "yahoo.com", "yahoo.ca", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "shaw.ca",
  "rogers.com", "bell.net", "sympatico.ca", "telus.net", "videotron.ca", "cogeco.ca", "eastlink.ca",
]);

type Org = Record<string, unknown> & {
  ORGANISATION_ID: number; ORGANISATION_NAME?: string; WEBSITE?: string; EMAIL_DOMAIN?: string;
  TAGS?: { TAG_NAME: string }[]; CUSTOMFIELDS?: { FIELD_NAME: string; FIELD_VALUE: unknown }[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: userData } = await asUser.auth.getUser();
  const caller = userData?.user;
  if (!caller) return json({ error: "Sign in required" }, 401);

  let companyId = "";
  try { companyId = String((await req.json()).company_id ?? ""); } catch { /* empty body */ }
  if (!companyId) return json({ error: "company_id is required" }, 400);

  const { data: company } = await admin.from("companies").select("*").eq("id", companyId).maybeSingle();
  if (!company) return json({ error: "Company not found" }, 404);

  const [{ data: profile }, { data: link }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", caller.id).maybeSingle(),
    admin.from("company_users").select("user_id").eq("company_id", companyId).eq("user_id", caller.id).maybeSingle(),
  ]);
  const isStaff = profile?.role === "admin" || profile?.role === "staff";
  if (!link && !isStaff) return json({ error: "Not allowed" }, 403);

  // The email we match on: the employer's own, or (when staff run the check) the company creator's.
  let email = caller.email ?? "";
  if (!link) {
    const { data: creator } = await admin.auth.admin.getUserById(company.created_by);
    email = creator?.user?.email ?? "";
  }
  const domain = email.split("@")[1]?.toLowerCase() ?? "";

  const apiKey = Deno.env.get("INSIGHTLY_API_KEY");
  const memberField = Deno.env.get("INSIGHTLY_MEMBER_FIELD");
  if (!apiKey || !memberField) return json({ status: "not_configured" });
  const pod = Deno.env.get("INSIGHTLY_POD") ?? "na1";
  const memberValues = (Deno.env.get("INSIGHTLY_MEMBER_VALUES") ?? "Active,Member,Current,Yes,true")
    .split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);

  const base = `https://api.${pod}.insightly.com/v3.1`;
  const headers = { Authorization: `Basic ${btoa(`${apiKey}:`)}`, Accept: "application/json" };
  const get = async <T>(path: string): Promise<T> => {
    const res = await fetch(`${base}${path}`, { headers });
    if (!res.ok) throw new Error(`Insightly ${res.status}`);
    return await res.json() as T;
  };

  const isMember = (org: Org) => {
    if (memberField.toUpperCase().startsWith("TAG:")) {
      const tag = memberField.slice(4).trim().toLowerCase();
      return (org.TAGS ?? []).some((t) => t.TAG_NAME?.toLowerCase() === tag);
    }
    const raw = memberField in org ? org[memberField]
      : (org.CUSTOMFIELDS ?? []).find((f) => f.FIELD_NAME === memberField)?.FIELD_VALUE;
    if (raw === true) return true;
    if (raw == null) return false;
    return String(raw).split(/[;,]/).map((v) => v.trim().toLowerCase()).some((v) => memberValues.includes(v));
  };
  const domainMatches = (org: Org) => {
    const hay = `${org.WEBSITE ?? ""} ${org.EMAIL_DOMAIN ?? ""}`.toLowerCase();
    return !!domain && hay.includes(domain);
  };

  let match: Org | null = null;
  let how = "";
  try {
    // 1. A contact in Insightly with this exact email, linked to an organisation
    if (email) {
      const contacts = await get<{ ORGANISATION_ID?: number | null }[]>(
        `/Contacts/Search?field_name=EMAIL_ADDRESS&field_value=${encodeURIComponent(email)}&top=5`);
      const orgId = contacts.find((c) => c.ORGANISATION_ID)?.ORGANISATION_ID;
      if (orgId) { match = await get<Org>(`/Organisations/${orgId}`); how = `contact ${email}`; }
    }
    // 2. An organisation with the same name whose website or email domain matches the employer's work email
    if (!match && domain && !FREE_DOMAINS.has(domain)) {
      const orgs = await get<Org[]>(
        `/Organisations/Search?field_name=ORGANISATION_NAME&field_value=${encodeURIComponent(company.name)}&top=10`);
      match = orgs.find(domainMatches) ?? null;
      if (match) how = `organisation name and ${domain}`;
    }
  } catch (e) {
    await admin.from("companies").update({ membership_checked_at: new Date().toISOString(), membership_note: "Insightly check failed; try again later" }).eq("id", companyId);
    console.error(e);
    return json({ status: "error" });
  }

  const now = new Date().toISOString();
  if (match && isMember(match)) {
    await admin.from("companies").update({
      is_member: true, member_verified_at: now, membership_source: "insightly", insightly_org_id: String(match.ORGANISATION_ID),
      membership_checked_at: now, membership_note: `Member in Insightly: ${match.ORGANISATION_NAME ?? ""} (matched by ${how})`,
    }).eq("id", companyId);
    return json({ status: "member", organisation: match.ORGANISATION_NAME });
  }
  if (match) {
    const lapsed = company.membership_source === "insightly";
    await admin.from("companies").update({
      ...(lapsed ? { is_member: false } : {}),
      insightly_org_id: String(match.ORGANISATION_ID), membership_checked_at: now,
      membership_note: `In Insightly as ${match.ORGANISATION_NAME ?? ""}, but not a current member`,
    }).eq("id", companyId);
    return json({ status: "not_member", organisation: match.ORGANISATION_NAME });
  }
  await admin.from("companies").update({
    membership_checked_at: now,
    membership_note: domain && FREE_DOMAINS.has(domain)
      ? `Signed up with a personal email (${domain}); staff can verify manually`
      : "No matching organisation found in Insightly",
  }).eq("id", companyId);
  return json({ status: "not_found" });
});
