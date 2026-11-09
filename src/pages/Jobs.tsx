import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { EmploymentType, Job, Sector } from "../lib/types";
import { EMPLOYMENT_TYPES, PROVINCES, SECTORS } from "../lib/constants";
import JobRow from "../components/JobRow";

export default function Jobs() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const sector = params.get("sector") ?? "";
  const province = params.get("province") ?? "";
  const type = params.get("type") ?? "";
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [draftQ, setDraftQ] = useState(q);

  useEffect(() => {
    setJobs(null);
    let query = supabase.from("jobs").select("*, companies(name, is_member)")
      .eq("status", "published").gt("expires_at", new Date().toISOString())
      .order("published_at", { ascending: false }).limit(100);
    if (sector) query = query.eq("sector", sector);
    if (province) query = query.eq("province", province);
    if (type) query = query.eq("employment_type", type);
    if (q) {
      const term = q.replace(/[%,()]/g, " ");
      query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,city.ilike.%${term}%`);
    }
    query.then(({ data }) => setJobs((data as Job[]) ?? []));
  }, [q, sector, province, type]);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl">Find jobs</h1>

      <form className="mt-6 grid gap-3 md:grid-cols-[1fr_repeat(3,180px)]"
        onSubmit={(e) => { e.preventDefault(); set("q", draftQ.trim()); }}>
        <div>
          <label htmlFor="kw" className="sr-only">Keyword</label>
          <input id="kw" className="field" placeholder="Title, keyword or city" value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)} onBlur={() => set("q", draftQ.trim())} />
        </div>
        <select aria-label="Sector" className="field" value={sector} onChange={(e) => set("sector", e.target.value)}>
          <option value="">All sectors</option>
          {(Object.keys(SECTORS) as Sector[]).map((s) => <option key={s} value={s}>{SECTORS[s].label}</option>)}
        </select>
        <select aria-label="Province" className="field" value={province} onChange={(e) => set("province", e.target.value)}>
          <option value="">All provinces</option>
          {PROVINCES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
        <select aria-label="Job type" className="field" value={type} onChange={(e) => set("type", e.target.value)}>
          <option value="">All job types</option>
          {(Object.keys(EMPLOYMENT_TYPES) as EmploymentType[]).map((t) => <option key={t} value={t}>{EMPLOYMENT_TYPES[t]}</option>)}
        </select>
      </form>

      <div className="mt-6">
        {jobs === null ? (
          <p className="text-steel">Loading jobs…</p>
        ) : jobs.length === 0 ? (
          <div className="panel px-5 py-10">
            <p className="font-medium">No jobs match those filters.</p>
            <p className="mt-1 text-sm text-steel">Try a different province or sector, or clear the keyword.</p>
            <button className="btn-ghost mt-4" onClick={() => { setDraftQ(""); setParams(new URLSearchParams()); }}>Clear filters</button>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-steel">{jobs.length} {jobs.length === 1 ? "job" : "jobs"}</p>
            <ul className="overflow-hidden rounded-md border border-line border-b-0">
              {jobs.map((j) => <JobRow key={j.id} job={j} />)}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
