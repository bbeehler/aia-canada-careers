import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Highlighted, useContent } from "../lib/content";
import { SECTORS, formatPay } from "../lib/constants";
import type { PayPeriod, Sector } from "../lib/types";
import EditPageLink from "../components/EditPageLink";
import PageHero, { heroPrimary, heroSecondary } from "../components/PageHero";

interface PayRow { sector: Sector; pay_min: number; pay_max: number; pay_period: PayPeriod }
interface Range { min: number; max: number; count: number }

export default function Parents() {
  const c = useContent();
  const { hash } = useLocation();
  const [ranges, setRanges] = useState<Record<string, Range> | null>(null);

  useEffect(() => {
    supabase.from("jobs").select("sector, pay_min, pay_max, pay_period")
      .eq("status", "published").gt("expires_at", new Date().toISOString())
      .then(({ data }) => {
        const out: Record<string, Range> = {};
        ((data as PayRow[]) ?? []).forEach((r) => {
          const k = `${r.sector}|${r.pay_period}`;
          const cur = out[k] ?? { min: Infinity, max: 0, count: 0 };
          out[k] = { min: Math.min(cur.min, Number(r.pay_min)), max: Math.max(cur.max, Number(r.pay_max)), count: cur.count + 1 };
        });
        setRanges(out);
      });
  }, []);

  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 150);
  }, [hash]);

  const rows = ranges ? (Object.keys(SECTORS) as Sector[]).flatMap((s) =>
    (["hour", "year"] as PayPeriod[]).filter((p) => ranges[`${s}|${p}`]).map((p) => ({ s, p, r: ranges[`${s}|${p}`] }))) : [];

  return (
    <>
    <PageHero
      tag={c.get("parents.hero.tag")}
      title={<Highlighted text={c.get("parents.heading")} />}
      body={c.get("parents.intro")}
      image={c.get("parents.hero.image") || undefined}
      actions={<>
        <a href="#pay" className={heroPrimary}>What jobs pay</a>
        <Link to="/quiz" className={heroSecondary}>Take the Career Quiz</Link>
      </>}
    />
    <div className="mx-auto max-w-4xl px-4 py-12">
      <section>
        <h2 className="text-3xl">{c.get("parents.training.heading")}</h2>
        <p className="mt-3 max-w-prose whitespace-pre-line leading-relaxed">{c.get("parents.training.body")}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/quiz" className="btn-navy">Take the Career Quiz together</Link>
          <a href="https://www.i-car.ca" className="btn-ghost">Explore I-CAR training</a>
        </div>
      </section>

      <section id="pay" className="mt-14 scroll-mt-6">
        <h2 className="text-3xl">{c.get("parents.pay.heading")}</h2>
        <p className="mt-3 max-w-prose text-steel">{c.get("parents.pay.body")}</p>
        {ranges === null ? (
          <p className="mt-5 text-steel">Loading pay ranges…</p>
        ) : rows.length === 0 ? (
          <p className="panel mt-5 px-5 py-6 text-steel">Pay ranges will appear here as employers post jobs.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse overflow-hidden rounded-md border border-line bg-white text-sm">
              <thead className="bg-paper text-left text-steel">
                <tr>
                  <th className="px-4 py-3 font-medium">Career area</th>
                  <th className="px-4 py-3 font-medium">Pay range in current postings</th>
                  <th className="px-4 py-3 font-medium">Open jobs</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ s, p, r }) => (
                  <tr key={`${s}${p}`} className="border-t border-line">
                    <td className="px-4 py-3 font-medium">{SECTORS[s].label}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">{formatPay(r.min, r.max, p)}</td>
                    <td className="px-4 py-3"><Link to={`/jobs?sector=${s}`} className="text-navy hover:underline">{r.count}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="text-3xl">{c.get("parents.market.heading")}</h2>
        <p className="mt-3 max-w-prose leading-relaxed">{c.get("parents.market.body")}</p>
        <Link to="/jobs" className="btn-primary mt-5">Browse open jobs</Link>
      </section>
      <EditPageLink section="parents" />
    </div>
    </>
  );
}
