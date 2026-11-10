import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useContent } from "../lib/content";
import { getLang, locale, t } from "../lib/i18n";
import { Link } from "./L";

interface Home {
  employment: { value: number; period: string } | null;
  avg_pay: { annual: number; weekly: number; period: string } | null;
  vehicles: { value: number; year: string } | null;
}

const monthName = (p: string) => new Date(`${p}-01T12:00:00`).toLocaleDateString(locale(), { month: "long", year: "numeric" });

// Live headline numbers under the home page hero, from Statistics Canada (refreshed daily on the server).
export default function HomeStats() {
  const c = useContent();
  const [home, setHome] = useState<Home | null>(null);

  useEffect(() => {
    supabase.from("statcan_wages").select("data").eq("id", "latest").maybeSingle()
      .then(({ data }) => setHome((data?.data as { home?: Home })?.home ?? null));
  }, []);

  if (!home || (!home.employment && !home.avg_pay && !home.vehicles)) return null;
  const fr = getLang() === "fr";
  const num = (n: number) => n.toLocaleString(locale());
  const items = [
    home.employment && {
      value: `${num(Math.floor(home.employment.value / 1000) * 1000)}+`,
      label: c.get("home.stats.employment.label"), caption: c.get("home.stats.employment.caption"),
    },
    home.avg_pay && {
      value: (Math.round(home.avg_pay.annual / 100) * 100).toLocaleString(locale(), { style: "currency", currency: "CAD", maximumFractionDigits: 0 }),
      label: c.get("home.stats.pay.label"), caption: c.get("home.stats.pay.caption"),
    },
    home.vehicles && {
      value: fr ? `${(home.vehicles.value / 1e6).toLocaleString("fr-CA", { maximumFractionDigits: 1 })} millions` : `${(home.vehicles.value / 1e6).toFixed(1)} million`,
      label: c.get("home.stats.vehicles.label"), caption: c.get("home.stats.vehicles.caption"),
    },
  ].filter(Boolean) as { value: string; label: string; caption: string }[];

  const sources = [
    home.employment && t("employment and pay: {month}", { month: monthName(home.employment.period) }),
    home.vehicles && t("vehicles: {year}", { year: home.vehicles.year }),
  ].filter(Boolean).join("; ");

  return (
    <section className="border-b border-line bg-white" aria-label={t("Auto care in Canada by the numbers")}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <dl className="grid gap-6 sm:grid-cols-3 sm:gap-4">
          {items.map((i) => (
            <div key={i.label} className="flex flex-col-reverse justify-end text-center sm:px-3">
              <div>
                <dt className="mt-1 font-semibold text-ink">{i.label}</dt>
                {i.caption && <p className="mt-0.5 text-xs text-steel">{i.caption}</p>}
              </div>
              <dd className="font-display text-4xl font-bold leading-tight text-navy sm:text-5xl">{i.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-center text-xs text-steel">
          {t("Source: Statistics Canada ({sources}). Updated automatically.", { sources })}{" "}
          <Link to="/parents#pay" className="font-medium text-navy underline">{t("See pay by industry")}</Link>
        </p>
      </div>
    </section>
  );
}
