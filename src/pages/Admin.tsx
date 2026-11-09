import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Company, Job } from "../lib/types";
import { SECTORS, formatPay } from "../lib/constants";
import StatusBadge from "../components/StatusBadge";

type Tab = "review" | "payment" | "companies";

export default function Admin() {
  const [tab, setTab] = useState<Tab>("review");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filter, setFilter] = useState("");

  const load = async () => {
    const { data } = await supabase.from("jobs").select("*, companies(name, is_member)")
      .in("status", ["pending_review", "pending_payment"]).order("submitted_at", { ascending: true });
    setJobs((data as Job[]) ?? []);
    const c = await supabase.from("companies").select("*").order("name");
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

  const toggleMember = async (c: Company) => {
    await supabase.from("companies").update({
      is_member: !c.is_member, member_verified_at: !c.is_member ? new Date().toISOString() : null,
    }).eq("id", c.id);
    load();
  };

  const review = jobs.filter((j) => j.status === "pending_review");
  const payment = jobs.filter((j) => j.status === "pending_payment");
  const shown = tab === "review" ? review : payment;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl">Review queue</h1>
      <div className="mt-6 flex gap-1 border-b border-line" role="tablist">
        {([["review", `To review (${review.length})`], ["payment", `Awaiting payment (${payment.length})`], ["companies", "Companies"]] as const).map(([t, l]) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${tab === t ? "border-signal text-navy" : "border-transparent text-steel hover:text-navy"}`}>
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
                <button className="btn-ghost px-3 py-1.5" onClick={() => reject(j)}>Send back</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <input className="field max-w-sm" placeholder="Search companies" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <ul className="mt-4 overflow-hidden rounded-md border border-line bg-white">
            {companies.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase())).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 last:border-b-0">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-steel">{[c.city, c.province].filter(Boolean).join(", ") || "No location"}</p>
                </div>
                <button onClick={() => toggleMember(c)} className={c.is_member ? "btn-navy px-3 py-1.5" : "btn-ghost px-3 py-1.5"}>
                  {c.is_member ? "Member" : "Mark as member"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
