import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Company, Role } from "../lib/types";
import PageHero from "../components/PageHero";

interface UserRow {
  id: string; email: string; full_name: string | null; role: Role; created_at: string;
  last_sign_in_at: string | null; company_ids: string[]; company_names: string[];
}

export const ROLE_INFO: Record<Role, { label: string; help: string }> = {
  candidate: { label: "Job seeker", help: "Applies to jobs and tracks applications." },
  employer: { label: "Employer", help: "Posts jobs and reviews applicants for their company." },
  staff: { label: "AIA staff", help: "Reviews postings, confirms payments and manages companies." },
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
  const [message, setMessage] = useState("");

  const load = async (term = search) => {
    const { data, error } = await supabase.rpc("admin_list_users", { search: term.trim() });
    if (error) { setMessage(error.message); setUsers([]); return; }
    setUsers((data as UserRow[]) ?? []);
  };
  useEffect(() => {
    load("");
    supabase.from("companies").select("id, name, is_member").order("name").then(({ data }) => setCompanies((data as Company[]) ?? []));
  }, []);
  useEffect(() => { const t = setTimeout(() => load(search), 300); return () => clearTimeout(t); }, [search]);

  const setRole = async (u: UserRow, role: Role) => {
    if (role === "admin" && !confirm(`Make ${u.email} a super admin? They’ll be able to change site content and other people’s roles.`)) return;
    const { error } = await supabase.rpc("admin_set_role", { target: u.id, new_role: role });
    setMessage(error ? error.message : `${u.email} is now ${ROLE_INFO[role].label.toLowerCase()}.`);
    load();
  };
  const linkCompany = async (u: UserRow, companyId: string, link: boolean) => {
    if (!companyId) return;
    const { error } = await supabase.rpc("admin_link_company", { target: u.id, company: companyId, link });
    setMessage(error ? error.message : link ? `${u.email} can now manage that company’s postings.` : `${u.email} was removed from that company.`);
    load();
  };

  const shown = (users ?? []).filter((u) => !roleFilter || u.role === roleFilter);

  return (
    <>
      <PageHero compact tag="Super admin" title="Users and roles"
        body="Find anyone who has signed up, set what they can do, and connect employers to their company." />
      <div className="mx-auto max-w-6xl px-4 py-10">
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
          <p className="mt-3 text-steel">New staff sign up on the site like anyone else, then you set their role here.</p>
        </details>

        {message && <p className="panel mt-4 p-4 text-sm" role="status">{message}</p>}

        {users === null ? <p className="mt-8 text-steel">Loading…</p> : (
          <>
            <p className="mt-6 text-sm text-steel">{shown.length} {shown.length === 1 ? "person" : "people"}</p>
            <ul className="mt-3 space-y-3">
              {shown.map((u) => (
                <li key={u.id} className="panel grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_220px_260px] lg:items-start">
                  <div className="min-w-0">
                    <p className="font-semibold">{u.full_name || "No name"}{u.id === session?.user.id && <span className="ml-2 text-xs font-normal text-steel">(you)</span>}</p>
                    <p className="truncate text-sm text-steel">{u.email}</p>
                    <p className="mt-1 text-xs text-steel">Joined {fmt(u.created_at)} – last signed in {fmt(u.last_sign_in_at)}</p>
                  </div>
                  <div>
                    <label className="label text-xs text-steel" htmlFor={`r-${u.id}`}>Role</label>
                    <select id={`r-${u.id}`} className="field" value={u.role} disabled={u.id === session?.user.id}
                      onChange={(e) => setRole(u, e.target.value as Role)}>
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
                    <select aria-label="Add to a company" className="field" value=""
                      onChange={(e) => linkCompany(u, e.target.value, true)}>
                      <option value="">{u.company_names.length ? "Add another company…" : "Connect to a company…"}</option>
                      {companies.filter((c) => !u.company_ids.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
