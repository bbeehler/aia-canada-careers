import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

import { getLang, locale, t } from "../lib/i18n";
interface Point { latest: number | null; period: string | null; yoy: number | null }
interface Industry { label: string; label_fr?: string; naics: string; comparison: boolean; weekly: Point; hourly: Point }
interface Data { latest_period: string | null; regions: { name: string; industries: Industry[] }[] }

const money = (n: number, cents = false) =>
  n.toLocaleString(locale(), { style: "currency", currency: "CAD", minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
const INDUSTRY_FR: Record<string, string> = {
  "Automotive repair and maintenance": "Réparation et entretien de véhicules automobiles",
  "Automotive parts, accessories and tire retailers": "Détaillants de pièces, de pneus et d’accessoires pour véhicules automobiles",
  "New motor vehicle parts and accessories merchant wholesalers": "Grossistes-marchands de pièces et d’accessoires neufs pour véhicules automobiles",
  "Motor vehicle parts manufacturing": "Fabrication de pièces pour véhicules automobiles",
  "All industries (for comparison)": "Toutes les industries (à titre de comparaison)",
};
const REGION_FR: Record<string, string> = {
  "Newfoundland and Labrador": "Terre-Neuve-et-Labrador", "Prince Edward Island": "Île-du-Prince-Édouard", "Nova Scotia": "Nouvelle-Écosse",
  "New Brunswick": "Nouveau-Brunswick", Quebec: "Québec", "British Columbia": "Colombie-Britannique", "Northwest Territories": "Territoires du Nord-Ouest",
};
const indName = (i: Industry) => (getLang() === "fr" ? INDUSTRY_FR[i.label] ?? i.label : i.label);
const regName = (r: string) => (getLang() === "fr" ? REGION_FR[r] ?? r : r);
const monthName = (p: string | null) => (p ? new Date(`${p}-01T12:00:00`).toLocaleDateString(locale(), { month: "long", year: "numeric" }) : "");

// Average earnings in auto care industries, from Statistics Canada (refreshed daily on the server).
export default function StatcanWages() {
  const [data, setData] = useState<Data | null | undefined>(undefined);
  const [fetchedAt, setFetchedAt] = useState("");
  const [region, setRegion] = useState("Canada");

  useEffect(() => {
    supabase.from("statcan_wages").select("data, fetched_at").eq("id", "latest").maybeSingle().then(({ data: row }) => {
      setData((row?.data as Data) ?? null);
      setFetchedAt(row?.fetched_at ?? "");
    });
  }, []);

  if (data === undefined) return <p className="mt-5 text-steel">{t("Loading Statistics Canada figures…")}</p>;
  if (data === null) return <p className="panel mt-5 px-5 py-6 text-steel">{t("Statistics Canada figures will appear here shortly.")}</p>;

  const current = data.regions.find((r) => r.name === region) ?? data.regions[0];
  const comparison = current.industries.find((i) => i.comparison);

  return (
    <div className="mt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="sc-region" className="text-sm font-medium">{t("Show:")}</label>
          <select id="sc-region" className="field sm:w-64" value={region} onChange={(e) => setRegion(e.target.value)}>
            {data.regions.map((r) => <option key={r.name} value={r.name}>{regName(r.name)}</option>)}
          </select>
        </div>
        <p className="text-sm text-steel">{t("Latest month:")} <strong className="text-ink">{monthName(data.latest_period)}</strong></p>
      </div>

      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        {current.industries.filter((i) => !i.comparison).map((i) => (
          <li key={i.label} className="flex flex-col rounded-lg border border-line bg-white p-5">
            <p className="font-semibold leading-snug text-ink">{indName(i)}</p>
            {i.weekly.latest != null ? (
              <>
                <p className="mt-3 font-display text-3xl font-bold text-emerald-700">
                  {money(i.weekly.latest)}<span className="ml-1 font-sans text-sm font-medium text-steel">{t("a week")}</span>
                </p>
                <p className="text-sm text-steel">{t("About {amount} a year", { amount: money(Math.round(i.weekly.latest * 52 / 100) * 100) })}</p>
              </>
            ) : <p className="mt-3 text-sm text-steel">{t("Statistics Canada hasn’t published a figure for {place} this month.", { place: regName(region) })}</p>}
            <div className="mt-auto flex flex-wrap gap-x-5 gap-y-1 pt-4 text-sm">
              {i.hourly.latest != null && <span><strong>{money(i.hourly.latest, true)}</strong> {t("an hour")} <span className="text-steel">{t("(hourly-paid staff)")}</span></span>}
              {i.weekly.yoy != null && (
                <span className={i.weekly.yoy >= 0 ? "text-emerald-700" : "text-signal-dark"}>
                  <span aria-hidden>{i.weekly.yoy >= 0 ? "▲" : "▼"} </span>{Math.abs(i.weekly.yoy)}% <span className="text-steel">{t("vs. a year earlier")}</span>
                </span>
              )}
            </div>
            {comparison?.weekly.latest != null && i.weekly.latest != null && (
              <p className="mt-2 text-xs text-steel">
                {i.weekly.latest >= comparison.weekly.latest
                  ? t("{pct}% above the average for all industries in {place}", { pct: Math.round((i.weekly.latest / comparison.weekly.latest - 1) * 100), place: regName(region) })
                  : t("{pct}% below the average for all industries in {place}", { pct: Math.round((1 - i.weekly.latest / comparison.weekly.latest) * 100), place: regName(region) })}
              </p>
            )}
          </li>
        ))}
      </ul>

      {comparison && comparison.weekly.latest != null && (
        <p className="mt-3 rounded-md border border-line bg-paper px-4 py-3 text-sm">
          <strong>{t("All industries in {place}:", { place: regName(region) })}</strong> {money(comparison.weekly.latest)} {t("a week")}
          {comparison.hourly.latest != null && <>, {money(comparison.hourly.latest, true)} {t("an hour for hourly-paid staff")}</>}.
        </p>
      )}

      <p className="mt-4 text-xs leading-relaxed text-steel">
        {t("Source: Statistics Canada, Survey of Employment, Payrolls and Hours,")}{" "}
        <a className="underline" href={`https://www150.statcan.gc.ca/t1/tbl1/${getLang()}/tv.action?pid=1410020301`} target="_blank" rel="noopener noreferrer">{t("table 14-10-0203-01")}</a> {t("(average weekly earnings, all employees) and")}{" "}
        <a className="underline" href={`https://www150.statcan.gc.ca/t1/tbl1/${getLang()}/tv.action?pid=1410020501`} target="_blank" rel="noopener noreferrer">{t("table 14-10-0205-01")}</a> {t("(average hourly earnings, employees paid by the hour).")}{" "}
        {t("Figures include overtime and are not seasonally adjusted, so they can move from month to month. Yearly amounts are weekly earnings × 52 and are estimates.")}{" "}
        {t("These are averages across everyone working in each industry, from apprentices to managers.")}
        {fetchedAt && " " + t("Checked for updates {date}.", { date: new Date(fetchedAt).toLocaleDateString(locale(), { dateStyle: "medium" }) })}
      </p>
    </div>
  );
}
