import { useEffect, useState } from "react";
import { Link } from "../components/L";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import PageHero from "../components/PageHero";

import { locale, t } from "../lib/i18n";
interface Row { id: string; created_at: string; jobs: { id: string; title: string; city: string; province: string; companies: { name: string } | null } | null }

export default function MyApplications() {
  const { session } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase.from("applications").select("id, created_at, jobs(id, title, city, province, companies(name))")
      .eq("candidate_id", session.user.id).order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as unknown as Row[]) ?? []));
  }, [session]);

  return (
    <>
    <PageHero compact tag={t("Job seeker")} title={t("My applications")} body={t("Jobs you’ve applied to through Careers in Auto Care. Employers contact you directly.")} />
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div>
        {rows === null ? <p className="text-steel">{t("Loading…")}</p> : rows.length === 0 ? (
          <div className="panel px-5 py-10">
            <p className="font-medium">{t("You haven’t applied to any jobs yet.")}</p>
            <Link to="/jobs" className="btn-navy mt-4">{t("Find jobs")}</Link>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-md border border-line bg-white">
            {rows.map((r) => (
              <li key={r.id} className="border-b border-line px-5 py-4 last:border-b-0">
                {r.jobs ? (
                  <Link to={`/jobs/${r.jobs.id}`} className="font-semibold text-navy hover:underline">{r.jobs.title}</Link>
                ) : <span className="font-semibold text-steel">{t("Job no longer listed")}</span>}
                <p className="text-sm text-steel">
                  {r.jobs?.companies?.name}{r.jobs ? ` – ${r.jobs.city}, ${r.jobs.province}` : ""} – {t("applied")} {new Date(r.created_at).toLocaleDateString(locale())}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
    </>
  );
}
