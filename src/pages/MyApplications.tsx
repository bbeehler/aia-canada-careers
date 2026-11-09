import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

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
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-4xl">My applications</h1>
      <div className="mt-6">
        {rows === null ? <p className="text-steel">Loading…</p> : rows.length === 0 ? (
          <div className="panel px-5 py-10">
            <p className="font-medium">You haven’t applied to any jobs yet.</p>
            <Link to="/jobs" className="btn-navy mt-4">Find jobs</Link>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-md border border-line bg-white">
            {rows.map((r) => (
              <li key={r.id} className="border-b border-line px-5 py-4 last:border-b-0">
                {r.jobs ? (
                  <Link to={`/jobs/${r.jobs.id}`} className="font-semibold text-navy hover:underline">{r.jobs.title}</Link>
                ) : <span className="font-semibold text-steel">Job no longer listed</span>}
                <p className="text-sm text-steel">
                  {r.jobs?.companies?.name}{r.jobs ? ` – ${r.jobs.city}, ${r.jobs.province}` : ""} – applied {new Date(r.created_at).toLocaleDateString("en-CA")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
