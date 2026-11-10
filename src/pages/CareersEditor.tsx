import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { SECTORS } from "../lib/constants";
import type { Career, Sector } from "../lib/types";
import PageHero, { heroPrimary } from "../components/PageHero";

const BLANK: Omit<Career, "id"> = {
  slug: "", title: "", sector: "mechanical", summary: "", description: "", tasks: "", skills: "", training: "",
  education_level: "", salary_range: "", growth: "", search_terms: "", sort_order: 200, is_published: false,
  outlook: "", day_in_life: "", certifications: "", red_seal_intro: "", red_seal: "", red_seal_note: "", hs_courses: "",
  provincial_programs: "", provincial_programs_note: "", education_required: "", education_text: "",
};

const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function CareersEditor() {
  const [params, setParams] = useSearchParams();
  const [careers, setCareers] = useState<Career[]>([]);
  const editId = params.get("edit");

  const load = async () => {
    const { data } = await supabase.from("careers").select("*").order("sort_order").order("title");
    setCareers((data as Career[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const selected = editId === "new" ? null : careers.find((x) => x.id === editId);

  return (
    <>
      <PageHero compact tag="AIA staff" title="Careers" body="Add and edit the careers shown in Explore Careers. Unpublished careers are hidden from visitors."
        actions={<button className={heroPrimary} onClick={() => setParams({ edit: "new" })}>Add a career</button>} />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[280px_1fr]">
        <div className="lg:hidden">
          <label htmlFor="career-pick" className="label">Career to edit</label>
          <select id="career-pick" className="field" value={editId ?? ""} onChange={(e) => setParams(e.target.value ? { edit: e.target.value } : {})}>
            <option value="">Choose a career…</option>
            {careers.map((x) => <option key={x.id} value={x.id}>{x.title}{x.is_published ? "" : " (hidden)"}</option>)}
          </select>
        </div>
        <ul className="hidden overflow-hidden rounded-md border border-line bg-white lg:block lg:self-start">
          {careers.map((x) => (
            <li key={x.id}>
              <button onClick={() => setParams({ edit: x.id })}
                className={`flex w-full items-center justify-between gap-2 border-b border-line px-4 py-3 text-left text-sm last:border-b-0 ${x.id === editId ? "bg-navy-soft font-semibold text-navy" : "hover:bg-paper"}`}>
                <span>{x.title}</span>
                {!x.is_published && <span className="rounded border border-line px-1.5 text-xs text-steel">Hidden</span>}
              </button>
            </li>
          ))}
        </ul>
        <div>
          {editId === "new" ? (
            <CareerForm key="new" initial={BLANK} onSaved={(id) => { load(); setParams({ edit: id }); }} />
          ) : selected ? (
            <CareerForm key={selected.id} id={selected.id} initial={selected} onSaved={() => load()}
              onDeleted={() => { load(); setParams({}); }} />
          ) : (
            <p className="panel px-5 py-10 text-steel">Choose a career on the left to edit it, or add a new one.</p>
          )}
        </div>
      </div>
    </>
  );
}

function CareerForm({ id, initial, onSaved, onDeleted }: {
  id?: string; initial: Omit<Career, "id">; onSaved: (id: string) => void; onDeleted?: () => void;
}) {
  const [v, setV] = useState(initial);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => { setV((o) => ({ ...o, [k]: val })); setStatus(""); };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setStatus("saving");
    const { id: _ignore, ...rest } = v as Career;
    void _ignore;
    const record = { ...rest, slug: v.slug || slugify(v.title), sort_order: Number(v.sort_order) || 100 };
    const res = id
      ? await supabase.from("careers").update(record).eq("id", id).select("id").single()
      : await supabase.from("careers").insert(record).select("id").single();
    if (res.error || !res.data) {
      setStatus("");
      setError(res.error?.code === "23505" ? "Another career already uses that web address. Change the web address and try again." : res.error?.message ?? "It didn’t save.");
      return;
    }
    setStatus("saved");
    onSaved(res.data.id);
  };

  const remove = async () => {
    if (!id || !confirm(`Delete “${v.title}”? This can’t be undone. To hide it instead, untick Published.`)) return;
    await supabase.from("careers").delete().eq("id", id);
    onDeleted?.();
  };

  const text = (k: keyof typeof v, label: string, hint?: string, placeholder?: string) => (
    <div>
      <label className="label" htmlFor={`c-${k}`}>{label}</label>
      <input id={`c-${k}`} className="field" value={String(v[k] ?? "")} placeholder={placeholder}
        onChange={(e) => set(k, e.target.value as never)} />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
  const area = (k: keyof typeof v, label: string, hint?: string, rows = 4) => (
    <div>
      <label className="label" htmlFor={`c-${k}`}>{label}</label>
      <textarea id={`c-${k}`} className="field" rows={rows} value={String(v[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );

  return (
    <form onSubmit={save} className="panel space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl">{id ? v.title || "Untitled career" : "New career"}</h2>
        {id && v.is_published && <Link to={`/careers/${v.slug}`} className="text-sm font-semibold text-navy hover:underline">View on site</Link>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="c-title">Career title</label>
          <input id="c-title" required className="field" value={v.title}
            onChange={(e) => { const t = e.target.value; setV((o) => ({ ...o, title: t, slug: id ? o.slug : slugify(t) })); }} />
        </div>
        <div>
          <label className="label" htmlFor="c-sector">Category</label>
          <select id="c-sector" className="field" value={v.sector} onChange={(e) => set("sector", e.target.value as Sector)}>
            {(Object.keys(SECTORS) as Sector[]).map((s) => <option key={s} value={s}>{SECTORS[s].label}</option>)}
          </select>
        </div>
      </div>
      {text("slug", "Web address", "Lowercase letters, numbers and dashes. Changing it breaks links people have saved.", "automotive-service-technician")}
      {area("summary", "Summary", "One or two sentences, shown on the career card and in the banner.", 2)}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {text("salary_range", "Annual Salary", undefined, "$38K – $100K+")}
        {text("growth", "Job Growth (10yr)", undefined, "+5%")}
        {text("education_level", "Education", "Also used for the Levels filter.", "Vocational Certificate")}
        {text("outlook", "Job Outlook", undefined, "Strong")}
      </div>
      <Group title="About This Career">{area("description", "Text", undefined, 5)}</Group>
      <Group title="A Day in the Life">{area("day_in_life", "Text", undefined, 4)}</Group>
      <Group title="Key Skills">{area("skills", "Skills", "One per line.")}</Group>
      <Group title="Certifications">{area("certifications", "Certifications", "One per line.", 3)}</Group>
      <Group title="Red Seal Requirements by Province" hint="Leave the table empty for careers that aren’t a Red Seal trade; the section then won’t show.">
        {area("red_seal_intro", "Intro", undefined, 3)}
        {area("red_seal", "Provinces and territories", "One per line: Province | Compulsory or Voluntary | length | hours | note | authority name | website (optional). Example: Ontario | Compulsory | 4 years | 7,220 hrs | Must hold a Certificate of Qualification. | Skilled Trades Ontario | https://www.skilledtradesontario.ca", 10)}
        {area("red_seal_note", "Note under the table", "Web addresses like red-seal.ca become links.", 2)}
      </Group>
      <Group title="Recommended High School Courses">{area("hs_courses", "Courses", "One per line.")}</Group>
      <Group title="Specialized Provincial Programs">
        {area("provincial_programs", "Programs", "One per line: Province | Program name | description", 10)}
        {area("provincial_programs_note", "Note under the programs", "Web addresses like Canada.ca become links.", 2)}
      </Group>
      <Group title="Education & Training">
        {text("education_required", "Required", "Shown as “Required: …”.", "Vocational Certificate")}
        {area("education_text", "Text", undefined, 4)}
      </Group>
      {text("search_terms", "Job matching words", "Comma-separated words used to find matching open jobs for this career, e.g. technician, mechanic, 310S.")}
      <div className="grid gap-4 sm:grid-cols-2">
        {text("sort_order", "Display order", "Lower numbers appear first.")}
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" checked={v.is_published} onChange={(e) => set("is_published", e.target.checked)} />
          Published (visible to visitors)
        </label>
      </div>
      {error && <p className="text-sm text-signal" role="alert">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={status === "saving"}>{status === "saving" ? "Saving…" : "Save career"}</button>
        {status === "saved" && <span className="text-sm text-emerald-700" role="status">Saved.</span>}
        {id && <button type="button" onClick={remove} className="ml-auto text-sm text-steel hover:text-signal">Delete career</button>}
      </div>
    </form>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-md border border-line p-4">
      <legend className="px-1 font-display text-xl font-bold text-navy">{title}</legend>
      {hint && <p className="hint -mt-2">{hint}</p>}
      {children}
    </fieldset>
  );
}
