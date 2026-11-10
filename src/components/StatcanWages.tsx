import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface Point { latest: number | null; period: string | null; yoy: number | null }
interface Industry { label: string; naics: string; comparison: boolean; weekly: Point; hourly: Point }
interface Data { latest_period: string | null; regions: { name: string; industries: Industry[] }[] }

const money = (n: number, cents = false) =>
  n.toLocaleString("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
const monthName = (p: string | null) => (p ? new Date(`${p}-01T12:00:00`).toLocaleDateString("en-CA", { month: "long", year: "numeric" }) : "");

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

  if (data === undefined) return <p className="mt-5 text-steel">Loading Statistics Canada figures…</p>;
  if (data === null) return <p className="panel mt-5 px-5 py-6 text-steel">Statistics Canada figures will appear here shortly.</p>;

  const current = data.regions.find((r) => r.name === region) ?? data.regions[0];
  const comparison = current.industries.find((i) => i.comparison);

  return (
    <div className="mt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="sc-region" className="text-sm font-medium">Show:</label>
          <select id="sc-region" className="field sm:w-64" value={region} onChange={(e) => setRegion(e.target.value)}>
            {data.regions.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
          </select>
        </div>
        <p className="text-sm text-steel">Latest month: <strong className="text-ink">{monthName(data.latest_period)}</strong></p>
      </div>

      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        {current.industries.filter((i) => !i.comparison).map((i) => (
          <li key={i.label} className="flex flex-col rounded-lg border border-line bg-white p-5">
            <p className="font-semibold leading-snug text-ink">{i.label}</p>
            {i.weekly.latest != null ? (
              <>
                <p className="mt-3 font-display text-3xl font-bold text-emerald-700">
                  {money(i.weekly.latest)}<span className="ml-1 font-sans text-sm font-medium text-steel">a week</span>
                </p>
                <p className="text-sm text-steel">About {money(Math.round(i.weekly.latest * 52 / 100) * 100)} a year</p>
              </>
            ) : <p className="mt-3 text-sm text-steel">Statistics Canada hasn’t published a figure for {region} this month.</p>}
            <div className="mt-auto flex flex-wrap gap-x-5 gap-y-1 pt-4 text-sm">
              {i.hourly.latest != null && <span><strong>{money(i.hourly.latest, true)}</strong> an hour <span className="text-steel">(hourly-paid staff)</span></span>}
              {i.weekly.yoy != null && (
                <span className={i.weekly.yoy >= 0 ? "text-emerald-700" : "text-signal-dark"}>
                  <span aria-hidden>{i.weekly.yoy >= 0 ? "▲" : "▼"} </span>{Math.abs(i.weekly.yoy)}% <span className="text-steel">vs. a year earlier</span>
                </span>
              )}
            </div>
            {comparison?.weekly.latest != null && i.weekly.latest != null && (
              <p className="mt-2 text-xs text-steel">
                {i.weekly.latest >= comparison.weekly.latest
                  ? `${Math.round((i.weekly.latest / comparison.weekly.latest - 1) * 100)}% above`
                  : `${Math.round((1 - i.weekly.latest / comparison.weekly.latest) * 100)}% below`} the average for all industries in {region}
              </p>
            )}
          </li>
        ))}
      </ul>

      {comparison && comparison.weekly.latest != null && (
        <p className="mt-3 rounded-md border border-line bg-paper px-4 py-3 text-sm">
          <strong>All industries in {region}:</strong> {money(comparison.weekly.latest)} a week
          {comparison.hourly.latest != null && <>, {money(comparison.hourly.latest, true)} an hour for hourly-paid staff</>}.
        </p>
      )}

      <p className="mt-4 text-xs leading-relaxed text-steel">
        Source: Statistics Canada, Survey of Employment, Payrolls and Hours,{" "}
        <a className="underline" href="https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410020301" target="_blank" rel="noopener noreferrer">table 14-10-0203-01</a> (average weekly earnings, all employees) and{" "}
        <a className="underline" href="https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410020501" target="_blank" rel="noopener noreferrer">table 14-10-0205-01</a> (average hourly earnings, employees paid by the hour).
        Figures include overtime and are not seasonally adjusted, so they can move from month to month. Yearly amounts are weekly earnings × 52 and are estimates.
        These are averages across everyone working in each industry, from apprentices to managers.
        {fetchedAt && ` Checked for updates ${new Date(fetchedAt).toLocaleDateString("en-CA", { dateStyle: "medium" })}.`}
      </p>
    </div>
  );
}
