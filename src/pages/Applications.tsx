import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Application, Job } from "../lib/types";

const STATUSES: Application["status"][] = ["submitted", "reviewed", "shortlisted", "declined"];
const LABEL: Record<Application["status"], string> = { submitted: "New", reviewed: "Reviewed", shortlisted: "Shortlisted", declined: "Declined" };

export default function Applications() {
  const { id } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [apps, setApps] = useState<Application[] | null>(null);

  useEffect(() => {
    supabase.from("jobs").select("*").eq("id", id).single().then(({ data }) => setJob(data as Job));
    supabase.from("applications").select("*").eq("job_id", id).order("created_at", { ascending: false })
      .then(({ data }) => setApps((data as Application[]) ?? []));
  }, [id]);

  const openResume = async (path: string) => {
    const { data } = await supabase.storage.from("resumes").createSignedUrl(path, 120);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  };

  const setStatus = async (app: Application, status: Application["status"]) => {
    await supabase.from("applications").update({ status }).eq("id", app.id);
    setApps((list) => list?.map((a) => (a.id === app.id ? { ...a, status } : a)) ?? null);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/employer" className="text-sm text-steel hover:text-navy">Back to my postings</Link>
      <h1 className="mt-2 text-4xl">Applications{job ? ` for ${job.title}` : ""}</h1>
      <div className="mt-6 space-y-3">
        {apps === null ? <p className="text-steel">Loading…</p> : apps.length === 0 ? (
          <p className="panel px-5 py-8 text-steel">No applications yet.</p>
        ) : apps.map((a) => (
          <div key={a.id} className="panel grid gap-3 p-5 md:grid-cols-[1fr_auto]">
            <div>
              <p className="font-semibold">{a.full_name}</p>
              <p className="text-sm text-steel">
                <a href={`mailto:${a.email}`} className="hover:text-navy">{a.email}</a>{a.phone ? ` – ${a.phone}` : ""}
                {" – applied "}{new Date(a.created_at).toLocaleDateString("en-CA")}
              </p>
              {a.message && <p className="mt-2 max-w-prose whitespace-pre-line text-sm">{a.message}</p>}
            </div>
            <div className="flex flex-wrap items-start gap-2 md:justify-end">
              {a.resume_path && <button onClick={() => openResume(a.resume_path!)} className="btn-ghost px-3 py-1.5">Open resume</button>}
              <label className="sr-only" htmlFor={`s-${a.id}`}>Status</label>
              <select id={`s-${a.id}`} value={a.status} onChange={(e) => setStatus(a, e.target.value as Application["status"])} className="field w-auto py-1.5">
                {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
