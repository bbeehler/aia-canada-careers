import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Job } from "../lib/types";
import { EMPLOYMENT_TYPES, SECTORS, formatPay, timeAgo } from "../lib/constants";
import StatusBadge from "../components/StatusBadge";
import PageHero from "../components/PageHero";

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState<Job | null | undefined>(undefined);

  useEffect(() => {
    supabase.from("jobs").select("*, companies(name, is_member)").eq("id", id).maybeSingle()
      .then(({ data }) => setJob((data as Job) ?? null));
  }, [id]);

  if (job === undefined) return <p className="mx-auto max-w-6xl px-4 py-12 text-steel">Loading…</p>;
  if (job === null) {
    return (
      <PageHero compact title="This job isn’t available" body="It may have been filled or expired."
        actions={<Link to="/jobs" className="btn bg-white px-6 py-3 text-navy hover:bg-navy-soft">Browse open jobs</Link>} />
    );
  }

  return (
    <>
    <PageHero
      compact
      tag={SECTORS[job.sector].label}
      title={job.title}
      body={<>
        {job.companies?.name} – {job.city}, {job.province}{job.remote_ok ? " (some remote)" : ""}
        {job.status !== "published" && <span className="ml-3 align-middle"><StatusBadge status={job.status} /></span>}
      </>}
    >
      <Link to="/jobs" className="mt-5 self-start text-sm text-white/70 hover:text-white">← Back to jobs</Link>
    </PageHero>
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1fr_340px]">
      <article>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3">
          <div className="bg-white px-4 py-3">
            <dt className="text-xs text-steel">Pay</dt>
            <dd className="font-display text-xl font-semibold text-navy">{formatPay(job.pay_min, job.pay_max, job.pay_period)}</dd>
          </div>
          <div className="bg-white px-4 py-3">
            <dt className="text-xs text-steel">Job type</dt>
            <dd className="font-medium">{EMPLOYMENT_TYPES[job.employment_type]}</dd>
          </div>
          <div className="col-span-2 bg-white px-4 py-3 sm:col-span-1">
            <dt className="text-xs text-steel">Posted</dt>
            <dd className="font-medium">{timeAgo(job.published_at) || "Not yet published"}</dd>
          </div>
        </dl>

        <h2 className="mt-10 text-2xl">About the job</h2>
        <p className="mt-3 max-w-prose whitespace-pre-line leading-relaxed">{job.description}</p>

        {job.requirements && (
          <>
            <h2 className="mt-8 text-2xl">What you’ll need</h2>
            <p className="mt-3 max-w-prose whitespace-pre-line leading-relaxed">{job.requirements}</p>
          </>
        )}

        <div className="mt-8 max-w-prose space-y-1 border-t border-line pt-4 text-sm text-steel">
          <p>{job.is_existing_vacancy ? "This posting is for a current vacancy." : "This posting is for a future or anticipated vacancy, not a current opening."}</p>
          <p>{job.uses_ai_screening ? "This employer uses AI to screen, assess or select applicants." : "This employer does not use AI to screen applicants."}</p>
        </div>
      </article>

      <aside className="space-y-5 lg:sticky lg:top-32 lg:self-start">
        <div id="apply" className="scroll-mt-32"><ApplyBox job={job} /></div>
        {job.icar_training && (
          <div className="panel border-l-4 border-l-signal p-5">
            <p className="font-display text-xl font-bold text-navy">Training this employer values</p>
            <p className="mt-2 text-sm">{job.icar_training}</p>
            <a href="https://www.i-car.ca" className="mt-3 inline-block text-sm font-semibold text-navy hover:underline">
              Find I-CAR courses in Canada
            </a>
          </div>
        )}
      </aside>
    </div>
    {job.status === "published" && (
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        {job.apply_method === "external" && job.apply_url ? (
          <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">Apply on employer’s site</a>
        ) : (
          <a href="#apply" className="btn-primary w-full">Apply for this job</a>
        )}
      </div>
    )}
    {job.status === "published" && <div className="h-20 lg:hidden" aria-hidden />}
    </>
  );
}

function ApplyBox({ job }: { job: Job }) {
  const { session, profile } = useAuth();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (job.status !== "published") return null;

  if (job.apply_method === "external" && job.apply_url) {
    return (
      <div className="panel p-5">
        <p className="font-display text-xl font-bold text-navy">Apply for this job</p>
        <p className="mt-1 text-sm text-steel">This employer takes applications on their own website.</p>
        <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4 w-full">
          Apply on employer’s site
        </a>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="panel p-5">
        <p className="font-display text-xl font-bold text-navy">Apply for this job</p>
        <p className="mt-1 text-sm text-steel">Create a free account to apply and keep track of your applications.</p>
        <Link to={`/sign-in?mode=sign-up&next=/jobs/${job.id}`} className="btn-primary mt-4 w-full">Create account to apply</Link>
        <Link to={`/sign-in?next=/jobs/${job.id}`} className="btn-ghost mt-2 w-full">I already have an account</Link>
      </div>
    );
  }

  if (profile?.role !== "candidate") {
    return <div className="panel p-5 text-sm text-steel">Applications are submitted from job seeker accounts.</div>;
  }

  if (sent) {
    return (
      <div className="panel p-5">
        <p className="font-display text-xl font-bold text-navy">Application sent</p>
        <p className="mt-1 text-sm text-steel">The employer will contact you directly if they’d like to move forward.</p>
        <Link to="/applications" className="btn-ghost mt-4 w-full">See my applications</Link>
      </div>
    );
  }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(""); setBusy(true);
    const form = new FormData(e.currentTarget);
    const file = form.get("resume") as File | null;
    let resume_path: string | null = null;

    if (file && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) { setError("Resumes must be 5 MB or smaller."); setBusy(false); return; }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      resume_path = `${session.user.id}/${job.id}/${Date.now()}-${safe}`;
      const up = await supabase.storage.from("resumes").upload(resume_path, file);
      if (up.error) { setError("Your resume didn’t upload. Use a PDF or Word file and try again."); setBusy(false); return; }
    }

    const { error: err } = await supabase.from("applications").insert({
      job_id: job.id,
      full_name: String(form.get("full_name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? "") || null,
      message: String(form.get("message") ?? "") || null,
      resume_path,
    });
    setBusy(false);
    if (err) {
      setError(err.code === "23505" ? "You’ve already applied to this job." : "Your application didn’t send. Check the form and try again.");
      return;
    }
    setSent(true);
  };

  return (
    <form onSubmit={submit} className="panel space-y-4 p-5">
      <p className="font-display text-xl font-bold text-navy">Apply for this job</p>
      <div>
        <label className="label" htmlFor="full_name">Full name</label>
        <input id="full_name" name="full_name" required className="field" defaultValue={profile.full_name ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="field" defaultValue={session.user.email ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="phone">Phone (optional)</label>
        <input id="phone" name="phone" type="tel" className="field" />
      </div>
      <div>
        <label className="label" htmlFor="resume">Resume</label>
        <input id="resume" name="resume" type="file" accept=".pdf,.doc,.docx" className="block w-full text-sm" />
        <p className="hint">PDF or Word, up to 5 MB.</p>
      </div>
      <div>
        <label className="label" htmlFor="message">Message to the employer (optional)</label>
        <textarea id="message" name="message" rows={4} className="field" />
      </div>
      {error && <p className="text-sm text-signal" role="alert">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Sending…" : "Send application"}</button>
    </form>
  );
}
