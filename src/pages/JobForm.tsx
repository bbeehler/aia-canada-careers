import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useCompany } from "../lib/useCompany";
import type { EmploymentType, Job, Sector } from "../lib/types";
import { EMPLOYMENT_TYPES, PROVINCES, SECTORS } from "../lib/constants";

export default function JobForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { company } = useCompany();
  const [job, setJob] = useState<Partial<Job> | null>(id ? null : {});
  const [applyMethod, setApplyMethod] = useState<"on_site" | "external">("on_site");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitIntent = useRef(false);

  useEffect(() => {
    if (!id) return;
    supabase.from("jobs").select("*").eq("id", id).single().then(({ data }) => {
      setJob((data as Job) ?? {});
      if (data) setApplyMethod((data as Job).apply_method);
    });
  }, [id]);

  if (company === undefined || job === null) return <p className="mx-auto max-w-6xl px-4 py-12 text-steel">Loading…</p>;
  if (company === null) { navigate("/employer"); return null; }

  const save = async (e: FormEvent<HTMLFormElement>, andSubmit: boolean) => {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    const payMin = Number(f.get("pay_min"));
    const payMax = Number(f.get("pay_max") || payMin);
    if (payMax < payMin) { setError("The top of the pay range must be equal to or higher than the bottom."); return; }

    const record = {
      company_id: company.id,
      title: String(f.get("title")).trim(),
      sector: f.get("sector") as Sector,
      employment_type: f.get("employment_type") as EmploymentType,
      city: String(f.get("city")).trim(),
      province: String(f.get("province")),
      remote_ok: f.get("remote_ok") === "on",
      pay_min: payMin,
      pay_max: payMax,
      pay_period: f.get("pay_period") as "hour" | "year",
      description: String(f.get("description")).trim(),
      requirements: String(f.get("requirements") ?? "").trim() || null,
      icar_training: String(f.get("icar_training") ?? "").trim() || null,
      uses_ai_screening: f.get("uses_ai_screening") === "yes",
      is_existing_vacancy: f.get("is_existing_vacancy") === "yes",
      is_featured: f.get("is_featured") === "on",
      apply_method: applyMethod,
      apply_url: applyMethod === "external" ? String(f.get("apply_url")).trim() : null,
    };

    setBusy(true);
    const result = id
      ? await supabase.from("jobs").update(record).eq("id", id).select("id").single()
      : await supabase.from("jobs").insert(record).select("id").single();
    if (result.error || !result.data) {
      setBusy(false);
      setError(result.error?.message.includes("check")
        ? "Some details aren’t valid. The description needs at least 50 characters, and an external link must start with https://."
        : result.error?.message ?? "Your posting didn’t save. Try again.");
      return;
    }
    if (andSubmit) {
      const sub = await supabase.rpc("submit_job", { job: result.data.id });
      if (sub.error) { setBusy(false); setError(sub.error.message); return; }
    }
    navigate("/employer");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-4xl">{id ? "Edit posting" : "Post a job"}</h1>
      <p className="mt-2 text-steel">Postings run for 30 days after AIA Canada approves them.</p>

      <form className="mt-8 space-y-8" onSubmit={(e) => save(e, submitIntent.current)}>
        <fieldset className="panel space-y-4 p-6">
          <legend className="px-1 font-display text-2xl font-bold text-navy">The job</legend>
          <div>
            <label className="label" htmlFor="title">Job title</label>
            <input id="title" name="title" required minLength={3} maxLength={140} defaultValue={job.title} className="field"
              placeholder="Licensed Automotive Service Technician (310S)" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="sector">Sector</label>
              <select id="sector" name="sector" required defaultValue={job.sector ?? ""} className="field">
                <option value="" disabled>Choose a sector</option>
                {(Object.keys(SECTORS) as Sector[]).map((s) => <option key={s} value={s}>{SECTORS[s].label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="employment_type">Job type</label>
              <select id="employment_type" name="employment_type" required defaultValue={job.employment_type ?? "full_time"} className="field">
                {(Object.keys(EMPLOYMENT_TYPES) as EmploymentType[]).map((t) => <option key={t} value={t}>{EMPLOYMENT_TYPES[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="city">City</label>
              <input id="city" name="city" required defaultValue={job.city ?? company.city ?? ""} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="province">Province</label>
              <select id="province" name="province" required defaultValue={job.province ?? company.province ?? ""} className="field">
                <option value="" disabled>Choose</option>
                {PROVINCES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="remote_ok" defaultChecked={job.remote_ok} /> Some of this work can be done remotely
          </label>
        </fieldset>

        <fieldset className="panel space-y-4 p-6">
          <legend className="px-1 font-display text-2xl font-bold text-navy">Pay</legend>
          <p className="text-sm text-steel">A pay range is required on every posting. Ontario law requires it, and postings with pay get more applicants.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="pay_min">From ($)</label>
              <input id="pay_min" name="pay_min" type="number" min="1" step="0.01" required defaultValue={job.pay_min} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="pay_max">To ($)</label>
              <input id="pay_max" name="pay_max" type="number" min="1" step="0.01" defaultValue={job.pay_max} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="pay_period">Per</label>
              <select id="pay_period" name="pay_period" defaultValue={job.pay_period ?? "hour"} className="field">
                <option value="hour">Hour</option>
                <option value="year">Year</option>
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="panel space-y-4 p-6">
          <legend className="px-1 font-display text-2xl font-bold text-navy">Description</legend>
          <div>
            <label className="label" htmlFor="description">About the job</label>
            <textarea id="description" name="description" required minLength={50} rows={8} defaultValue={job.description} className="field"
              placeholder="What the day looks like, the shop or team, hours, benefits." />
          </div>
          <div>
            <label className="label" htmlFor="requirements">What candidates need (optional)</label>
            <textarea id="requirements" name="requirements" rows={4} defaultValue={job.requirements ?? ""} className="field"
              placeholder="Licences, certifications, years of experience, tools." />
            <p className="hint">Don’t require Canadian work experience. It isn’t allowed in Ontario postings.</p>
          </div>
          <div>
            <label className="label" htmlFor="icar_training">Training you value (optional)</label>
            <input id="icar_training" name="icar_training" defaultValue={job.icar_training ?? ""} className="field"
              placeholder="I-CAR Platinum in Steel Structural Technician, ADAS calibration" />
            <p className="hint">We’ll point job seekers to matching I-CAR and AIA Canada training.</p>
          </div>
        </fieldset>

        <fieldset className="panel space-y-5 p-6">
          <legend className="px-1 font-display text-2xl font-bold text-navy">Disclosures</legend>
          <YesNo name="is_existing_vacancy" label="Is this a current, open vacancy?"
            hint="Choose No if you’re collecting applications for a future opening." value={job.is_existing_vacancy ?? true} />
          <YesNo name="uses_ai_screening" label="Do you use AI to screen, assess or select applicants?"
            hint="This is shown on your posting." value={job.uses_ai_screening ?? false} />
        </fieldset>

        <fieldset className="panel space-y-4 p-6">
          <legend className="px-1 font-display text-2xl font-bold text-navy">How people apply</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {([["on_site", "Through Careers in Auto Care", "Applications and resumes arrive in your dashboard."],
               ["external", "On our own website", "We’ll send applicants to your careers page."]] as const).map(([v, t, d]) => (
              <label key={v} className={`cursor-pointer rounded border p-4 ${applyMethod === v ? "border-navy bg-navy-soft" : "border-line"}`}>
                <input type="radio" name="apply_method" value={v} checked={applyMethod === v} onChange={() => setApplyMethod(v)} className="sr-only" />
                <span className="block font-medium text-navy">{t}</span>
                <span className="mt-0.5 block text-sm text-steel">{d}</span>
              </label>
            ))}
          </div>
          {applyMethod === "external" && (
            <div>
              <label className="label" htmlFor="apply_url">Application link</label>
              <input id="apply_url" name="apply_url" type="url" required placeholder="https://" defaultValue={job.apply_url ?? ""} className="field" />
            </div>
          )}
        </fieldset>

        <fieldset className="panel border-l-4 border-l-signal p-6">
          <legend className="px-1 font-display text-2xl font-bold text-navy">Feature this posting</legend>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="is_featured" defaultChecked={job.is_featured} className="mt-1" />
            <span>
              <span className="block font-medium">Show this job in Featured Careers on the home page</span>
              <span className="mt-0.5 block text-sm text-steel">
                {company.is_member
                  ? "Included free with your AIA Canada membership."
                  : "Available for an additional fee, paid together with your posting. AIA Canada members feature postings free."}
              </span>
            </span>
          </label>
        </fieldset>

        {error && <p className="text-sm text-signal" role="alert">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <button type="submit" className="btn-ghost" disabled={busy} onClick={() => { submitIntent.current = false; }}>Save draft</button>
          <button type="submit" className="btn-primary" disabled={busy} onClick={() => { submitIntent.current = true; }}>
            {company.is_member ? "Submit for review" : "Continue to payment"}
          </button>
        </div>
      </form>
    </div>
  );
}

function YesNo({ name, label, hint, value }: { name: string; label: string; hint: string; value: boolean }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1.5"><input type="radio" name={name} value="yes" defaultChecked={value} /> Yes</label>
        <label className="flex items-center gap-1.5"><input type="radio" name={name} value="no" defaultChecked={!value} /> No</label>
      </div>
      <p className="hint">{hint}</p>
    </fieldset>
  );
}
