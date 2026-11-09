import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useCompany } from "../lib/useCompany";
import type { Job } from "../lib/types";
import { PROVINCES, formatPay } from "../lib/constants";
import StatusBadge from "../components/StatusBadge";
import { checkMembership, MEMBERSHIP_MESSAGES } from "../lib/membership";
import PageHero from "../components/PageHero";

const PAYMENT_URL = import.meta.env.VITE_NONMEMBER_PAYMENT_URL as string | undefined;
const FEATURED_PAYMENT_URL = import.meta.env.VITE_NONMEMBER_FEATURED_PAYMENT_URL as string | undefined;

type JobWithCount = Job & { applications: { count: number }[] };

export default function EmployerDashboard() {
  const { company, reload } = useCompany();
  const [jobs, setJobs] = useState<JobWithCount[]>([]);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState(() => {
    const r = sessionStorage.getItem("membership-result");
    sessionStorage.removeItem("membership-result");
    return r ? MEMBERSHIP_MESSAGES[r as keyof typeof MEMBERSHIP_MESSAGES] ?? "" : "";
  });
  const [rechecking, setRechecking] = useState(false);
  const recheck = async () => {
    if (!company) return;
    setRechecking(true);
    const r = await checkMembership(company.id);
    setRechecking(false);
    setNotice(MEMBERSHIP_MESSAGES[r.status]);
    if (r.status === "member") reload();
  };

  const loadJobs = async (companyId: string) => {
    const { data } = await supabase.from("jobs").select("*, applications(count)")
      .eq("company_id", companyId).order("created_at", { ascending: false });
    setJobs((data as JobWithCount[]) ?? []);
  };

  useEffect(() => { if (company) loadJobs(company.id); }, [company]);

  if (company === undefined) return <p className="mx-auto max-w-6xl px-4 py-12 text-steel">Loading…</p>;
  if (company === null) return <CompanySetup onDone={reload} />;

  const submit = async (job: Job) => {
    setMessage("");
    const { data, error } = await supabase.rpc("submit_job", { job: job.id });
    if (error) { setMessage(error.message); return; }
    setMessage(data === "pending_payment"
      ? `“${job.title}” is saved. Complete payment and AIA Canada will review it.`
      : `“${job.title}” is with AIA Canada for review. It usually goes live within one business day.`);
    loadJobs(company.id);
  };

  const remove = async (job: Job) => {
    if (!confirm(`Delete the draft “${job.title}”?`)) return;
    await supabase.from("jobs").delete().eq("id", job.id);
    loadJobs(company.id);
  };

  return (
    <>
    <PageHero compact tag="My postings" title={company.name}
      body={company.is_member ? "AIA Canada member: your postings are free." : "Not yet verified as an AIA Canada member. Postings are paid per posting."}
      actions={<Link to="/employer/jobs/new" className="btn bg-white px-6 py-3 text-navy hover:bg-navy-soft">Post a job</Link>} />
    <div className="mx-auto max-w-6xl px-4 py-10">

      {notice && <p className="panel mb-6 border-l-4 border-l-emerald-600 p-4 text-sm" role="status">{notice}</p>}
      {!company.is_member && (
        <div className="panel mb-6 flex flex-col gap-3 border-l-4 border-l-navy p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>Is your company an AIA Canada member? Members post free. We check AIA Canada’s member records using your work email.</p>
          <button className="btn-ghost shrink-0" disabled={rechecking} onClick={recheck}>{rechecking ? "Checking…" : "Check my membership"}</button>
        </div>
      )}
      {message && <p className="panel mt-6 p-4 text-sm" role="status">{message}</p>}

      <div className="mt-8">
        {jobs.length === 0 ? (
          <div className="panel px-5 py-10">
            <p className="font-medium">You haven’t posted any jobs yet.</p>
            <Link to="/employer/jobs/new" className="btn-navy mt-4">Write your first posting</Link>
          </div>
        ) : (
          <>
          <ul className="space-y-3 md:hidden">
            {jobs.map((j) => (
              <li key={j.id} className="panel p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={j.status} />
                  {j.is_featured && <span className="inline-block rounded border border-signal/30 bg-red-50 px-2 py-0.5 text-xs font-medium text-signal-dark">Featured</span>}
                </div>
                <Link to={`/jobs/${j.id}`} className="mt-2 block font-semibold text-navy hover:underline">{j.title}</Link>
                <p className="text-sm text-steel">{j.city}, {j.province} – {formatPay(j.pay_min, j.pay_max, j.pay_period)}</p>
                {j.status === "rejected" && j.rejection_reason && <p className="mt-1 text-sm text-signal-dark">AIA Canada: {j.rejection_reason}</p>}
                <p className="mt-2 text-sm text-steel">
                  {j.apply_method === "external" ? "Applications on your site" : (
                    j.applications?.[0]?.count
                      ? <Link to={`/employer/jobs/${j.id}/applications`} className="font-semibold text-navy hover:underline">{j.applications[0].count} applications</Link>
                      : "No applications yet"
                  )}
                  {j.expires_at && ` – expires ${new Date(j.expires_at).toLocaleDateString("en-CA")}`}
                </p>
                {(j.status === "draft" || j.status === "rejected" || (j.status === "pending_payment" && (j.is_featured ? FEATURED_PAYMENT_URL : PAYMENT_URL))) && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(j.status === "draft" || j.status === "rejected") && (
                      <>
                        <Link to={`/employer/jobs/${j.id}/edit`} className="btn-ghost">Edit</Link>
                        <button onClick={() => submit(j)} className="btn-navy">Submit</button>
                      </>
                    )}
                    {j.status === "pending_payment" && (
                      <a href={j.is_featured ? FEATURED_PAYMENT_URL : PAYMENT_URL} target="_blank" rel="noopener noreferrer" className="btn-primary col-span-2">Pay for posting</a>
                    )}
                    {j.status === "draft" && <button onClick={() => remove(j)} className="btn col-span-2 text-steel hover:text-signal">Delete draft</button>}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse overflow-hidden rounded-md border border-line bg-white text-sm">
              <thead className="bg-paper text-left text-steel">
                <tr>
                  <th className="px-4 py-3 font-medium">Job</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Applications</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-t border-line align-top">
                    <td className="px-4 py-3">
                      <Link to={`/jobs/${j.id}`} className="font-semibold text-navy hover:underline">{j.title}</Link>
                      <p className="text-steel">{j.city}, {j.province} – {formatPay(j.pay_min, j.pay_max, j.pay_period)}</p>
                      {j.status === "rejected" && j.rejection_reason && (
                        <p className="mt-1 text-signal-dark">AIA Canada: {j.rejection_reason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={j.status} />
                      {j.is_featured && <span className="ml-1.5 inline-block rounded border border-signal/30 bg-red-50 px-2 py-0.5 text-xs font-medium text-signal-dark">Featured</span>}
                    </td>
                    <td className="px-4 py-3">
                      {j.applications?.[0]?.count ? (
                        <Link to={`/employer/jobs/${j.id}/applications`} className="font-semibold text-navy hover:underline">
                          {j.applications[0].count}
                        </Link>
                      ) : j.apply_method === "external" ? <span className="text-steel">On your site</span> : "0"}
                    </td>
                    <td className="px-4 py-3 text-steel">{j.expires_at ? new Date(j.expires_at).toLocaleDateString("en-CA") : "–"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {(j.status === "draft" || j.status === "rejected") && (
                          <>
                            <Link to={`/employer/jobs/${j.id}/edit`} className="btn-ghost px-3 py-1.5">Edit</Link>
                            <button onClick={() => submit(j)} className="btn-navy px-3 py-1.5">Submit for review</button>
                          </>
                        )}
                        {j.status === "pending_payment" && (j.is_featured ? FEATURED_PAYMENT_URL : PAYMENT_URL) && (
                          <a href={j.is_featured ? FEATURED_PAYMENT_URL : PAYMENT_URL} target="_blank" rel="noopener noreferrer" className="btn-primary px-3 py-1.5">Pay for posting</a>
                        )}
                        {j.status === "draft" && <button onClick={() => remove(j)} className="px-2 text-steel hover:text-signal">Delete</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}

function CompanySetup({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true); setError("");
    const f = new FormData(e.currentTarget);
    const { data, error: err } = await supabase.from("companies").insert({
      name: String(f.get("name")),
      website: String(f.get("website") ?? "") || null,
      city: String(f.get("city") ?? "") || null,
      province: String(f.get("province") ?? "") || null,
    }).select("id").single();
    if (err || !data) { setBusy(false); setError("Your company didn’t save. Check the name and try again."); return; }
    setChecking(true);
    const result = await checkMembership(data.id);
    sessionStorage.setItem("membership-result", result.status);
    setBusy(false);
    onDone();
  };

  return (
    <>
    <PageHero compact tag="Get started" title="Add your company" body="This is the employer name job seekers will see on your postings." />
    <div className="mx-auto max-w-lg px-4 py-12">
      <form onSubmit={save} className="panel space-y-4 p-6">
        <div>
          <label className="label" htmlFor="name">Company name</label>
          <input id="name" name="name" required minLength={2} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="website">Website (optional)</label>
          <input id="website" name="website" type="url" placeholder="https://" className="field" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="city">City</label>
            <input id="city" name="city" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="province">Province</label>
            <select id="province" name="province" className="field" defaultValue="">
              <option value="">Choose</option>
              {PROVINCES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-signal" role="alert">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{checking ? "Checking AIA Canada membership…" : busy ? "Saving…" : "Save company"}</button>
        <p className="text-xs text-steel">We’ll check AIA Canada’s member records using your work email. Members post free.</p>
      </form>
    </div>
    </>
  );
}
