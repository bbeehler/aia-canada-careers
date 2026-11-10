import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "../components/L";
import { supabase } from "../lib/supabase";
import { useCompany } from "../lib/useCompany";
import type { Career, EmploymentType, Job, Sector } from "../lib/types";
import { EMPLOYMENT_TYPES, PROVINCES, SECTORS } from "../lib/constants";
import PageHero from "../components/PageHero";

import { localize, t } from "../lib/i18n";
export default function JobForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { company } = useCompany();
  const [job, setJob] = useState<Partial<Job> | null>(id ? null : {});
  const [applyMethod, setApplyMethod] = useState<"on_site" | "external">("on_site");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitIntent = useRef(false);
  const [careers, setCareers] = useState<Pick<Career, "id" | "title" | "sector" | "search_terms">[]>([]);
  const [careerId, setCareerId] = useState<string | null>(null); // null = not chosen yet, "" = not listed
  const [suggested, setSuggested] = useState(false);

  useEffect(() => {
    supabase.from("careers").select("id, title, sector, search_terms, translations").eq("is_published", true).order("sort_order")
      .then(({ data }) => setCareers(((data as typeof careers) ?? []).map(localize)));
  }, []);

  // Suggest a matching career from the job title (only until the employer makes a choice)
  const suggestCareer = (title: string) => {
    if (careerId !== null || !title.trim()) return;
    const t = title.toLowerCase();
    const match = careers.find((c) => t.includes(c.title.toLowerCase()))
      ?? careers.find((c) => c.search_terms.split(",").map((w) => w.trim().toLowerCase()).filter((w) => w.length > 3).some((w) => t.includes(w)));
    if (match) { setCareerId(match.id); setSuggested(true); }
  };

  useEffect(() => {
    if (!id) return;
    supabase.from("jobs").select("*").eq("id", id).single().then(({ data }) => {
      setJob((data as Job) ?? {});
      if (data) { setApplyMethod((data as Job).apply_method); setCareerId((data as Job).career_id ?? ""); }
    });
  }, [id]);

  if (company === undefined || job === null) return <p className="mx-auto max-w-6xl px-4 py-12 text-steel">{t("Loading…")}</p>;
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
      career_id: careerId || null,
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
        ? t("Some details aren’t valid. The description needs at least 50 characters, and an external link must start with https://.")
        : result.error?.message ?? t("Your posting didn’t save. Try again."));
      return;
    }
    if (andSubmit) {
      const sub = await supabase.rpc("submit_job", { job: result.data.id });
      if (sub.error) { setBusy(false); setError(sub.error.message); return; }
    }
    navigate("/employer");
  };

  return (
    <>
    <PageHero compact tag={company.name} title={id ? t("Edit posting") : t("Post a job")} body={t("Postings run for 30 days after AIA Canada approves them.")} />
    <div className="mx-auto max-w-3xl px-4 py-10">
      <form className="space-y-8" onSubmit={(e) => save(e, submitIntent.current)}>
        <fieldset className="panel space-y-4 p-6">
          <legend className="px-1 font-display text-2xl font-bold text-navy">{t("The job")}</legend>
          <div>
            <label className="label" htmlFor="title">{t("Job title")}</label>
            <input id="title" name="title" required minLength={3} maxLength={140} defaultValue={job.title} className="field"
              placeholder={t("Licensed Automotive Service Technician (310S)")} onBlur={(e) => suggestCareer(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="career_id">{t("Which career best matches this job? (optional)")}</label>
            <select id="career_id" className="field" value={careerId ?? ""} onChange={(e) => { setCareerId(e.target.value); setSuggested(false); }}>
              <option value="">{t("Not listed / other")}</option>
              {(Object.keys(SECTORS) as Sector[]).map((s) => {
                const group = careers.filter((c) => c.sector === s);
                return group.length ? (
                  <optgroup key={s} label={SECTORS[s].label}>
                    {group.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </optgroup>
                ) : null;
              })}
            </select>
            <p className="hint">
              {suggested ? t("We picked this from your job title. Change it if it’s not right. ") : ""}
              This links your posting to the career page and shows job seekers how the pay compares with typical wages in your province. If your job isn’t listed, choose “Not listed / other”; you can still post it.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="sector">{t("Sector")}</label>
              <select id="sector" name="sector" required defaultValue={job.sector ?? ""} className="field">
                <option value="" disabled>{t("Choose a sector")}</option>
                {(Object.keys(SECTORS) as Sector[]).map((s) => <option key={s} value={s}>{SECTORS[s].label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="employment_type">{t("Job type")}</label>
              <select id="employment_type" name="employment_type" required defaultValue={job.employment_type ?? "full_time"} className="field">
                {(Object.keys(EMPLOYMENT_TYPES) as EmploymentType[]).map((t) => <option key={t} value={t}>{EMPLOYMENT_TYPES[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="city">{t("City")}</label>
              <input id="city" name="city" required defaultValue={job.city ?? company.city ?? ""} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="province">{t("Province")}</label>
              <select id="province" name="province" required defaultValue={job.province ?? company.province ?? ""} className="field">
                <option value="" disabled>{t("Choose")}</option>
                {PROVINCES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="remote_ok" defaultChecked={job.remote_ok} /> {t("Some of this work can be done remotely")}
          </label>
        </fieldset>

        <fieldset className="panel space-y-4 p-6">
          <legend className="px-1 font-display text-2xl font-bold text-navy">{t("Pay")}</legend>
          <p className="text-sm text-steel">{t("A pay range is required on every posting. Ontario law requires it, and postings with pay get more applicants.")}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="pay_min">{t("From ($)")}</label>
              <input id="pay_min" name="pay_min" type="number" min="1" step="0.01" required defaultValue={job.pay_min} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="pay_max">{t("To ($)")}</label>
              <input id="pay_max" name="pay_max" type="number" min="1" step="0.01" defaultValue={job.pay_max} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="pay_period">{t("Per")}</label>
              <select id="pay_period" name="pay_period" defaultValue={job.pay_period ?? "hour"} className="field">
                <option value="hour">{t("Hour")}</option>
                <option value="year">{t("Year")}</option>
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="panel space-y-4 p-6">
          <legend className="px-1 font-display text-2xl font-bold text-navy">{t("Description")}</legend>
          <div>
            <label className="label" htmlFor="description">{t("About the job")}</label>
            <textarea id="description" name="description" required minLength={50} rows={8} defaultValue={job.description} className="field"
              placeholder={t("What the day looks like, the shop or team, hours, benefits.")} />
          </div>
          <div>
            <label className="label" htmlFor="requirements">{t("What candidates need (optional)")}</label>
            <textarea id="requirements" name="requirements" rows={4} defaultValue={job.requirements ?? ""} className="field"
              placeholder={t("Licences, certifications, years of experience, tools.")} />
            <p className="hint">{t("Don’t require Canadian work experience. It isn’t allowed in Ontario postings.")}</p>
          </div>
          <div>
            <label className="label" htmlFor="icar_training">{t("Training you value (optional)")}</label>
            <input id="icar_training" name="icar_training" defaultValue={job.icar_training ?? ""} className="field"
              placeholder={t("I-CAR Platinum in Steel Structural Technician, ADAS calibration")} />
            <p className="hint">{t("We’ll point job seekers to matching I-CAR and AIA Canada training.")}</p>
          </div>
        </fieldset>

        <fieldset className="panel space-y-5 p-6">
          <legend className="px-1 font-display text-2xl font-bold text-navy">{t("Disclosures")}</legend>
          <YesNo name="is_existing_vacancy" label={t("Is this a current, open vacancy?")}
            hint={t("Choose No if you’re collecting applications for a future opening.")} value={job.is_existing_vacancy ?? true} />
          <YesNo name="uses_ai_screening" label={t("Do you use AI to screen, assess or select applicants?")}
            hint={t("This is shown on your posting.")} value={job.uses_ai_screening ?? false} />
        </fieldset>

        <fieldset className="panel space-y-4 p-6">
          <legend className="px-1 font-display text-2xl font-bold text-navy">{t("How people apply")}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {([["on_site", t("Through Careers in Auto Care"), t("Applications and resumes arrive in your dashboard.")],
               ["external", t("On our own website"), t("We’ll send applicants to your careers page.")]] as const).map(([v, t, d]) => (
              <label key={v} className={`cursor-pointer rounded border p-4 ${applyMethod === v ? "border-navy bg-navy-soft" : "border-line"}`}>
                <input type="radio" name="apply_method" value={v} checked={applyMethod === v} onChange={() => setApplyMethod(v)} className="sr-only" />
                <span className="block font-medium text-navy">{t}</span>
                <span className="mt-0.5 block text-sm text-steel">{d}</span>
              </label>
            ))}
          </div>
          {applyMethod === "external" && (
            <div>
              <label className="label" htmlFor="apply_url">{t("Application link")}</label>
              <input id="apply_url" name="apply_url" type="url" required placeholder={t("https://")} defaultValue={job.apply_url ?? ""} className="field" />
            </div>
          )}
        </fieldset>

        <fieldset className="panel border-l-4 border-l-signal p-6">
          <legend className="px-1 font-display text-2xl font-bold text-navy">{t("Feature this posting")}</legend>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="is_featured" defaultChecked={job.is_featured} className="mt-1" />
            <span>
              <span className="block font-medium">{t("Show this job in Featured Careers on the home page")}</span>
              <span className="mt-0.5 block text-sm text-steel">
                {company.is_member
                  ? t("Included free with your AIA Canada membership.")
                  : t("Available for an additional fee, paid together with your posting. AIA Canada members feature postings free.")}
              </span>
            </span>
          </label>
        </fieldset>

        {error && <p className="text-sm text-signal" role="alert">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <button type="submit" className="btn-ghost" disabled={busy} onClick={() => { submitIntent.current = false; }}>{t("Save draft")}</button>
          <button type="submit" className="btn-primary" disabled={busy} onClick={() => { submitIntent.current = true; }}>
            {company.is_member ? t("Submit for review") : t("Continue to payment")}
          </button>
        </div>
      </form>
    </div>
    </>
  );
}

function YesNo({ name, label, hint, value }: { name: string; label: string; hint: string; value: boolean }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1.5"><input type="radio" name={name} value="yes" defaultChecked={value} /> {t("Yes")}</label>
        <label className="flex items-center gap-1.5"><input type="radio" name={name} value="no" defaultChecked={!value} /> {t("No")}</label>
      </div>
      <p className="hint">{hint}</p>
    </fieldset>
  );
}
