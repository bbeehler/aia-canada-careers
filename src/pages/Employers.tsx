import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Employers() {
  const { profile } = useAuth();
  const start = profile?.role === "employer" ? "/employer/jobs/new" : "/sign-in?mode=sign-up&as=employer";
  return (
    <>
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h1 className="max-w-2xl font-display text-6xl font-bold leading-[0.95] text-white">Hire from the people who chose this industry.</h1>
          <p className="mt-5 max-w-xl text-lg text-white/80">
            Everyone searching here is looking for work in auto care. Post your opening in a few minutes and manage applications in one place.
          </p>
          <Link to={start} className="btn-primary mt-8">Post a job</Link>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-px overflow-hidden px-4 py-12 md:grid-cols-2">
        <div className="panel rounded-r-none p-6 md:border-r-0">
          <p className="font-display text-3xl font-bold text-navy">AIA Canada members</p>
          <p className="mt-1 font-display text-5xl font-bold text-signal">Free</p>
          <p className="mt-3 text-steel">Unlimited postings for every location of a member company. Each posting runs 30 days.</p>
        </div>
        <div className="panel rounded-l-none p-6">
          <p className="font-display text-3xl font-bold text-navy">Non-members</p>
          <p className="mt-1 font-display text-5xl font-bold text-navy">Per posting</p>
          <p className="mt-3 text-steel">Pay a flat fee for each 30-day posting. Becoming a member makes every posting free.</p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <h2 className="text-3xl">How posting works</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            ["Create your account", "Sign up with your work email and add your company."],
            ["Write your posting", "Include the pay range, job details and how you want people to apply."],
            ["Go live", "AIA Canada reviews each posting, usually within one business day."],
          ].map(([t, d], i) => (
            <li key={t} className="panel p-5">
              <p className="font-display text-4xl font-bold text-signal">{i + 1}</p>
              <p className="mt-2 font-semibold">{t}</p>
              <p className="mt-1 text-sm text-steel">{d}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
