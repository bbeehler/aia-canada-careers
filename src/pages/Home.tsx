import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Job } from "../lib/types";
import { PROVINCES } from "../lib/constants";
import JobRow from "../components/JobRow";

export default function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [province, setProvince] = useState("");
  const [latest, setLatest] = useState<Job[]>([]);

  useEffect(() => {
    supabase.from("jobs").select("*, companies(name, is_member)")
      .eq("status", "published").gt("expires_at", new Date().toISOString())
      .order("published_at", { ascending: false }).limit(6)
      .then(({ data }) => setLatest((data as Job[]) ?? []));
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
      <section className="relative isolate overflow-hidden bg-navy text-white">
        <img
          src="/hero-technician-lift.jpg"
          alt="A technician in coveralls working under a car raised on a lift in a repair shop"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[55%_center]"
          width={1800}
          height={1013}
        />
        <div className="absolute inset-0 -z-10 bg-navy/80 md:bg-transparent md:bg-gradient-to-r md:from-navy md:via-navy/85 md:to-navy/20" aria-hidden />
        <div className="mx-auto flex min-h-[520px] max-w-6xl flex-col justify-center px-4 py-16 sm:min-h-[600px] sm:py-20">
          <span className="inline-block self-start rounded-md border border-white/30 bg-white/10 px-3 py-1 text-sm font-semibold text-white">
            Career Exploration
          </span>
          <h1 className="mt-5 max-w-2xl font-display text-5xl font-bold leading-[0.95] text-white sm:text-7xl">
            Your Future in <span className="text-[#F0384F]">Automotive</span> Starts Here
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/85">
            Discover rewarding career paths in vehicle repair and automotive business operations. Built for Canadian high school students and parents ready to explore a thriving industry.
          </p>

          <form onSubmit={search} className="mt-9 grid max-w-3xl gap-px overflow-hidden rounded-md bg-white/20 sm:grid-cols-[1fr_180px_auto]">
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
          <Link to="/quiz" className="btn mt-4 self-start border border-white/30 bg-white/10 px-6 py-3 text-white hover:bg-white/20">
            Take the Career Quiz
          </Link>
        </div>
      </section>

      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <div className="text-center">
            <h2 className="text-4xl sm:text-5xl">Two Pathways, Endless Possibilities</h2>
            <p className="mx-auto mt-3 max-w-2xl text-lg text-steel">
              The automotive care sector offers diverse career opportunities across two major areas. Find the path that matches your interests.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {PATHWAYS.map((p) => (
              <div key={p.title} className="rounded-lg border border-line bg-paper p-6">
                <span className={`flex h-11 w-11 items-center justify-center rounded-md ${p.iconBg}`} aria-hidden>{p.icon}</span>
                <h3 className="mt-4 font-sans text-2xl font-semibold tracking-normal text-ink">{p.title}</h3>
                <p className="mt-2 text-steel">{p.text}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {p.roles.map((r) => (
                    <li key={r}>
                      <Link to={`/jobs?q=${encodeURIComponent(r.replace(/s$/, "").replace(" & ", " "))}`}
                        className="inline-block rounded bg-line/70 px-2.5 py-1 text-sm font-medium text-ink hover:bg-navy hover:text-white">
                        {r}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
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

const icon = "h-5 w-5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]";

const PATHWAYS = [
  {
    title: "Vehicle Repair & Service",
    text: "From diagnostics to full engine rebuilds, explore the hands-on world of keeping vehicles running safely.",
    roles: ["Automotive Service Technician", "Diesel Service Technician", "Truck & Transport Mechanic", "Collision Repair"],
    iconBg: "bg-navy-soft text-navy",
    icon: (
      <svg viewBox="0 0 24 24" className={icon}>
        <path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.6 17.2a1.6 1.6 0 0 0 2.3 2.3l5.7-5.7a4 4 0 0 0 5.2-5.4l-2.5 2.5-2.2-.6-.6-2.2z" />
      </svg>
    ),
  },
  {
    title: "Business Operations",
    text: "Love cars but prefer working with people and ideas? Explore business roles that keep automotive companies thriving.",
    roles: ["Service Advisor", "Marketing", "Shop Manager", "Payroll & Accounting"],
    iconBg: "bg-emerald-50 text-emerald-700",
    icon: (
      <svg viewBox="0 0 24 24" className={icon}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M8 7v13M16 7v13" />
      </svg>
    ),
  },
];
