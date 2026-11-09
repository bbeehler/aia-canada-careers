// Shared Insightly membership logic for check-membership and sync-memberships.
// deno-lint-ignore-file no-explicit-any
export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Free email providers can't prove which company someone works for.
const FREE_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "hotmail.ca", "live.com", "live.ca", "msn.com",
  "yahoo.com", "yahoo.ca", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "shaw.ca",
  "rogers.com", "bell.net", "sympatico.ca", "telus.net", "videotron.ca", "cogeco.ca", "eastlink.ca",
]);

type Org = Record<string, any> & { ORGANISATION_ID: number; ORGANISATION_NAME?: string };
export type Outcome = "member" | "not_member" | "not_found" | "not_configured" | "error";

export function insightlyConfig() {
  const apiKey = (Deno.env.get("INSIGHTLY_API_KEY") ?? "").trim();
  const field = (Deno.env.get("INSIGHTLY_MEMBER_FIELD") ?? "").trim();
  if (!apiKey || !field) return null;
  const pod = (Deno.env.get("INSIGHTLY_POD") ?? "na1").trim();
  const values = (Deno.env.get("INSIGHTLY_MEMBER_VALUES") ?? "Active,Member,Current,Yes,true")
    .split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  return { apiKey, field, pod, values };
}

export function makeInsightly(cfg: NonNullable<ReturnType<typeof insightlyConfig>>) {
  const base = `https://api.${cfg.pod}.insightly.com/v3.1`;
  const headers = { Authorization: `Basic ${btoa(`${cfg.apiKey}:`)}`, Accept: "application/json" };
  const get = async <T>(path: string): Promise<T | null> => {
    const res = await fetch(`${base}${path}`, { headers });
    if (res.status === 404) return null;
    if (res.status === 429) { await new Promise((r) => setTimeout(r, 2000)); return get<T>(path); }
    if (!res.ok) throw new Error(`Insightly ${res.status}`);
    return await res.json() as T;
  };
  const rawValue = (org: Org) => {
    if (cfg.field.toUpperCase().startsWith("TAG:")) return null;
    return cfg.field in org ? org[cfg.field] : (org.CUSTOMFIELDS ?? []).find((f: any) => f.FIELD_NAME === cfg.field)?.FIELD_VALUE;
  };
  const isMember = (org: Org) => {
    if (cfg.field.toUpperCase().startsWith("TAG:")) {
      const tag = cfg.field.slice(4).trim().toLowerCase();
      return (org.TAGS ?? []).some((t: any) => t.TAG_NAME?.toLowerCase() === tag);
    }
    const raw = rawValue(org);
    if (raw === true) return true;
    if (raw == null) return false;
    return String(raw).split(/[;,]/).map((v) => v.trim().toLowerCase()).some((v) => cfg.values.includes(v));
  };

  // Find the Insightly organisation for a company: a linked ID first, then the employer's
  // exact email on a contact, then same name plus matching web/email domain.
  async function findOrg(orgId: string | null, email: string, companyName: string): Promise<{ org: Org | null; how: string; personalEmail: boolean }> {
    const domain = email.split("@")[1]?.toLowerCase() ?? "";
    const personalEmail = !!domain && FREE_DOMAINS.has(domain);
    if (orgId) {
      const org = await get<Org>(`/Organisations/${encodeURIComponent(orgId)}`);
      if (org) return { org, how: "linked Insightly record", personalEmail };
    }
    if (email) {
      const contacts = await get<{ ORGANISATION_ID?: number | null }[]>(
        `/Contacts/Search?field_name=EMAIL_ADDRESS&field_value=${encodeURIComponent(email)}&top=5`) ?? [];
      const id = contacts.find((c) => c.ORGANISATION_ID)?.ORGANISATION_ID;
      if (id) {
        const org = await get<Org>(`/Organisations/${id}`);
        if (org) return { org, how: `contact ${email}`, personalEmail };
      }
    }
    if (domain && !personalEmail && companyName) {
      const orgs = await get<Org[]>(
        `/Organisations/Search?field_name=ORGANISATION_NAME&field_value=${encodeURIComponent(companyName)}&top=10`) ?? [];
      const org = orgs.find((o) => `${o.WEBSITE ?? ""} ${o.EMAIL_DOMAIN ?? ""}`.toLowerCase().includes(domain)) ?? null;
      if (org) return { org, how: `organisation name and ${domain}`, personalEmail };
    }
    return { org: null, how: "", personalEmail };
  }

  return { findOrg, isMember, rawValue };
}

// Checks one company and updates it. Members get free posting; anyone whose Insightly record says
// they are no longer a current member loses it. Companies not found in Insightly are left as they are.
export async function evaluateCompany(admin: any, ins: ReturnType<typeof makeInsightly>, company: any, email: string) {
  const now = new Date().toISOString();
  let found;
  try {
    found = await ins.findOrg(company.insightly_org_id, email, company.name);
  } catch (e) {
    console.error(company.id, e);
    await admin.from("companies").update({ membership_checked_at: now, membership_note: "Insightly check failed; will retry" }).eq("id", company.id);
    return { outcome: "error" as Outcome, changed: null };
  }
  const { org, how, personalEmail } = found;

  if (org && ins.isMember(org)) {
    const restored = !company.is_member;
    await admin.from("companies").update({
      is_member: true, member_verified_at: company.is_member ? company.member_verified_at ?? now : now,
      membership_source: "insightly", insightly_org_id: String(org.ORGANISATION_ID), membership_lapsed_at: null,
      membership_checked_at: now, membership_note: `Current member in Insightly: ${org.ORGANISATION_NAME ?? ""} (matched by ${how})`,
    }).eq("id", company.id);
    return { outcome: "member" as Outcome, changed: restored ? "restored" : null, organisation: org.ORGANISATION_NAME };
  }

  if (org) {
    const status = ins.rawValue(org);
    const revoked = company.is_member;
    await admin.from("companies").update({
      is_member: false, insightly_org_id: String(org.ORGANISATION_ID), membership_source: "insightly",
      ...(revoked ? { membership_lapsed_at: now } : {}),
      membership_checked_at: now,
      membership_note: `${revoked ? "Free posting removed: " : ""}Insightly shows ${org.ORGANISATION_NAME ?? "this company"} as ${status ? `“${status}”` : "not a current member"}`,
    }).eq("id", company.id);
    return { outcome: "not_member" as Outcome, changed: revoked ? "revoked" : null, organisation: org.ORGANISATION_NAME };
  }

  await admin.from("companies").update({
    membership_checked_at: now,
    membership_note: personalEmail
      ? "Signed up with a personal email; staff should link this company to its Insightly record"
      : company.is_member
        ? "Member, but not found in Insightly; staff should link this company to its Insightly record"
        : "No matching organisation found in Insightly",
  }).eq("id", company.id);
  return { outcome: "not_found" as Outcome, changed: null };
}

// The email to match a company on: the given user's, else the first linked user's, else the creator's.
export async function companyEmail(admin: any, company: any, preferredUserId?: string) {
  const ids: string[] = [];
  if (preferredUserId) ids.push(preferredUserId);
  const { data: links } = await admin.from("company_users").select("user_id").eq("company_id", company.id);
  (links ?? []).forEach((l: any) => ids.push(l.user_id));
  if (company.created_by) ids.push(company.created_by);
  for (const id of ids) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data?.user?.email) return data.user.email as string;
  }
  return "";
}
