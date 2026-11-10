import type { ReactNode } from "react";
import { Link } from "../components/L";
import { Bold, Highlighted, useContent } from "../lib/content";
import SmartLink from "../components/SmartLink";
import EditPageLink from "../components/EditPageLink";
import PageHero, { heroPrimary, heroSecondary } from "../components/PageHero";

import { t } from "../lib/i18n";
const STEP_COLOURS = [
  { dot: "bg-navy-soft text-navy", chip: "bg-navy-soft text-navy" },
  { dot: "bg-violet-100 text-violet-800", chip: "bg-violet-50 text-violet-800" },
  { dot: "bg-amber-100 text-amber-800", chip: "bg-amber-50 text-amber-800" },
  { dot: "bg-emerald-100 text-emerald-800", chip: "bg-emerald-50 text-emerald-800" },
  { dot: "bg-red-100 text-signal-dark", chip: "bg-red-50 text-signal-dark" },
];

function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-block rounded border border-line bg-white px-2.5 py-0.5 text-xs font-semibold text-steel">{children}</span>;
}

function SectionIntro({ tag, heading, intro }: { tag: string; heading: string; intro: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Tag>{tag}</Tag>
      <h2 className="mt-3 text-4xl sm:text-5xl"><Highlighted text={heading} className="text-signal" /></h2>
      <p className="mt-3 text-lg text-steel">{intro}</p>
    </div>
  );
}

const check = (tone: string) => (
  <svg viewBox="0 0 20 20" className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} aria-hidden>
    <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export default function About() {
  const c = useContent();
  const stats = c.rows("about.stats");
  const steps = c.rows("about.chain.steps");
  const cards = c.rows("about.growth.cards");
  const paragraphs = c.get("about.overview.body").split(/\n\s*\n/).filter(Boolean);

  return (
    <>
      <PageHero
        tag={c.get("about.hero.tag")}
        title={<Highlighted text={c.get("about.hero.heading")} />}
        body={c.get("about.hero.body")}
        image={c.get("about.hero.image") || undefined}
        actions={<>
          <Link to="/careers" className={heroPrimary}>{t("Explore Careers")} <span aria-hidden>→</span></Link>
          <Link to="/quiz" className={heroSecondary}>{t("Take the Career Quiz")}</Link>
        </>}
      />
      {/* Numbers strip */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-2 gap-y-8 px-4 py-10 lg:grid-cols-4">
          {stats.map(([value, label, caption]) => (
            <div key={label} className="px-3 text-center">
              <p className="font-display text-3xl font-bold leading-tight text-navy sm:text-5xl">{value}</p>
              <p className="mt-1 font-semibold text-ink">{label}</p>
              {caption && <p className="mt-0.5 text-xs text-steel">{caption}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Overview */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Tag>{c.get("about.overview.tag")}</Tag>
        <h2 className="mt-3 text-4xl sm:text-5xl"><Highlighted text={c.get("about.overview.heading")} className="text-signal" /></h2>
        {paragraphs.map((p, i) => (
          <p key={i} className={`mt-4 text-lg leading-relaxed ${i === 0 ? "text-ink" : "text-steel"}`}>
            <Bold text={p} className="font-semibold text-ink" />
          </p>
        ))}
      </section>

      {/* Dealership vs independent */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <SectionIntro tag={c.get("about.compare.tag")} heading={c.get("about.compare.heading")} intro={c.get("about.compare.intro")} />
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-line bg-paper p-6">
              <p className="font-sans text-xl font-semibold text-ink">{c.get("about.dealer.title")}</p>
              <p className="text-sm text-steel">{c.get("about.dealer.subtitle")}</p>
              <p className="mt-3 text-sm leading-relaxed text-ink/80">{c.get("about.dealer.text")}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {c.list("about.dealer.points").map((pt) => <li key={pt} className="flex gap-2">{check("text-navy/60")}{pt}</li>)}
              </ul>
            </div>
            <div className="rounded-lg border-2 border-navy/25 bg-white p-6">
              <p className="font-sans text-xl font-semibold text-ink">{c.get("about.indie.title")}</p>
              <span className="mt-1 inline-block rounded bg-navy-soft px-2 py-0.5 text-xs font-semibold text-navy">{c.get("about.indie.badge")}</span>
              <p className="mt-3 text-sm leading-relaxed text-ink/80">{c.get("about.indie.text")}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {c.list("about.indie.points").map((pt) => <li key={pt} className="flex gap-2">{check("text-emerald-600")}{pt}</li>)}
              </ul>
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-3xl rounded-md border border-line bg-paper px-5 py-4 text-center text-sm text-steel">
            <Bold text={c.get("about.goodnews")} className="font-semibold text-ink" />
          </p>
        </div>
      </section>

      {/* Supply chain */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <SectionIntro tag={c.get("about.chain.tag")} heading={c.get("about.chain.heading")} intro={c.get("about.chain.intro")} />
        <ol className="mt-10 space-y-4">
          {steps.map(([title, text, examples], i) => {
            const colour = STEP_COLOURS[i % STEP_COLOURS.length];
            return (
              <li key={title} className="relative grid grid-cols-[2.5rem_1fr] gap-4">
                <div className="flex flex-col items-center">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full font-display text-lg font-bold ${colour.dot}`}>{i + 1}</span>
                  {i < steps.length - 1 && <span className="mt-2 w-px flex-1 bg-line" aria-hidden />}
                </div>
                <div className="panel p-5">
                  <p className="font-semibold text-ink">{title} <span className="ml-1 rounded border border-line px-1.5 py-0.5 text-xs font-medium text-steel">{t("Step {n}", { n: i + 1 })}</span></p>
                  {text && <p className="mt-2 text-sm leading-relaxed text-ink/80">{text}</p>}
                  {examples && (
                    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t("Examples")}>
                      {examples.split(",").map((e) => e.trim()).filter(Boolean).map((e) => (
                        <li key={e} className={`rounded px-2 py-0.5 text-xs font-medium ${colour.chip}`}>{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Growing industry */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <SectionIntro tag={c.get("about.growth.tag")} heading={c.get("about.growth.heading")} intro={c.get("about.growth.intro")} />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(([title, text]) => (
              <div key={title} className="rounded-lg border border-line bg-paper p-5">
                <span className="block h-1 w-10 rounded bg-signal" aria-hidden />
                <p className="mt-4 font-semibold text-ink">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-steel">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h2 className="text-4xl sm:text-5xl"><Highlighted text={c.get("about.cta.heading")} className="text-signal" /></h2>
        <p className="mt-3 text-lg text-steel">{c.get("about.cta.body")}</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link to="/careers" className="btn-navy px-5 py-3">{t("Explore All Careers")} <span aria-hidden>→</span></Link>
          <Link to="/quiz" className="btn-ghost px-5 py-3">{t("Take the Career Quiz")}</Link>
          <SmartLink to={c.get("about.cta.link.url")} className="btn px-4 py-3 text-navy hover:underline">{c.get("about.cta.link.label")}</SmartLink>
        </div>
      </section>
      <EditPageLink section="about.hero" />
    </>
  );
}
