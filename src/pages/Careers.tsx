import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Highlighted, useContent } from "../lib/content";
import { SECTORS } from "../lib/constants";
import type { Career, Sector } from "../lib/types";
import PageHero from "../components/PageHero";
import SectorIcon from "../components/SectorIcon";
import EditPageLink from "../components/EditPageLink";

export default function Careers() {
  const c = useContent();
  const [params, setParams] = useSearchParams();
  const [careers, setCareers] = useState<Career[] | null>(null);
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const level = params.get("level") ?? "";

  useEffect(() => {
    supabase.from("careers").select("*").eq("is_published", true).order("sort_order").order("title")
      .then(({ data }) => setCareers((data as Career[]) ?? []));
  }, []);

  const levels = useMemo(() => Array.from(new Set((careers ?? []).map((x) => x.education_level).filter(Boolean))), [careers]);

  const shown = (careers ?? []).filter((x) =>
    (!category || x.sector === category) &&
    (!level || x.education_level === level) &&
    (!q || `${x.title} ${x.summary} ${x.search_terms}`.toLowerCase().includes(q.toLowerCase())));

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHero
        tag={c.get("careers.hero.tag")}
        title={<Highlighted text={c.get("careers.hero.heading")} />}
        body={c.get("careers.hero.body")}
        image={c.get("careers.hero.image") || undefined}
      />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
          <div className="relative">
            <label htmlFor="career-q" className="sr-only">Search careers</label>
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-steel stroke-2" aria-hidden>
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input id="career-q" className="field pl-9" placeholder="Search careers…" value={q} onChange={(e) => set("q", e.target.value)} />
          </div>
          <select aria-label="Category" className="field" value={category} onChange={(e) => set("category", e.target.value)}>
            <option value="">All Categories</option>
            {(Object.keys(SECTORS) as Sector[]).map((s) => <option key={s} value={s}>{SECTORS[s].label}</option>)}
          </select>
          <select aria-label="Education level" className="field" value={level} onChange={(e) => set("level", e.target.value)}>
            <option value="">All Levels</option>
            {levels.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {careers === null ? (
          <p className="mt-8 text-steel">Loading careers…</p>
        ) : (
          <>
            <p className="mt-6 text-sm text-steel">Showing {shown.length} {shown.length === 1 ? "career" : "careers"}</p>
            {shown.length === 0 ? (
              <div className="panel mt-4 px-5 py-10">
                <p className="font-medium">No careers match those filters.</p>
                <button className="btn-ghost mt-4" onClick={() => setParams(new URLSearchParams(), { replace: true })}>Clear filters</button>
              </div>
            ) : (
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((x) => (
                  <li key={x.id}>
                    <Link to={`/careers/${x.slug}`} className="flex h-full flex-col rounded-lg border border-line bg-white p-5 transition-colors hover:border-navy">
                      <div className="flex items-center gap-3">
                        <SectorIcon sector={x.sector} />
                        <h2 className="font-sans text-lg font-semibold leading-snug tracking-normal text-ink">{x.title}</h2>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-ink/80">{x.summary}</p>
                      <p className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-sm">
                        {x.salary_range && <span className="font-semibold text-emerald-700">{x.salary_range}</span>}
                        {x.growth && <span className="text-steel"><span aria-hidden>↗ </span>{x.growth}<span className="sr-only"> job growth</span></span>}
                        {x.education_level && <span className="text-steel">{x.education_level}</span>}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      <EditPageLink section="careers.hero" />
    </>
  );
}
