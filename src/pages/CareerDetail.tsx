import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { SECTORS } from "../lib/constants";
import type { Career, Job } from "../lib/types";
import PageHero, { heroPrimary, heroSecondary } from "../components/PageHero";
import JobRow from "../components/JobRow";

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

export default function CareerDetail() {
  const { slug } = useParams();
  const { profile } = useAuth();
  const [career, setCareer] = useState<Career | null | undefined>(undefined);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    setCareer(undefined);
    supabase.from("careers").select("*").eq("slug", slug).maybeSingle().then(({ data }) => setCareer((data as Career) ?? null));
  }, [slug]);

  useEffect(() => {
    if (!career) return;
    const terms = [career.title, ...career.search_terms.split(",")].map((t) => t.trim().replace(/[%,()]/g, " ")).filter((t) => t.length > 2);
    const or = terms.map((t) => `title.ilike.%${t}%`).join(",");
    supabase.from("jobs").select("*, companies(name, is_member)")
      .eq("status", "published").gt("expires_at", new Date().toISOString())
      .or(or).order("published_at", { ascending: false }).limit(5)
      .then(({ data }) => setJobs((data as Job[]) ?? []));
  }, [career]);

  if (career === undefined) return <p className="mx-auto max-w-6xl px-4 py-12 text-steel">Loading…</p>;
  if (career === null) {
    return <PageHero compact title="Career not found" body="This career may have been renamed or removed."
      actions={<Link to="/careers" className={heroPrimary}>Explore all careers</Link>} />;
  }

  const facts = [
    ["Salary range", career.salary_range],
    ["Job growth", career.growth],
    ["Education", career.education_level],
    ["Career area", SECTORS[career.sector].label],
  ].filter(([, v]) => v);

  return (
    <>
      <PageHero
        tag={SECTORS[career.sector].label}
        title={career.title}
        body={career.summary}
        actions={<>
          <a href="#open-jobs" className={heroPrimary}>See open jobs <span aria-hidden>→</span></a>
          <Link to="/quiz" className={heroSecondary}>Take the Career Quiz</Link>
        </>}
      >
        <Link to="/careers" className="mt-6 self-start text-sm text-white/70 hover:text-white">← All careers</Link>
      </PageHero>

      <section className="border-b border-line bg-white">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-y-6 px-4 py-8 lg:grid-cols-4">
          {facts.map(([k, v]) => (
            <div key={k} className="px-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-steel">{k}</dt>
              <dd className={`mt-1 font-display text-2xl font-bold ${k === "Salary range" ? "text-emerald-700" : "text-navy"}`}>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          {career.description && (
            <section>
              <h2 className="text-3xl">About the role</h2>
              <p className="mt-3 max-w-prose whitespace-pre-line leading-relaxed">{career.description}</p>
            </section>
          )}
          {career.tasks && (
            <section>
              <h2 className="text-3xl">What you’ll do</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {lines(career.tasks).map((t) => (
                  <li key={t} className="flex gap-2.5 rounded-md border border-line bg-white px-4 py-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-signal" aria-hidden />{t}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {career.training && (
            <section>
              <h2 className="text-3xl">How to get there</h2>
              <ol className="mt-4 space-y-3">
                {lines(career.training).map((t, i) => (
                  <li key={t} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy font-display text-lg font-bold text-white">{i + 1}</span>
                    <span className="pt-1">{t}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section id="open-jobs" className="scroll-mt-6">
            <h2 className="text-3xl">Open jobs</h2>
            {jobs.length ? (
              <>
                <ul className="mt-4 overflow-hidden rounded-md border border-line border-b-0">
                  {jobs.map((j) => <JobRow key={j.id} job={j} />)}
                </ul>
                <Link to={`/jobs?sector=${career.sector}`} className="mt-4 inline-block text-sm font-semibold text-navy hover:underline">
                  See all {SECTORS[career.sector].label.toLowerCase()} jobs
                </Link>
              </>
            ) : (
              <div className="panel mt-4 px-5 py-6">
                <p className="text-steel">There aren’t any open {career.title.toLowerCase()} jobs posted right now.</p>
                <Link to={`/jobs?sector=${career.sector}`} className="btn-ghost mt-4">See other {SECTORS[career.sector].label.toLowerCase()} jobs</Link>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          {career.skills && (
            <div className="panel p-5">
              <p className="font-display text-xl font-bold text-navy">Skills that help</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {lines(career.skills).map((s) => <li key={s} className="rounded bg-navy-soft px-2.5 py-1 text-sm text-navy">{s}</li>)}
              </ul>
            </div>
          )}
          <div className="panel border-l-4 border-l-signal p-5">
            <p className="font-display text-xl font-bold text-navy">Training and certification</p>
            <p className="mt-2 text-sm text-steel">I-CAR and AIA Canada offer training that helps people start and grow in this career.</p>
            <a href="https://www.i-car.ca" className="mt-3 inline-block text-sm font-semibold text-navy hover:underline">Explore I-CAR training</a>
          </div>
          {profile?.role === "admin" && (
            <Link to={`/admin/careers?edit=${career.id}`} className="btn-ghost w-full">Edit this career</Link>
          )}
        </aside>
      </div>
    </>
  );
}
