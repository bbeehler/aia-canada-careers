import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Job, Sector } from "../lib/types";
import { EMPLOYMENT_TYPES, PROVINCES, formatPay } from "../lib/constants";
import JobRow from "../components/JobRow";
import EditPageLink from "../components/EditPageLink";
import SmartLink from "../components/SmartLink";
import { Bold, Highlighted, useContent } from "../lib/content";

export default function Home() {
  const navigate = useNavigate();
  const c = useContent();
  const [q, setQ] = useState("");
  const [province, setProvince] = useState("");
  const [latest, setLatest] = useState<Job[]>([]);
  const [featured, setFeatured] = useState<Job[]>([]);

  useEffect(() => {
    supabase.from("jobs").select("*, companies(name, is_member)")
      .eq("status", "published").gt("expires_at", new Date().toISOString())
      .order("published_at", { ascending: false }).limit(6)
      .then(({ data }) => setLatest((data as Job[]) ?? []));
    supabase.from("jobs").select("*, companies(name, is_member)")
      .eq("status", "published").eq("is_featured", true).gt("expires_at", new Date().toISOString())
      .order("published_at", { ascending: false }).limit(9)
      .then(({ data }) => setFeatured((data as Job[]) ?? []));
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
          src={c.get("home.hero.image")}
          alt={c.get("home.hero.image_alt")}
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[55%_center]"
          width={1800}
          height={1013}
        />
        <div className="absolute inset-0 -z-10 bg-navy/80 md:bg-transparent md:bg-gradient-to-r md:from-navy md:via-navy/85 md:to-navy/20" aria-hidden />
        <div className="mx-auto flex min-h-[520px] max-w-6xl flex-col justify-center px-4 py-16 sm:min-h-[600px] sm:py-20">
          <span className="inline-block self-start rounded-md border border-white/30 bg-white/10 px-3 py-1 text-sm font-semibold text-white">
            {c.get("home.hero.tag")}
          </span>
          <h1 className="mt-5 max-w-2xl font-display text-5xl font-bold leading-[0.95] text-white sm:text-7xl">
            <Highlighted text={c.get("home.hero.headline")} />
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/85">
            {c.get("home.hero.body")}
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
            {c.get("home.hero.quiz_button")}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid items-center gap-6 rounded-xl bg-gradient-to-br from-[#1D3264] to-navy-deep px-6 py-9 text-white sm:px-10 md:grid-cols-[auto_1fr_auto] md:gap-8">
          <span className="hidden h-14 w-14 items-center justify-center rounded-full bg-white/10 md:flex" aria-hidden>
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
              <path d="M3 21V10l5 3V10l5 3V5h4l1 16zM3 21h18M8 17h1M12 17h1M16 17h1" />
            </svg>
          </span>
          <div>
            <span className="inline-block rounded border border-white/30 bg-white/10 px-2.5 py-0.5 text-xs font-semibold">{c.get("home.didyouknow.tag")}</span>
            <h2 className="mt-3 font-sans text-2xl font-bold tracking-normal text-white sm:text-3xl">{c.get("home.didyouknow.heading")}</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-white/85"><Bold text={c.get("home.didyouknow.body")} /></p>
          </div>
          <SmartLink to={c.get("home.didyouknow.button.url")}
            className="btn self-start bg-white px-6 py-3 text-navy hover:bg-navy-soft md:self-center">
            {c.get("home.didyouknow.button.label")} <span aria-hidden>→</span>
          </SmartLink>
        </div>
      </section>

      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <div className="text-center">
            <h2 className="text-4xl sm:text-5xl"><Highlighted text={c.get("home.pathways.heading")} className="text-signal" /></h2>
            <p className="mx-auto mt-3 max-w-2xl text-lg text-steel">{c.get("home.pathways.intro")}</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {PATHWAYS.map((base) => ({
              ...base,
              title: c.get(`home.pathways.${base.id}.title`),
              text: c.get(`home.pathways.${base.id}.text`),
              roles: c.list(`home.pathways.${base.id}.roles`),
            })).map((p) => (
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

      {featured.length > 0 && (
        <section className="border-b border-line">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-4xl">{c.get("home.featured.heading")}</h2>
                <p className="mt-1 text-steel">{c.get("home.featured.subtitle")}</p>
              </div>
              <Link to="/jobs" className="btn-ghost">{c.get("home.featured.button")}</Link>
            </div>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((j) => (
                <li key={j.id}>
                  <Link to={`/jobs/${j.id}`} className="flex h-full flex-col rounded-lg border border-line bg-white p-5 hover:border-navy">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-sans text-lg font-semibold leading-snug tracking-normal text-ink">{j.title}</h3>
                      <span className="shrink-0 rounded bg-line/70 px-2 py-0.5 text-xs font-medium text-ink">{SECTOR_TAG[j.sector]}</span>
                    </div>
                    <p className="mt-1 text-sm text-steel">{j.companies?.name} – {j.city}, {j.province}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-ink/80">{j.description}</p>
                    <p className="mt-auto pt-4 text-sm">
                      <span className="font-semibold text-emerald-700">{formatPay(j.pay_min, j.pay_max, j.pay_period)}</span>
                      <span className="ml-2 text-steel">{EMPLOYMENT_TYPES[j.employment_type]}</span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-3xl">{c.get("home.newest.heading")}</h2>
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
            <h2 className="text-4xl"><Highlighted text={c.get("home.employers.heading")} className="text-signal" /></h2>
            <p className="mt-3 max-w-lg text-steel">{c.get("home.employers.body")}</p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link to="/employers" className="btn-primary">Post a job</Link>
            <a href="https://www.aiacanada.com" className="btn-ghost">About AIA membership</a>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="relative isolate overflow-hidden rounded-xl bg-navy-deep">
          <img src={c.get("home.parents.image")} alt={c.get("home.parents.image_alt")}
            className="absolute inset-0 -z-20 h-full w-full object-cover object-[68%_18%]" loading="lazy" width={1800} height={1013} />
          <div className="absolute inset-0 -z-10 bg-ink/75 md:bg-transparent md:bg-gradient-to-r md:from-ink/90 md:via-ink/70 md:to-ink/10" aria-hidden />
          <div className="flex min-h-[340px] max-w-xl flex-col justify-center px-6 py-12 sm:px-12 sm:py-16 lg:min-h-[400px]">
            <h2 className="font-sans text-3xl font-bold tracking-normal text-white sm:text-4xl">
              <Highlighted text={c.get("home.parents.heading")} />
            </h2>
            <p className="mt-4 text-lg text-white/85">{c.get("home.parents.body")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <SmartLink to={c.get("home.parents.button1.url")} className="btn border border-white/25 bg-white/10 px-5 py-3 text-white hover:bg-white/20">
                {c.get("home.parents.button1.label")} <span aria-hidden>›</span>
              </SmartLink>
              <SmartLink to={c.get("home.parents.button2.url")} className="btn border border-white/25 bg-white/10 px-5 py-3 text-white hover:bg-white/20">
                {c.get("home.parents.button2.label")}
              </SmartLink>
            </div>
          </div>
        </div>
      </section>
      <EditPageLink section="home.hero" />
    </>
  );
}

const icon = "h-5 w-5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]";

const PATHWAYS = [
  {
    id: "one",
    iconBg: "bg-navy-soft text-navy",
    icon: (
      <svg viewBox="0 0 24 24" className={icon}>
        <path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.6 17.2a1.6 1.6 0 0 0 2.3 2.3l5.7-5.7a4 4 0 0 0 5.2-5.4l-2.5 2.5-2.2-.6-.6-2.2z" />
      </svg>
    ),
  },
  {
    id: "two",
    iconBg: "bg-emerald-50 text-emerald-700",
    icon: (
      <svg viewBox="0 0 24 24" className={icon}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M8 7v13M16 7v13" />
      </svg>
    ),
  },
];

const SECTOR_TAG: Record<Sector, string> = {
  mechanical: "Repair",
  collision: "Collision",
  parts_manufacturing: "Manufacturing",
  business_operations: "Business",
};
