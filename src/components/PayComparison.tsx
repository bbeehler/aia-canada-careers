import { useEffect, useState } from "react";
import { Link } from "./L";
import { supabase } from "../lib/supabase";
import type { Job } from "../lib/types";

import { getLang, locale, localize, t } from "../lib/i18n";
interface Wage { prov: string; region_code: string; low: number | null; median: number | null; high: number | null; annual: boolean }
const HOURS_PER_YEAR = 2080;
const PROVINCE_NAMES_EN: Record<string, string> = {
  NL: "Newfoundland and Labrador", PE: "Prince Edward Island", NS: "Nova Scotia", NB: "New Brunswick", QC: "Quebec",
  ON: "Ontario", MB: "Manitoba", SK: "Saskatchewan", AB: "Alberta", BC: "British Columbia", YT: "Yukon",
  NT: "the Northwest Territories", NU: "Nunavut",
};
const PROVINCE_NAMES_FR: Record<string, string> = {
  NL: "à Terre-Neuve-et-Labrador", PE: "l’Île-du-Prince-Édouard", NS: "Nouvelle-Écosse", NB: "au Nouveau-Brunswick", QC: "au Québec",
  ON: "Ontario", MB: "au Manitoba", SK: "en Saskatchewan", AB: "en Alberta", BC: "Colombie-Britannique", YT: "au Yukon",
  NT: "les Territoires du Nord-Ouest", NU: "au Nunavut",
};
const money = (n: number, cents: boolean) => n.toLocaleString(locale(), { style: "currency", currency: "CAD", minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });

// "How this pay compares": the posting's pay next to Job Bank wages for the matched career's occupation.
export default function PayComparison({ job }: { job: Job }) {
  const [career, setCareer] = useState<{ slug: string; title: string; noc_code: string } | null>(null);
  const [wage, setWage] = useState<{ row: Wage; place: string } | null>(null);

  useEffect(() => {
    if (!job.career_id) return;
    supabase.from("careers").select("slug, title, noc_code, translations").eq("id", job.career_id).maybeSingle().then(async ({ data: raw }) => {
      const c = raw ? localize(raw) : null;
      if (!c?.noc_code) return;
      setCareer(c);
      const { data: rows } = await supabase.from("jobbank_wages").select("prov, region_code, low, median, high, annual")
        .eq("noc", c.noc_code).in("prov", [job.province, "NAT"]);
      const list = (rows as Wage[]) ?? [];
      const provRow = list.find((r) => r.prov === job.province && r.region_code.length === 4 && r.median);
      const natRow = list.find((r) => r.prov === "NAT" && r.median);
      if (provRow) setWage({ row: provRow, place: job.province });
      else if (natRow) setWage({ row: natRow, place: t("Canada") });
    });
  }, [job.career_id, job.province]);

  if (!career || !wage || wage.row.median == null) return null;

  // Compare in the posting's own unit (hourly or yearly)
  const yearly = job.pay_period === "year";
  const conv = (n: number | null) => n == null ? null : wage.row.annual === yearly ? n : yearly ? n * HOURS_PER_YEAR : n / HOURS_PER_YEAR;
  const low = conv(wage.row.low), median = conv(wage.row.median)!, high = conv(wage.row.high);
  const mid = (Number(job.pay_min) + Number(job.pay_max)) / 2;
  const diff = Math.round(((mid - median) / median) * 100);
  const verdict = Math.abs(diff) <= 5 ? t("in line with") : diff > 0 ? t("about {pct}% above", { pct: diff }) : t("about {pct}% below", { pct: Math.abs(diff) });
  const fr = getLang() === "fr";
  const placeName = wage.place === "Canada" ? (fr ? "au Canada" : "Canada") : fr
    ? (/^(au |en |à |l’|les )/.test(PROVINCE_NAMES_FR[wage.place] ?? "") ? PROVINCE_NAMES_FR[wage.place] : `en ${PROVINCE_NAMES_FR[wage.place] ?? wage.place}`).replace(/^l’/, "à l’").replace(/^les /, "dans les ")
    : PROVINCE_NAMES_EN[wage.place] ?? wage.place;
  const fmt = (n: number) => money(yearly ? Math.round(n / 100) * 100 : n, !yearly);
  const unit = yearly ? t("a year") : t("an hour");

  const scaleMax = Math.max(high ?? median, Number(job.pay_max)) * 1.05;
  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / scaleMax) * 100))}%`;

  return (
    <section className="mt-8 rounded-lg border border-line bg-white p-5" aria-labelledby="pay-compare">
      <h2 id="pay-compare" className="font-sans text-lg font-semibold tracking-normal text-ink">{t("How this pay compares")}</h2>
      <p className="mt-1 text-sm text-steel">
        {t("This job’s pay is")} <strong className="text-ink">{verdict}</strong> {t("the typical wage for {career} roles in {place}.", { career: career.title, place: placeName })}
      </p>

      <div className="relative mt-6 h-10" aria-hidden>
        <div className="absolute top-4 h-2 w-full rounded-full bg-line" />
        {low != null && high != null && <div className="absolute top-4 h-2 rounded-full bg-emerald-200" style={{ left: pct(low), width: `calc(${pct(high)} - ${pct(low)})` }} />}
        <div className="absolute top-2.5 h-5 w-1.5 -translate-x-1/2 rounded bg-emerald-700" style={{ left: pct(median) }} />
        <div className="absolute top-3 h-4 rounded border-2 border-navy bg-navy/20" style={{ left: pct(Number(job.pay_min)), width: `max(8px, calc(${pct(Number(job.pay_max))} - ${pct(Number(job.pay_min))}))` }} />
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-steel">{t("This job")}</dt><dd className="font-semibold text-navy">{fmt(Number(job.pay_min))}{Number(job.pay_max) !== Number(job.pay_min) && `–${fmt(Number(job.pay_max))}`}</dd></div>
        <div><dt className="text-xs text-steel">{t("Typical low")}</dt><dd className="font-semibold">{low != null ? fmt(low) : "–"}</dd></div>
        <div><dt className="text-xs text-steel">{t("Median")}</dt><dd className="font-semibold text-emerald-700">{fmt(median)}</dd></div>
        <div><dt className="text-xs text-steel">{t("Typical high")}</dt><dd className="font-semibold">{high != null ? fmt(high) : "–"}</dd></div>
      </dl>
      <p className="mt-3 text-xs text-steel">
        {t("All amounts {unit}.", { unit })} {t("Typical wages are from Job Bank, Government of Canada, for {place}", { place: wage.place === "Canada" ? t("all of Canada") : placeName.replace(/^(au |en |à |dans )/, "") })}
        {wage.row.annual !== yearly && t(", converted at {hours} hours a year", { hours: HOURS_PER_YEAR.toLocaleString(locale()) })}. {t("They don’t include benefits, and pay depends on experience and certification.")}{" "}
        <Link to={`/careers/${career.slug}#wages-in-your-area`} className="font-semibold text-navy hover:underline">{t("More about this career and its wages")}</Link>
      </p>
    </section>
  );
}
