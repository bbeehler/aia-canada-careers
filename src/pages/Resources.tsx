import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { Highlighted, useContent } from "../lib/content";
import type { Audience, Resource, ResourceKind } from "../lib/types";
import PageHero from "../components/PageHero";
import SmartLink from "../components/SmartLink";
import EditPageLink from "../components/EditPageLink";

export const KIND_LABEL: Record<ResourceKind, string> = { organization: "Organization", website: "Website", program: "Program", guide: "Guide" };
export const AUDIENCE_LABEL: Record<Audience, string> = { students: "Students", parents: "Parents", both: "Students & Parents" };
const TABS: ["" | Audience, string][] = [["", "All"], ["students", "Students"], ["parents", "Parents"], ["both", "Students & Parents"]];

const icon = "h-5 w-5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]";
function KindIcon({ kind }: { kind: ResourceKind }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-navy-soft text-navy" aria-hidden>
      {kind === "organization" ? (
        <svg viewBox="0 0 24 24" className={icon}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" /></svg>
      ) : kind === "program" ? (
        <svg viewBox="0 0 24 24" className={icon}><path d="M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M22 9v6" /></svg>
      ) : kind === "guide" ? (
        <svg viewBox="0 0 24 24" className={icon}><path d="M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2zM22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" className={icon}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
      )}
    </span>
  );
}

export default function Resources() {
  const c = useContent();
  const { profile } = useAuth();
  const [items, setItems] = useState<Resource[] | null>(null);
  const [tab, setTab] = useState<"" | Audience>("");

  useEffect(() => {
    supabase.from("resources").select("*").eq("is_published", true).order("sort_order").order("title")
      .then(({ data }) => setItems((data as Resource[]) ?? []));
  }, []);

  // "Students" shows resources for students plus those for both; same for parents.
  const shown = (items ?? []).filter((r) => !tab || r.audience === tab || (tab !== "both" && r.audience === "both"));

  return (
    <>
      <PageHero tag={c.get("resources.hero.tag")} title={<Highlighted text={c.get("resources.hero.heading")} />}
        body={c.get("resources.hero.body")} image={c.get("resources.hero.image") || undefined} />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="inline-flex gap-1 rounded-lg bg-line/60 p-1" role="tablist" aria-label="Who it’s for">
            {TABS.map(([v, label]) => (
              <button key={label} role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
                className={`min-h-[40px] whitespace-nowrap rounded-md px-4 text-sm font-medium ${tab === v ? "bg-white text-navy shadow-sm" : "text-steel hover:text-navy"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {items === null ? <p className="mt-8 text-steel">Loading…</p> : shown.length === 0 ? (
          <p className="panel mt-6 px-5 py-8 text-steel">No resources here yet.</p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((r) => {
              const body = (
                <>
                  <KindIcon kind={r.kind} />
                  <h2 className="mt-4 font-sans text-lg font-semibold leading-snug tracking-normal text-ink">
                    {r.title}{r.url && /^https?:/.test(r.url) && <span className="sr-only"> (opens in a new tab)</span>}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink/80">{r.description}</p>
                  <p className="mt-auto flex flex-wrap gap-2 pt-4">
                    <span className="rounded bg-line/70 px-2 py-0.5 text-xs font-medium text-ink">{KIND_LABEL[r.kind]}</span>
                    <span className="rounded border border-line px-2 py-0.5 text-xs font-medium text-ink">{AUDIENCE_LABEL[r.audience]}</span>
                  </p>
                </>
              );
              const cls = "flex h-full flex-col rounded-lg border border-line bg-white p-5";
              return (
                <li key={r.id}>
                  {r.url ? <SmartLink to={r.url} className={`${cls} transition-colors hover:border-navy`}>{body}</SmartLink> : <div className={cls}>{body}</div>}
                </li>
              );
            })}
          </ul>
        )}
        {profile?.role === "admin" && <Link to="/admin/resources" className="btn-ghost mt-8">Edit resources</Link>}
      </div>
      <EditPageLink section="resources.hero" />
    </>
  );
}
