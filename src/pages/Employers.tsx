import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Highlighted, useContent } from "../lib/content";
import EditPageLink from "../components/EditPageLink";
import PageHero, { heroPrimary } from "../components/PageHero";

export default function Employers() {
  const { profile } = useAuth();
  const c = useContent();
  const start = profile?.role === "employer" ? "/employer/jobs/new" : "/sign-in?mode=sign-up&as=employer";
  return (
    <>
      <PageHero
        tag={c.get("employers.hero.tag")}
        title={<Highlighted text={c.get("employers.headline")} />}
        body={c.get("employers.body")}
        image={c.get("employers.hero.image") || undefined}
        actions={<Link to={start} className={heroPrimary}>Post a job <span aria-hidden>→</span></Link>}
      />
      <section className="mx-auto grid max-w-6xl gap-px overflow-hidden px-4 py-12 md:grid-cols-2">
        <div className="panel rounded-r-none p-6 md:border-r-0">
          <p className="font-display text-3xl font-bold text-navy">AIA Canada members</p>
          <p className="mt-1 font-display text-5xl font-bold text-signal">{c.get("employers.members.price")}</p>
          <p className="mt-3 text-steel">{c.get("employers.members.text")}</p>
        </div>
        <div className="panel rounded-l-none p-6">
          <p className="font-display text-3xl font-bold text-navy">Non-members</p>
          <p className="mt-1 font-display text-5xl font-bold text-navy">{c.get("employers.nonmembers.price")}</p>
          <p className="mt-3 text-steel">{c.get("employers.nonmembers.text")}</p>
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
      <EditPageLink section="employers" />
    </>
  );
}
