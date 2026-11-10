import { useEffect, useState } from "react";
import { Link } from "../components/L";
import { supabase } from "../lib/supabase";
import type { Company, Job } from "../lib/types";
import { SECTORS, formatPay } from "../lib/constants";
import StatusBadge from "../components/StatusBadge";
import { checkMembership } from "../lib/membership";
import PageHero from "../components/PageHero";

type Tab = "review" | "payment" | "companies";

export default function Admin() {
  const [tab, setTab] = useState<Tab>("review");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filter, setFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState<"" | "member" | "lapsed" | "non">("");
  const [lastSync, setLastSync] = useState<{ ran_at: string; trigger: string; summary: Record<string, unknown> } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const load = async () => {
    const { data } = await supabase.from("jobs").select("*, companies(name, is_member)")
      .in("status", ["pending_review", "pending_payment"]).order("submitted_at", { ascending: true });
    setJobs((data as Job[]) ?? []);
    const c = await supabase.from("companies").select("*").order("name");
    const s = await supabase.from("membership_sync_runs").select("ran_at, trigger, summary").order("ran_at", { ascending: false }).limit(1).maybeSingle();
    setLastSync(s.data as typeof lastSync);
    setCompanies((c.data as Company[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const act = async (fn: string, args: Record<string, unknown>) => {
    const { error } = await supabase.rpc(fn, args);
    if (error) alert(error.message);
    load();
  };

  const reject = (job: Job) => {
    const reason = prompt(`What does the employer need to change in “${job.title}”?`);
    if (reason) act("admin_reject_job", { job: job.id, reason });
  };

  const toggleFeatured = async (job: Job) => {
    const { error } = await supabase.from("jobs").update({ is_featured: !job.is_featured }).eq("id", job.id);
    if (error) alert(error.message);
    load();
  };

  const [checking, setChecking] = useState("");
  const checkInsightly = async (co: Company) => {
    setChecking(co.id);
    const r = await checkMembership(co.id);
    setChecking("");
    if (r.status === "not_configured") alert("The Insightly connection isn’t set up yet. Add the Insightly settings in Supabase first.");
    load();
  };

  const syncAll = async () => {
    setSyncing(true); setSyncMsg("");
    const { data, error } = await supabase.functions.invoke("sync-memberships", { body: {} });
    setSyncing(false);
    if (error || !data) { setSyncMsg("The sync didn’t run. Try again."); return; }
    if (data.status === "not_configured") { setSyncMsg("The Insightly connection isn’t set up yet."); return; }
    setSyncMsg(`Checked ${data.checked}: ${data.members} current members, ${data.revoked} lapsed (free posting removed), ${data.restored} renewed (free posting restored), ${data.not_found} not found in Insightly.`);
    load();
  };

  const linkInsightly = async (co: Company) => {
    const id = prompt(`Insightly organisation ID for “${co.name}” (the number in the Insightly web address for the organisation). Leave empty to unlink.`, co.insightly_org_id ?? "");
    if (id === null) return;
    setChecking(co.id);
    await supabase.functions.invoke("check-membership", { body: { company_id: co.id, insightly_org_id: id.trim() || null } });
    setChecking("");
    load();
  };

  const toggleMember = async (c: Company) => {
    await supabase.from("companies").update({
      is_member: !c.is_member, member_verified_at: !c.is_member ? new Date().toISOString() : null,
      membership_source: "manual", membership_note: !c.is_member ? "Marked as member by AIA staff" : "Membership removed by AIA staff",
    }).eq("id", c.id);
    load();
  };

  const review = jobs.filter((j) => j.status === "pending_review");
  const payment = jobs.filter((j) => j.status === "pending_payment");
  const shown = tab === "review" ? review : payment;

  return (
    <>
    <PageHero compact tag="AIA staff" title="Review queue" body="Approve postings, confirm payments and manage member companies." />
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4" role="tablist">
        {([["review", `To review (${review.length})`], ["payment", `Awaiting payment (${payment.length})`], ["companies", "Companies"]] as const).map(([t, l]) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${tab === t ? "border-signal text-navy" : "border-transparent text-steel hover:text-navy"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab !== "companies" ? (
        <div className="mt-6 space-y-3">
          {shown.length === 0 && <p className="panel px-5 py-8 text-steel">Nothing waiting here.</p>}
          {shown.map((j) => (
            <div key={j.id} className="panel grid gap-4 p-5 md:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={j.status} />
                  <span className="text-xs text-steel">{j.companies?.is_member ? "Member" : "Non-member"}</span>
                  {j.is_featured && <span className="rounded border border-signal/30 bg-red-50 px-2 py-0.5 text-xs font-medium text-signal-dark">Featured{j.companies?.is_member ? "" : " (paid add-on)"}</span>}
                </div>
                <Link to={`/jobs/${j.id}`} className="mt-1 block text-lg font-semibold text-navy hover:underline">{j.title}</Link>
                <p className="text-sm text-steel">
                  {j.companies?.name} – {j.city}, {j.province} – {SECTORS[j.sector].label} – {formatPay(j.pay_min, j.pay_max, j.pay_period)}
                </p>
                <p className="mt-2 line-clamp-3 max-w-prose text-sm">{j.description}</p>
              </div>
              <div className="flex flex-wrap items-start gap-2 md:justify-end">
                {j.status === "pending_payment" ? (
                  <button className="btn-navy px-3 py-1.5" onClick={() => act("admin_mark_paid", { job: j.id })}>Mark paid</button>
                ) : (
                  <button className="btn-primary px-3 py-1.5" onClick={() => act("admin_publish_job", { job: j.id })}>Publish</button>
                )}
                <button className="btn-ghost px-3 py-1.5" onClick={() => toggleFeatured(j)}>{j.is_featured ? "Remove featured" : "Make featured"}</button>
                <button className="btn-ghost px-3 py-1.5" onClick={() => reject(j)}>Send back</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <div className="panel mb-5 flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Membership sync with Insightly</p>
              <p className="text-steel">
                Runs every night: lapsed members lose free posting and renewals get it back.
                {lastSync ? ` Last run ${new Date(lastSync.ran_at).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}${lastSync.trigger === "nightly" ? " (nightly)" : ""}.` : " It hasn’t run yet."}
              </p>
              {syncMsg && <p className="mt-1 text-navy" role="status">{syncMsg}</p>}
            </div>
            <button className="btn-ghost shrink-0" onClick={syncAll} disabled={syncing}>{syncing ? "Syncing…" : "Sync now"}</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <input className="field" placeholder="Search companies" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <select aria-label="Membership" className="field" value={memberFilter} onChange={(e) => setMemberFilter(e.target.value as typeof memberFilter)}>
              <option value="">All companies</option>
              <option value="member">Members</option>
              <option value="lapsed">Lapsed members</option>
              <option value="non">Non-members</option>
            </select>
          </div>
          <ul className="mt-4 overflow-hidden rounded-md border border-line bg-white">
            {companies.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()))
              .filter((c) => !memberFilter || (memberFilter === "member" ? c.is_member : memberFilter === "lapsed" ? !c.is_member && !!c.membership_lapsed_at : !c.is_member))
              .map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0 sm:px-5">
                <div className="min-w-0">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-steel">{[c.city, c.province].filter(Boolean).join(", ") || "No location"}</p>
                  {c.is_member && (
                    <p className="text-xs text-emerald-700">
                      Member{c.membership_source === "insightly" ? ", verified in Insightly" : ", set by staff"}
                      {c.member_verified_at ? ` on ${new Date(c.member_verified_at).toLocaleDateString("en-CA")}` : ""}
                    </p>
                  )}
                  {!c.is_member && c.membership_lapsed_at && (
                    <p className="mt-0.5 inline-block rounded bg-amber-50 px-1.5 text-xs font-medium text-amber-800">
                      Lapsed {new Date(c.membership_lapsed_at).toLocaleDateString("en-CA")}
                    </p>
                  )}
                  {c.membership_note && <p className="text-xs text-steel">{c.membership_note}</p>}
                  <p className="text-xs text-steel">
                    {c.insightly_org_id ? `Insightly ID ${c.insightly_org_id}` : "Not linked to Insightly"}{" "}
                    <button className="font-medium text-navy hover:underline" onClick={() => linkInsightly(c)}>{c.insightly_org_id ? "Change" : "Link"}</button>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => checkInsightly(c)} disabled={checking === c.id} className="btn-ghost px-3 py-1.5">
                    {checking === c.id ? "Checking…" : "Check Insightly"}
                  </button>
                  <button onClick={() => toggleMember(c)} className={c.is_member ? "btn-navy px-3 py-1.5" : "btn-ghost px-3 py-1.5"}>
                    {c.is_member ? "Member" : "Mark as member"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
    </>
  );
}
