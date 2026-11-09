import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { adminUsers } from "../lib/adminUsers";
import type { Company, Role } from "../lib/types";
import PageHero, { heroPrimary } from "../components/PageHero";

interface UserRow {
  id: string; email: string; full_name: string | null; role: Role; created_at: string;
  last_sign_in_at: string | null; company_ids: string[]; company_names: string[];
}

export const ROLE_INFO: Record<Role, { label: string; help: string }> = {
  candidate: { label: "Job seeker", help: "Applies to jobs and tracks applications." },
  employer: { label: "Employer", help: "Posts jobs and reviews applicants for their company." },
  staff: { label: "AIA staff", help: "Reviews postings, confirms payments and manages companies and membership." },
  admin: { label: "Super admin", help: "Everything staff can do, plus site content, careers, and users and roles." },
};
const ROLES: Role[] = ["candidate", "employer", "staff", "admin"];
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-CA") : "Never");

export default function Users() {
  const { session } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [message, setMessage] = useState<{ text: string; link?: string; tone: "ok" | "error" } | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const load = async (term = search) => {
    const { data, error } = await supabase.rpc("admin_list_users", { search: term.trim() });
    if (error) { setMessage({ text: error.message, tone: "error" }); setUsers([]); return; }
    setUsers((data as UserRow[]) ?? []);
  };
  useEffect(() => {
    load("");
    supabase.from("companies").select("id, name, is_member").order("name").then(({ data }) => setCompanies((data as Company[]) ?? []));
  }, []);
  useEffect(() => { const t = setTimeout(() => load(search), 300); return () => clearTimeout(t); }, [search]);

  const done = (r: { error?: string; link?: string }, ok: string) => {
    setMessage(r.error ? { text: r.error, tone: "error" } : { text: ok, link: r.link, tone: "ok" });
    load();
  };

  const setRole = async (u: UserRow, role: Role) => {
    if (role === "admin" && !confirm(`Make ${u.email} a super admin? They’ll be able to change site content and other people’s roles.`)) return;
    done(await adminUsers({ action: "update", user_id: u.id, role }), `${u.email} is now ${ROLE_INFO[role].label.toLowerCase()}.`);
  };
  const linkCompany = async (u: UserRow, companyId: string, link: boolean) => {
    if (!companyId) return;
    const { error } = await supabase.rpc("admin_link_company", { target: u.id, company: companyId, link });
    done({ error: error?.message }, link ? `${u.email} can now manage that company’s postings.` : `${u.email} was removed from that company.`);
  };
  const resetLink = async (u: UserRow) =>
    done(await adminUsers({ action: "reset_link", user_id: u.id }), `Password reset link for ${u.email}. Send it to them; it works once.`);
  const remove = async (u: UserRow) => {
    if (!confirm(`Delete ${u.email}? Their account and job applications are removed. Companies and job postings they created stay. This can’t be undone.`)) return;
    done(await adminUsers({ action: "delete", user_id: u.id }), `${u.email} was deleted.`);
  };

  const shown = (users ?? []).filter((u) => !roleFilter || u.role === roleFilter);

  return (
    <>
      <PageHero compact tag="Super admin" title="Users and roles"
        body="Add staff, set what each person can do, connect employers to their company, and remove accounts."
        actions={<button className={heroPrimary} onClick={() => { setAdding(true); setMessage(null); }}>Add a person</button>} />
      <div className="mx-auto max-w-6xl px-4 py-10">
        {adding && <AddPerson companies={companies} onClose={() => setAdding(false)} onDone={(r, email) => { setAdding(false); done(r, r.link ? `${email} was added. Send them this link to set their password; it works once.` : `${email} was added and emailed an invite.`); }} />}

        {message && (
          <div className={`panel mb-6 border-l-4 p-4 text-sm ${message.tone === "error" ? "border-l-signal" : "border-l-emerald-600"}`} role="status">
            <p>{message.text}</p>
            {message.link && <CopyLink link={message.link} />}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <div>
            <label htmlFor="u-search" className="sr-only">Search users</label>
            <input id="u-search" className="field" placeholder="Search by name, email or company" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select aria-label="Role" className="field" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | "")}>
            <option value="">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_INFO[r].label}</option>)}
          </select>
        </div>

        <details className="panel mt-4 p-4 text-sm">
          <summary className="cursor-pointer font-semibold text-navy">What each role can do</summary>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {ROLES.map((r) => <div key={r}><dt className="font-medium">{ROLE_INFO[r].label}</dt><dd className="text-steel">{ROLE_INFO[r].help}</dd></div>)}
          </dl>
        </details>

        {users === null ? <p className="mt-8 text-steel">Loading…</p> : (
          <>
            <p className="mt-6 text-sm text-steel">{shown.length} {shown.length === 1 ? "person" : "people"}</p>
            <ul className="mt-3 space-y-3">
              {shown.map((u) => {
                const isMe = u.id === session?.user.id;
                return (
                  <li key={u.id} className="panel p-4 sm:p-5">
                    <div className="grid gap-4 lg:grid-cols-[1fr_220px_260px] lg:items-start">
                      <div className="min-w-0">
                        <p className="font-semibold">{u.full_name || "No name"}{isMe && <span className="ml-2 text-xs font-normal text-steel">(you)</span>}</p>
                        <p className="truncate text-sm text-steel">{u.email}</p>
                        <p className="mt-1 text-xs text-steel">Joined {fmt(u.created_at)} – last signed in {fmt(u.last_sign_in_at)}</p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                          <button className="font-medium text-navy hover:underline" onClick={() => setEditing(editing === u.id ? null : u.id)}>
                            {editing === u.id ? "Close" : "Edit details"}
                          </button>
                          <button className="font-medium text-navy hover:underline" onClick={() => resetLink(u)}>Password reset link</button>
                          {!isMe && <button className="font-medium text-steel hover:text-signal" onClick={() => remove(u)}>Delete</button>}
                        </div>
                      </div>
                      <div>
                        <label className="label text-xs text-steel" htmlFor={`r-${u.id}`}>Role</label>
                        <select id={`r-${u.id}`} className="field" value={u.role} disabled={isMe} onChange={(e) => setRole(u, e.target.value as Role)}>
                          {ROLES.map((r) => <option key={r} value={r}>{ROLE_INFO[r].label}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="label text-xs text-steel">Company</p>
                        {u.company_names.length > 0 && (
                          <ul className="mb-2 flex flex-wrap gap-1.5">
                            {u.company_names.map((n, i) => (
                              <li key={u.company_ids[i]} className="flex items-center gap-1 rounded bg-navy-soft py-0.5 pl-2 pr-1 text-sm text-navy">
                                {n}
                                <button className="flex h-6 w-6 items-center justify-center rounded hover:bg-white" aria-label={`Remove from ${n}`}
                                  onClick={() => linkCompany(u, u.company_ids[i], false)}>×</button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <select aria-label="Add to a company" className="field" value="" onChange={(e) => linkCompany(u, e.target.value, true)}>
                          <option value="">{u.company_names.length ? "Add another company…" : "Connect to a company…"}</option>
                          {companies.filter((c) => !u.company_ids.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    {editing === u.id && <EditPerson user={u} onDone={(r) => { if (!r.error) setEditing(null); done(r, `${u.email}’s details were updated.`); }} />}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

function AddPerson({ companies, onClose, onDone }: {
  companies: Company[]; onClose: () => void; onDone: (r: { error?: string; link?: string }, email: string) => void;
}) {
  const [role, setRole] = useState<Role>("staff");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    setBusy(true); setError("");
    const r = await adminUsers({ action: "invite", email, full_name: String(f.get("full_name")), role,
      company_id: role === "employer" ? String(f.get("company_id") || "") || undefined : undefined, send_email: f.get("send_email") === "on" });
    setBusy(false);
    if (r.error) { setError(r.error); return; }
    onDone(r, email);
  };
  return (
    <form onSubmit={submit} className="panel mb-6 space-y-4 border-l-4 border-l-navy p-4 sm:p-6">
      <h2 className="text-2xl">Add a person</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="a-name">Full name</label><input id="a-name" name="full_name" required className="field" /></div>
        <div><label className="label" htmlFor="a-email">Email</label><input id="a-email" name="email" type="email" required className="field" /></div>
        <div>
          <label className="label" htmlFor="a-role">Role</label>
          <select id="a-role" className="field" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_INFO[r].label}</option>)}
          </select>
          <p className="hint">{ROLE_INFO[role].help}</p>
        </div>
        {role === "employer" && (
          <div>
            <label className="label" htmlFor="a-company">Company</label>
            <select id="a-company" name="company_id" className="field" defaultValue="">
              <option value="">None yet</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="send_email" className="mt-1" />
        <span>Email the invite from the site. Leave this unticked to get a link you can send yourself (needed until email sending is set up in Supabase).</span>
      </label>
      {error && <p className="text-sm text-signal" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" disabled={busy}>{busy ? "Adding…" : "Add person"}</button>
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

function EditPerson({ user, onDone }: { user: UserRow; onDone: (r: { error?: string }) => void }) {
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim();
    setBusy(true);
    const r = await adminUsers({ action: "update", user_id: user.id, full_name: String(f.get("full_name")), email: email !== user.email ? email : undefined });
    setBusy(false);
    onDone(r);
  };
  return (
    <form onSubmit={submit} className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div><label className="label" htmlFor={`e-n-${user.id}`}>Full name</label><input id={`e-n-${user.id}`} name="full_name" defaultValue={user.full_name ?? ""} className="field" /></div>
      <div><label className="label" htmlFor={`e-e-${user.id}`}>Email</label><input id={`e-e-${user.id}`} name="email" type="email" required defaultValue={user.email} className="field" /></div>
      <button className="btn-navy" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
    </form>
  );
}

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      <input readOnly value={link} className="field font-mono text-xs" onFocus={(e) => e.currentTarget.select()} aria-label="Link" />
      <button className="btn-navy shrink-0" onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); }}>
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
