import { useState, type ReactNode } from "react";
import { Link } from "../components/L";
import type { Sector } from "../lib/types";
import { SECTORS } from "../lib/constants";
import { useContent } from "../lib/content";
import EditPageLink from "../components/EditPageLink";
import PageHero, { heroPrimary } from "../components/PageHero";

import { t } from "../lib/i18n";
type Scores = Partial<Record<Sector, number>>;
interface Question { prompt: string; options: { text: string; scores: Scores }[] }

const QUESTIONS: Question[] = [
  {
    prompt: "What kind of work environment appeals to you most?",
    options: [
      { text: "A busy repair shop with different vehicles every day", scores: { mechanical: 2, collision: 1 } },
      { text: "A clean, organized factory with high-tech machinery", scores: { parts_manufacturing: 2 } },
      { text: "Working with customers and coordinating teams", scores: { business_operations: 2 } },
      { text: "A mix of office work and factory floor time", scores: { parts_manufacturing: 1, business_operations: 1 } },
    ],
  },
  {
    prompt: "Which of these do you enjoy most?",
    options: [
      { text: "Figuring out why something isn’t working", scores: { mechanical: 2 } },
      { text: "Making something damaged look brand new", scores: { collision: 2 } },
      { text: "Building or assembling things precisely", scores: { parts_manufacturing: 2 } },
      { text: "Organizing, planning or persuading people", scores: { business_operations: 2 } },
    ],
  },
  {
    prompt: "Which school subjects do you like best?",
    options: [
      { text: "Science, tech or shop class", scores: { mechanical: 1, parts_manufacturing: 1 } },
      { text: "Art and design", scores: { collision: 2 } },
      { text: "Math and computers", scores: { parts_manufacturing: 1, mechanical: 1 } },
      { text: "Business, English or communications", scores: { business_operations: 2 } },
    ],
  },
  {
    prompt: "How do you like to spend your workday?",
    options: [
      { text: "Using my hands most of the day", scores: { mechanical: 1, collision: 1 } },
      { text: "Running machines and equipment", scores: { parts_manufacturing: 2 } },
      { text: "Talking with people, on the phone and at a computer", scores: { business_operations: 2 } },
      { text: "A mix of hands-on work and screen time", scores: { mechanical: 1, business_operations: 1 } },
    ],
  },
  {
    prompt: "Which of these sounds most satisfying?",
    options: [
      { text: "Hearing an engine run right after you fixed it", scores: { mechanical: 2 } },
      { text: "Handing back a car that looks like the crash never happened", scores: { collision: 2 } },
      { text: "Seeing a part you made ship to stores across Canada", scores: { parts_manufacturing: 2 } },
      { text: "Hitting a sales or service goal with your team", scores: { business_operations: 2 } },
    ],
  },
  {
    prompt: "How would you like to start your career?",
    options: [
      { text: "An apprenticeship, so I earn while I learn", scores: { mechanical: 1, collision: 1 } },
      { text: "A college program", scores: { mechanical: 1, parts_manufacturing: 1 } },
      { text: "Start working right after high school", scores: { collision: 1, parts_manufacturing: 1 } },
      { text: "A university degree", scores: { business_operations: 1, parts_manufacturing: 1 } },
    ],
  },
];

const ROLES: Record<Sector, string[]> = {
  mechanical: ["Automotive Service Technician", "Truck and Transport Mechanic", "Diagnostic Technician"],
  collision: ["Collision Repair Technician", "Automotive Refinisher (painter)", "Damage Estimator"],
  parts_manufacturing: ["CNC Machinist", "Assembly Line Technician", "Quality Control Inspector", "Manufacturing Engineer"],
  business_operations: ["Service Advisor", "Shop Manager", "Parts Sales Representative", "Automotive Marketing Coordinator"],
};

export default function Quiz() {
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<number[]>([]);
  const c = useContent();

  const choose = (i: number) => {
    const next = [...answers.slice(0, step), i];
    setAnswers(next);
    setStep(step + 1);
  };

  const hero = (compact: boolean, actions?: ReactNode) => (
    <PageHero compact={compact} tag={c.get("quiz.hero.tag")} title={c.get("quiz.heading")}
      body={compact ? undefined : c.get("quiz.body")} image={c.get("quiz.hero.image") || undefined} actions={actions} />
  );

  if (step === -1) {
    return (
      <>
        {hero(false, <button className={heroPrimary} onClick={() => setStep(0)}>{t("Start the quiz")} <span aria-hidden>→</span></button>)}
        <div className="mx-auto grid max-w-5xl gap-4 px-4 py-14 sm:grid-cols-3">
          {[["6 questions", t("About what you enjoy and how you like to work")], ["2 minutes", t("No account or sign-up needed")], [t("Your best match"), t("Plus real jobs you can explore right away")]].map(([title, d]) => (
            <div key={title} className="panel p-5">
              <p className="font-display text-2xl font-bold text-navy">{t(title)}</p>
              <p className="mt-1 text-sm text-steel">{t(d)}</p>
            </div>
          ))}
        </div>
        <EditPageLink section="quiz" />
      </>
    );
  }

  if (step >= QUESTIONS.length) {
    const totals: Record<Sector, number> = { mechanical: 0, collision: 0, parts_manufacturing: 0, business_operations: 0 };
    answers.forEach((a, qi) => {
      Object.entries(QUESTIONS[qi].options[a].scores).forEach(([k, v]) => { totals[k as Sector] += v ?? 0; });
    });
    const ranked = (Object.keys(totals) as Sector[]).sort((a, b) => totals[b] - totals[a]);
    const [top, second] = ranked;

    return (
      <>
      {hero(true)}
      <div className="mx-auto max-w-3xl px-4 py-14">
        <p className="text-sm font-medium text-signal">{t("Your best match")}</p>
        <h2 className="mt-1 text-5xl">{SECTORS[top].label}</h2>
        <p className="mt-3 text-lg text-steel">{SECTORS[top].blurb}.</p>

        <div className="panel mt-8 p-6">
          <h2 className="text-2xl">{t("Jobs to look into")}</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {ROLES[top].map((r) => <li key={r}><Link to={`/careers?q=${encodeURIComponent(r.split(" (")[0])}`} className="block rounded border border-line px-3 py-2 text-sm hover:border-navy hover:text-navy">{t(r)}</Link></li>)}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={`/jobs?sector=${top}`} className="btn-primary">{t("See {sector} jobs", { sector: SECTORS[top].label.toLowerCase() })}</Link>
            <a href="https://www.i-car.ca" className="btn-ghost">{t("Explore training")}</a>
          </div>
        </div>

        <p className="mt-6 text-steel">
          {t("You also scored well for")} <Link to={`/jobs?sector=${second}`} className="font-semibold text-navy hover:underline">{SECTORS[second].label.toLowerCase()}</Link>.
        </p>
        <button className="mt-6 text-sm font-semibold text-navy underline" onClick={() => { setAnswers([]); setStep(0); }}>
          {t("Retake the quiz")}
        </button>
      </div>
      </>
    );
  }

  const q = QUESTIONS[step];
  return (
    <>
    {hero(true)}
    <div className="mx-auto max-w-2xl px-4 py-14">
      <div className="flex items-center justify-between text-sm text-steel">
        <span>{t("Question {n} of {total}", { n: step + 1, total: QUESTIONS.length })}</span>
        {step > 0 && <button className="hover:text-navy" onClick={() => setStep(step - 1)}>{t("Back")}</button>}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
        <div className="h-full bg-signal transition-all" style={{ width: `${(step / QUESTIONS.length) * 100}%` }} />
      </div>
      <h2 className="mt-8 text-4xl">{t(q.prompt)}</h2>
      <div className="mt-6 space-y-3">
        {q.options.map((o, i) => (
          <button key={o.text} onClick={() => choose(i)}
            className={`panel flex w-full items-center gap-4 px-5 py-4 text-left hover:border-navy ${answers[step] === i ? "border-navy bg-navy-soft" : ""}`}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-navy-soft text-sm font-semibold text-navy">
              {String.fromCharCode(65 + i)}
            </span>
            <span>{t(o.text)}</span>
          </button>
        ))}
      </div>
    </div>
    </>
  );
}
