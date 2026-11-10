import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { SECTORS } from "../lib/constants";
import type { Career, Job } from "../lib/types";
import PageHero, { heroPrimary, heroSecondary } from "../components/PageHero";
import JobRow from "../components/JobRow";

const lines = (s: string) => (s ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
const rows = (s: string) => lines(s).map((l) => l.split("|").map((p) => p.trim()));
const anchor = (t: string) => t.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Turns "visit red-seal.ca" and "Canada.ca" in notes into links.
function Linkify({ text }: { text: string }) {
  const parts = text.split(/((?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:ca|com|org)(?:\/\S*)?)/gi);
  return <>{parts.map((p, i) => i % 2 ? <a key={i} href={p.startsWith("http") ? p : `https://${p}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">{p}</a> : p)}</>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section id={anchor(title)} className="scroll-mt-24">
      <h2 className="text-3xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Chips({ items, tone = "bg-navy-soft text-navy" }: { items: string[]; tone?: string }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((s) => <li key={s} className={`rounded px-3 py-1.5 text-sm font-medium ${tone}`}>{s}</li>)}
    </ul>
  );
}

export default function CareerDetail() {
  const { slug } = useParams();
  const { profile } = useAuth();
  const [career, setCareer] = useState<Career | null | undefined>(undefined);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [province, setProvince] = useState("");

  useEffect(() => {
    setCareer(undefined);
    supabase.from("careers").select("*").eq("slug", slug).maybeSingle().then(({ data }) => setCareer((data as Career) ?? null));
  }, [slug]);

  useEffect(() => {
    if (!career) return;
    const terms = [career.title, ...career.search_terms.split(",")].map((t) => t.trim().replace(/[%,()]/g, " ")).filter((t) => t.length > 2);
    supabase.from("jobs").select("*, companies(name, is_member)")
      .eq("status", "published").gt("expires_at", new Date().toISOString())
      .or(terms.map((t) => `title.ilike.%${t}%`).join(",")).order("published_at", { ascending: false }).limit(5)
      .then(({ data }) => setJobs((data as Job[]) ?? []));
  }, [career]);

  const redSeal = useMemo(() => rows(career?.red_seal ?? ""), [career]);
  const programs = useMemo(() => {
    const grouped: { province: string; items: { name: string; text: string }[] }[] = [];
    rows(career?.provincial_programs ?? "").forEach(([prov, name, text]) => {
      let g = grouped.find((x) => x.province === prov);
      if (!g) { g = { province: prov, items: [] }; grouped.push(g); }
      g.items.push({ name, text: text ?? "" });
    });
    return grouped;
  }, [career]);
  const provinces = useMemo(() => Array.from(new Set([...redSeal.map((r) => r[0]), ...programs.map((p) => p.province)])), [redSeal, programs]);

  if (career === undefined) return <p className="mx-auto max-w-6xl px-4 py-12 text-steel">Loading…</p>;
  if (career === null) {
    return <PageHero compact title="Career not found" body="This career may have been renamed or removed."
      actions={<Link to="/careers" className={heroPrimary}>Explore all careers</Link>} />;
  }

  const facts = [
    ["Annual Salary", career.salary_range],
    ["Job Growth (10yr)", career.growth],
    ["Education", career.education_level],
    ["Job Outlook", career.outlook],
  ].filter(([, v]) => v);

  const sections = [
    career.description && "About This Career",
    career.day_in_life && "A Day in the Life",
    career.skills && "Key Skills",
    career.certifications && "Certifications",
    redSeal.length > 0 && "Red Seal Requirements by Province",
    career.hs_courses && "Recommended High School Courses",
    programs.length > 0 && "Specialized Provincial Programs",
    (career.education_text || career.education_required || career.training) && "Education & Training",
    "Open Jobs",
  ].filter(Boolean) as string[];

  const shownSeal = province ? redSeal.filter((r) => r[0] === province) : redSeal;
  const shownPrograms = province ? programs.filter((p) => p.province === province) : programs;

  const provincePicker = provinces.length > 1 && (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
      <label htmlFor="prov" className="text-sm font-medium">Show my province:</label>
      <select id="prov" className="field sm:w-64" value={province} onChange={(e) => setProvince(e.target.value)}>
        <option value="">All provinces and territories</option>
        {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>
  );

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
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-6 px-4 py-6 sm:py-8 lg:grid-cols-4">
          {facts.map(([k, v]) => (
            <div key={k} className="min-w-0 sm:px-2">
              <dd className={`break-words font-display text-2xl font-bold leading-tight sm:text-3xl ${k === "Annual Salary" ? "text-emerald-700" : "text-navy"}`}>{v}</dd>
              <dt className="mt-1 text-xs font-medium uppercase tracking-wide text-steel">{k}</dt>
            </div>
          ))}
        </dl>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0 space-y-14">
          {career.description && (
            <Section title="About This Career">
              <p className="max-w-prose whitespace-pre-line text-lg leading-relaxed">{career.description}</p>
            </Section>
          )}

          {career.day_in_life && (
            <Section title="A Day in the Life">
              <p className="max-w-prose whitespace-pre-line leading-relaxed">{career.day_in_life}</p>
            </Section>
          )}

          {career.skills && <Section title="Key Skills"><Chips items={lines(career.skills)} /></Section>}

          {career.certifications && (
            <Section title="Certifications">
              <ul className="grid gap-2 sm:grid-cols-2">
                {lines(career.certifications).map((c) => (
                  <li key={c} className="flex items-center gap-3 rounded-md border border-line bg-white px-4 py-3 text-sm font-medium">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-signal" aria-hidden>✓</span>{c}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {redSeal.length > 0 && (
            <Section title="Red Seal Requirements by Province">
              {career.red_seal_intro && <p className="max-w-prose leading-relaxed">{career.red_seal_intro}</p>}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-signal" aria-hidden />Compulsory (certification required to work)</span>
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-navy/40" aria-hidden />Voluntary (certification available but not required)</span>
              </div>
              <div className="mt-5">{provincePicker}</div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {shownSeal.map(([prov, status, duration, hours, note, authority, url]) => {
                  const compulsory = (status ?? "").toLowerCase().startsWith("compulsory");
                  return (
                    <li key={prov} className={`rounded-lg border bg-white p-4 ${compulsory ? "border-l-4 border-l-signal border-y-line border-r-line" : "border-line"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-ink">{prov}</p>
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${compulsory ? "bg-red-50 text-signal-dark" : "bg-navy-soft text-navy"}`}>{status}</span>
                      </div>
                      <p className="mt-1 text-sm text-steel">{[duration, hours].filter(Boolean).join(" – ")}</p>
                      {note && <p className="mt-2 text-sm leading-relaxed">{note}</p>}
                      {authority && (
                        <p className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
                          <span className="text-steel">{authority}</span>
                          {url && <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-navy hover:underline">Visit <span aria-hidden>↗</span></a>}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
              {career.red_seal_note && <p className="mt-5 rounded-md border border-line bg-paper px-4 py-3 text-sm text-steel"><Linkify text={career.red_seal_note} /></p>}
            </Section>
          )}

          {career.hs_courses && (
            <Section title="Recommended High School Courses">
              <p className="mb-4 text-steel">Taking these courses in high school will give you a head start in this career path:</p>
              <Chips items={lines(career.hs_courses)} tone="bg-emerald-50 text-emerald-800" />
            </Section>
          )}

          {programs.length > 0 && (
            <Section title="Specialized Provincial Programs">
              <p className="max-w-prose leading-relaxed">Many provinces offer programs that let high school students get a head start on careers in the automotive sector through co-op placements, dual credits, and paid work experience. Check what is available in your province:</p>
              <div className="mt-5">{provincePicker}</div>
              {shownPrograms.length === 0 ? (
                <p className="panel px-4 py-4 text-sm text-steel">No programs listed for {province} yet. Ask your school guidance counsellor what’s available.</p>
              ) : (
                <div className="space-y-6">
                  {shownPrograms.map((g) => (
                    <div key={g.province}>
                      <h3 className="font-sans text-lg font-semibold tracking-normal text-ink">{g.province}</h3>
                      <ul className="mt-2 grid gap-3 md:grid-cols-2">
                        {g.items.map((it) => (
                          <li key={it.name} className="rounded-lg border border-line bg-white p-4">
                            <p className="font-semibold text-navy">{it.name}</p>
                            <p className="mt-1 text-sm leading-relaxed text-ink/80">{it.text}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              {career.provincial_programs_note && <p className="mt-5 rounded-md border border-line bg-paper px-4 py-3 text-sm text-steel"><Linkify text={career.provincial_programs_note} /></p>}
            </Section>
          )}

          {(career.education_text || career.education_required || career.training) && (
            <Section title="Education & Training">
              {career.education_required && (
                <p className="mb-3 inline-block rounded-md bg-navy px-3 py-1.5 text-sm font-semibold text-white">Required: {career.education_required}</p>
              )}
              {career.education_text ? (
                <p className="max-w-prose whitespace-pre-line leading-relaxed">{career.education_text}</p>
              ) : (
                <ol className="space-y-3">
                  {lines(career.training).map((t, i) => (
                    <li key={t} className="flex gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy font-display text-lg font-bold text-white">{i + 1}</span>
                      <span className="pt-1">{t}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          )}

          <section id="open-jobs" className="scroll-mt-24">
            <h2 className="text-3xl">Open Jobs</h2>
            {jobs.length ? (
              <>
                <ul className="mt-4 overflow-hidden rounded-md border border-line border-b-0">{jobs.map((j) => <JobRow key={j.id} job={j} />)}</ul>
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

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-5">
            <nav className="panel p-5 text-sm" aria-label="On this page">
              <p className="font-display text-lg font-bold text-navy">On this page</p>
              <ul className="mt-2 space-y-1.5">
                {sections.map((t) => <li key={t}><a href={`#${t === "Open Jobs" ? "open-jobs" : anchor(t)}`} className="text-steel hover:text-navy">{t}</a></li>)}
              </ul>
            </nav>
            <div className="panel border-l-4 border-l-signal p-5">
              <p className="font-display text-lg font-bold text-navy">Training and certification</p>
              <p className="mt-2 text-sm text-steel">I-CAR and AIA Canada offer training that helps people start and grow in this career.</p>
              <a href="https://www.i-car.ca" className="mt-3 inline-block text-sm font-semibold text-navy hover:underline">Explore I-CAR training</a>
            </div>
            {profile?.role === "admin" && <Link to={`/admin/careers?edit=${career.id}`} className="btn-ghost w-full">Edit this career</Link>}
          </div>
        </aside>
      </div>
      {profile?.role === "admin" && (
        <div className="mx-auto max-w-6xl px-4 pb-10 lg:hidden"><Link to={`/admin/careers?edit=${career.id}`} className="btn-ghost w-full">Edit this career</Link></div>
      )}
    </>
  );
}
