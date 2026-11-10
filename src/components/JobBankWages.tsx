import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { getLang, locale, t } from "../lib/i18n";

interface Row {
  noc: string; noc_title: string; noc_title_fr?: string | null; region_name_fr?: string | null; prov: string; region_code: string; region_name: string;
  low: number | null; median: number | null; high: number | null; annual: boolean; reference_period: string | null; revised: string | null;
}
const PROVINCES_EN: Record<string, string> = {
  NAT: "Canada", NL: "Newfoundland and Labrador", PE: "Prince Edward Island", NS: "Nova Scotia", NB: "New Brunswick",
  QC: "Quebec", ON: "Ontario", MB: "Manitoba", SK: "Saskatchewan", AB: "Alberta", BC: "British Columbia",
  YT: "Yukon", NT: "Northwest Territories", NU: "Nunavut",
};
const PROVINCES_FR: Record<string, string> = {
  NAT: "Canada", NL: "Terre-Neuve-et-Labrador", PE: "Île-du-Prince-Édouard", NS: "Nouvelle-Écosse", NB: "Nouveau-Brunswick",
  QC: "Québec", ON: "Ontario", MB: "Manitoba", SK: "Saskatchewan", AB: "Alberta", BC: "Colombie-Britannique",
  YT: "Yukon", NT: "Territoires du Nord-Ouest", NU: "Nunavut",
};
const provName = (p: string) => (getLang() === "fr" ? PROVINCES_FR : PROVINCES_EN)[p];
const ORDER = Object.keys(PROVINCES_EN);
const regionName = (r: Row) => tidy(getLang() === "fr" && r.region_name_fr ? r.region_name_fr : r.region_name);
const tidy = (s: string) => s.replace(/--/g, " – ");
const money = (n: number, cents = true) => n.toLocaleString(locale(), { style: "currency", currency: "CAD", minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });

// Low, median and high wages for one occupation from Job Bank, by province and economic region.
export default function JobBankWages({ noc }: { noc: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [published, setPublished] = useState<string | null>(null);
  const [prov, setProv] = useState("NAT");
  const [region, setRegion] = useState("");

  useEffect(() => {
    supabase.from("jobbank_wages").select("*").eq("noc", noc).then(({ data }) => setRows((data as Row[]) ?? []));
    supabase.from("jobbank_meta").select("published").eq("id", "latest").maybeSingle().then(({ data }) => setPublished(data?.published ?? null));
  }, [noc]);

  const provinceRow = (p: string) => (rows ?? []).find((r) => r.prov === p && (p === "NAT" ? r.region_code === "ER00" : r.region_code.length === 4));
  const provinces = useMemo(() => ORDER.filter((p) => provinceRow(p)), [rows]);
  const regions = useMemo(() => (rows ?? []).filter((r) => r.prov === prov && r.region_code.length > 4).sort((a, b) => regionName(a).localeCompare(regionName(b), locale())), [rows, prov]);

  if (!rows || rows.length === 0) return null;
  const row = (region && regions.find((r) => r.region_code === region)) || provinceRow(prov) || provinceRow("NAT");
  if (!row || row.median == null) return null;
  const place = region ? regionName(row) : provName(row.prov);
  const unit = row.annual ? t("a year") : t("an hour");
  const title = getLang() === "fr" && row.noc_title_fr ? row.noc_title_fr : row.noc_title;
  const fmt = (n: number) => money(n, !row.annual);
  const max = row.high ?? row.median;
  const pos = (n: number | null) => (n == null || !max ? 0 : Math.max(0, Math.min(100, (n / max) * 100)));

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="jb-prov" className="label">{t("Province or territory")}</label>
          <select id="jb-prov" className="field" value={prov} onChange={(e) => { setProv(e.target.value); setRegion(""); }}>
            {provinces.map((p) => <option key={p} value={p}>{provName(p)}</option>)}
          </select>
        </div>
        {regions.length > 0 && (
          <div>
            <label htmlFor="jb-region" className="label">{t("Region")}</label>
            <select id="jb-region" className="field" value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">{t("All of {place}", { place: provName(prov) })}</option>
              {regions.map((r) => <option key={r.region_code} value={r.region_code}>{regionName(r)}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="mt-5 rounded-lg border border-line bg-white p-5">
        <p className="text-sm text-steel">{t("Typical wages in")} <strong className="text-ink">{place}</strong></p>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
          {([[t("Low"), row.low], [t("Median"), row.median], [t("High"), row.high]] as const).map(([k, v]) => (
            <div key={k} className={k === t("Median") ? "rounded-md bg-emerald-50 py-3" : "py-3"}>
              <dt className="text-xs font-medium uppercase tracking-wide text-steel">{k}</dt>
              <dd className={`mt-1 font-display font-bold ${k === t("Median") ? "text-3xl text-emerald-700" : "text-2xl text-navy"}`}>{v != null ? fmt(v) : "–"}</dd>
              <dd className="text-xs text-steel">{unit}</dd>
            </div>
          ))}
        </dl>
        <div className="relative mt-4 h-2 rounded-full bg-line" aria-hidden>
          <div className="absolute h-2 rounded-full bg-emerald-200" style={{ left: `${pos(row.low)}%`, right: `${100 - pos(row.high)}%` }} />
          <div className="absolute -top-1 h-4 w-1.5 -translate-x-1/2 rounded bg-emerald-700" style={{ left: `${pos(row.median)}%` }} />
        </div>
        {!row.annual && (
          <p className="mt-4 text-sm">
            {t("Full-time, the median works out to about")} <strong>{t("{amount} a year", { amount: money(Math.round(row.median * 2080 / 100) * 100, false) })}</strong>
            {row.low != null && row.high != null && <> {t("(about {low} to {high})", { low: money(Math.round(row.low * 2080 / 1000) * 1000, false), high: money(Math.round(row.high * 2080 / 1000) * 1000, false) })}</>}.
          </p>
        )}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-steel">
        {t("Source: Job Bank, Government of Canada, wages for {title} (NOC {noc}).", { title, noc: row.noc })}{" "}
        {t("The low wage is roughly what the lowest-paid 10% earn and the high wage what the top 10% earn; the median is the middle.")}
        {row.reference_period && " " + t("Based on {period} data", { period: row.reference_period })}{published && t(", published {date}", { date: new Date(published).toLocaleDateString(locale(), { dateStyle: "medium" }) })}.
        {!row.annual && " " + t("Yearly amounts assume 40 hours a week, 52 weeks a year.")} {t("Updated automatically when Job Bank publishes new wages each fall.")}{" "}
        <a href={getLang() === "fr" ? "https://www.guichetemplois.gc.ca/analyse-tendances/recherche-salaires" : "https://www.jobbank.gc.ca/trend-analysis/search-wages"} target="_blank" rel="noopener noreferrer" className="underline">{t("Explore more on Job Bank")}</a>
      </p>
    </div>
  );
}
