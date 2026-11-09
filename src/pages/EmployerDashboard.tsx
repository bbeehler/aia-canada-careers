import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useCompany } from "../lib/useCompany";
import type { Job } from "../lib/types";
import { PROVINCES, formatPay } from "../lib/constants";
import StatusBadge from "../components/StatusBadge";

const PAYMENT_URL = import.meta.env.VITE_NONMEMBER_PAYMENT_URL as string | undefined;

type JobWithCount = Job & { applications: { count: number }[] };

export default function EmployerDashboard() {
  const { company, reload } = useCompany();
  const [jobs, setJobs] = useState<JobWithCount[]>([]);
  const [message, setMessage] = useState("");

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
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">{company.name}</h1>
          <p className="mt-1 text-sm text-steel">
            {company.is_member ? "AIA Canada member: your postings are free." : "Not yet verified as an AIA Canada member. Postings are paid per posting."}
          </p>
        </div>
        <Link to="/employer/jobs/new" className="btn-primary">Post a job</Link>
      </div>

      {!company.is_member && (
        <p className="panel mt-6 border-l-4 border-l-navy p-4 text-sm">
          Is your company an AIA Canada member? Email AIA Canada with your company name and we’ll switch your account to free posting.
        </p>
      )}
      {message && <p className="panel mt-6 p-4 text-sm" role="status">{message}</p>}

      <div className="mt-8">
        {jobs.length === 0 ? (
          <div className="panel px-5 py-10">
            <p className="font-medium">You haven’t posted any jobs yet.</p>
            <Link to="/employer/jobs/new" className="btn-navy mt-4">Write your first posting</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse overflow-hidden rounded-md border border-line bg-white text-sm">
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
                    <td className="px-4 py-3"><StatusBadge status={j.status} /></td>
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
                        {j.status === "pending_payment" && PAYMENT_URL && (
                          <a href={PAYMENT_URL} target="_blank" rel="noopener noreferrer" className="btn-primary px-3 py-1.5">Pay for posting</a>
                        )}
                        {j.status === "draft" && <button onClick={() => remove(j)} className="px-2 text-steel hover:text-signal">Delete</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CompanySetup({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true); setError("");
    const f = new FormData(e.currentTarget);
    const { error: err } = await supabase.from("companies").insert({
      name: String(f.get("name")),
      website: String(f.get("website") ?? "") || null,
      city: String(f.get("city") ?? "") || null,
      province: String(f.get("province") ?? "") || null,
    });
    setBusy(false);
    if (err) { setError("Your company didn’t save. Check the name and try again."); return; }
    onDone();
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <h1 className="text-4xl">Add your company</h1>
      <p className="mt-2 text-steel">This is the employer name job seekers will see on your postings.</p>
      <form onSubmit={save} className="panel mt-6 space-y-4 p-6">
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
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Saving…" : "Save company"}</button>
      </form>
    </div>
  );
}
