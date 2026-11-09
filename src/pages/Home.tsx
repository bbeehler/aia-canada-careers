import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Job, Sector } from "../lib/types";
import { PROVINCES, SECTORS } from "../lib/constants";
import JobRow from "../components/JobRow";

export default function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [province, setProvince] = useState("");
  const [latest, setLatest] = useState<Job[]>([]);
  const [counts, setCounts] = useState<Partial<Record<Sector, number>>>({});

  useEffect(() => {
    supabase.from("jobs").select("*, companies(name, is_member)")
      .eq("status", "published").gt("expires_at", new Date().toISOString())
      .order("published_at", { ascending: false }).limit(6)
      .then(({ data }) => setLatest((data as Job[]) ?? []));
    supabase.from("jobs").select("sector")
      .eq("status", "published").gt("expires_at", new Date().toISOString())
      .then(({ data }) => {
        const c: Partial<Record<Sector, number>> = {};
        (data ?? []).forEach((r: { sector: Sector }) => { c[r.sector] = (c[r.sector] ?? 0) + 1; });
        setCounts(c);
      });
  }, []);

  const search = (e: FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (province) p.set("province", province);
    navigate(`/jobs?${p.toString()}`);
  };

  return (
    <>
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-14 sm:pt-20">
          <h1 className="max-w-3xl font-display text-5xl font-bold leading-[0.95] text-white sm:text-7xl">
            Work that keeps Canada moving.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/80">
            Jobs in mechanical repair, collision repair, parts and the businesses behind them, posted by employers across the automotive aftermarket.
          </p>

          <form onSubmit={search} className="mt-9 grid max-w-3xl gap-px overflow-hidden rounded-md bg-white/20 sm:grid-cols-[1fr_220px_auto]">
            <label className="sr-only" htmlFor="q">Job title or keyword</label>
            <input id="q" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Job title or keyword, like “licensed technician”"
              className="bg-white px-4 py-4 text-ink placeholder:text-steel/70 focus:outline-none" />
            <label className="sr-only" htmlFor="province">Province</label>
            <select id="province" value={province} onChange={(e) => setProvince(e.target.value)}
              className="bg-white px-4 py-4 text-ink focus:outline-none">
              <option value="">All of Canada</option>
              {PROVINCES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
            <button className="bg-signal px-6 py-4 font-semibold text-white hover:bg-signal-dark">Search jobs</button>
          </form>
        </div>
      </section>

      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(SECTORS) as Sector[]).map((s) => (
            <Link key={s} to={`/jobs?sector=${s}`}
              className="border-b border-line px-5 py-6 hover:bg-navy-soft/40 sm:border-r lg:border-b-0 lg:last:border-r-0">
              <p className="font-display text-2xl font-bold text-navy">{SECTORS[s].label}</p>
              <p className="mt-1 text-sm text-steel">{SECTORS[s].blurb}</p>
              <p className="mt-3 text-sm font-semibold text-signal">
                {counts[s] ? `${counts[s]} open ${counts[s] === 1 ? "job" : "jobs"}` : "See jobs"}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-3xl">Newest jobs</h2>
          <Link to="/jobs" className="text-sm font-semibold text-navy hover:underline">See all jobs</Link>
        </div>
        {latest.length ? (
          <ul className="overflow-hidden rounded-md border border-line border-b-0">
            {latest.map((j) => <JobRow key={j.id} job={j} />)}
          </ul>
        ) : (
          <p className="panel px-5 py-8 text-steel">New jobs will appear here as employers post them.</p>
        )}
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <h2 className="text-4xl">Hiring? AIA Canada members post free.</h2>
            <p className="mt-3 max-w-lg text-steel">
              Reach technicians, apprentices and industry professionals who are looking specifically for work in auto care. Non-members can post too, for a flat fee per posting.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link to="/employers" className="btn-primary">Post a job</Link>
            <a href="https://www.aiacanada.com" className="btn-ghost">About AIA membership</a>
          </div>
        </div>
      </section>
    </>
  );
}
