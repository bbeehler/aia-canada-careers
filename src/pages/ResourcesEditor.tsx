import { useEffect, useState, type FormEvent } from "react";
import { Link } from "../components/L";
import { supabase } from "../lib/supabase";
import type { Audience, Resource, ResourceKind } from "../lib/types";
import PageHero, { heroPrimary } from "../components/PageHero";
import { AUDIENCE_LABEL, KIND_LABEL } from "./Resources";

const BLANK: Omit<Resource, "id"> = { title: "", description: "", url: "", kind: "website", audience: "both", sort_order: 100, is_published: true, translations: {} };

export default function ResourcesEditor() {
  const [items, setItems] = useState<Resource[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    const { data } = await supabase.from("resources").select("*").order("sort_order").order("title");
    setItems((data as Resource[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const remove = async (r: Resource) => {
    if (!confirm(`Delete “${r.title}”? To hide it instead, untick Published.`)) return;
    await supabase.from("resources").delete().eq("id", r.id);
    setMessage(`“${r.title}” was deleted.`); setEditing(null); load();
  };

  return (
    <>
      <PageHero compact tag="Super admin" title="Resources" body="Add, edit, reorder or hide the links on the Resources page."
        actions={<>
          <button className={heroPrimary} onClick={() => { setEditing("new"); setMessage(""); }}>Add a resource</button>
          <Link to="/resources" className="btn border border-white/25 bg-white/10 px-6 py-3 text-white hover:bg-white/20">View the page</Link>
        </>} />
      <div className="mx-auto max-w-4xl space-y-3 px-4 py-10">
        {message && <p className="panel border-l-4 border-l-emerald-600 p-4 text-sm" role="status">{message}</p>}
        {editing === "new" && <ResourceForm initial={BLANK} onDone={(m) => { setEditing(null); if (m) setMessage(m); load(); }} />}
        {items.map((r) => (
          <div key={r.id} className="panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{r.title} {!r.is_published && <span className="ml-1 rounded border border-line px-1.5 text-xs font-normal text-steel">Hidden</span>}</p>
                <p className="text-xs text-steel">{KIND_LABEL[r.kind]} – {AUDIENCE_LABEL[r.audience]} – order {r.sort_order}</p>
                <p className="truncate text-xs text-steel">{r.url || "No link"}</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost px-3 py-1.5" onClick={() => setEditing(editing === r.id ? null : r.id)}>{editing === r.id ? "Close" : "Edit"}</button>
                <button className="btn px-3 py-1.5 text-steel hover:text-signal" onClick={() => remove(r)}>Delete</button>
              </div>
            </div>
            {editing === r.id && <ResourceForm id={r.id} initial={r} onDone={(m) => { setEditing(null); if (m) setMessage(m); load(); }} />}
          </div>
        ))}
      </div>
    </>
  );
}

function ResourceForm({ id, initial, onDone }: { id?: string; initial: Omit<Resource, "id">; onDone: (message?: string) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const url = String(f.get("url")).trim();
    if (url && !/^(https?:\/\/|\/)/.test(url)) { setError("Links must start with https:// (or / for a page on this site)."); return; }
    const record = {
      title: String(f.get("title")).trim(), description: String(f.get("description")).trim(), url,
      kind: f.get("kind") as ResourceKind, audience: f.get("audience") as Audience,
      sort_order: Number(f.get("sort_order")) || 100, is_published: f.get("is_published") === "on",
      translations: { ...(initial.translations ?? {}), fr: {
        title: String(f.get("title_fr") ?? "").trim(), description: String(f.get("description_fr") ?? "").trim(), url: String(f.get("url_fr") ?? "").trim(),
      } },
    };
    if (record.translations.fr.url && !/^(https?:\/\/|\/)/.test(record.translations.fr.url)) { setError("The French link must start with https:// (or / for a page on this site)."); return; }
    setBusy(true);
    const { error: err } = id ? await supabase.from("resources").update(record).eq("id", id) : await supabase.from("resources").insert(record);
    setBusy(false);
    if (err) { setError(err.message); return; }
    onDone(`“${record.title}” was saved.`);
  };
  return (
    <form onSubmit={save} className={`space-y-4 ${id ? "mt-4 border-t border-line pt-4" : "panel border-l-4 border-l-navy p-4 sm:p-6"}`}>
      {!id && <h2 className="text-2xl">Add a resource</h2>}
      <div><label className="label" htmlFor={`t-${id ?? "new"}`}>Title</label><input id={`t-${id ?? "new"}`} name="title" required defaultValue={initial.title} className="field" /></div>
      <div><label className="label" htmlFor={`d-${id ?? "new"}`}>Description</label><textarea id={`d-${id ?? "new"}`} name="description" rows={3} defaultValue={initial.description} className="field" /></div>
      <div>
        <label className="label" htmlFor={`u-${id ?? "new"}`}>Link</label>
        <input id={`u-${id ?? "new"}`} name="url" defaultValue={initial.url} placeholder="https://" className="field" />
        <p className="hint">A full web address, or a page on this site such as /parents.</p>
      </div>
      <fieldset className="space-y-4 rounded-md border border-line p-4">
        <legend className="px-1 font-display text-lg font-bold text-navy">Français</legend>
        <p className="hint -mt-2">Shown on the French Resources page. Leave a field empty to use the English.</p>
        <div><label className="label" htmlFor={`tf-${id ?? "new"}`}>Title (French)</label><input id={`tf-${id ?? "new"}`} name="title_fr" defaultValue={initial.translations?.fr?.title ?? ""} className="field" /></div>
        <div><label className="label" htmlFor={`df-${id ?? "new"}`}>Description (French)</label><textarea id={`df-${id ?? "new"}`} name="description_fr" rows={3} defaultValue={initial.translations?.fr?.description ?? ""} className="field" /></div>
        <div>
          <label className="label" htmlFor={`uf-${id ?? "new"}`}>Link (French, optional)</label>
          <input id={`uf-${id ?? "new"}`} name="url_fr" defaultValue={initial.translations?.fr?.url ?? ""} placeholder="https://" className="field" />
          <p className="hint">Use this if the organization has a French version of its site.</p>
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className="label" htmlFor={`k-${id ?? "new"}`}>Type</label>
          <select id={`k-${id ?? "new"}`} name="kind" defaultValue={initial.kind} className="field">
            {(Object.keys(KIND_LABEL) as ResourceKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select></div>
        <div><label className="label" htmlFor={`a-${id ?? "new"}`}>For</label>
          <select id={`a-${id ?? "new"}`} name="audience" defaultValue={initial.audience} className="field">
            {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((a) => <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>)}
          </select></div>
        <div><label className="label" htmlFor={`o-${id ?? "new"}`}>Display order</label>
          <input id={`o-${id ?? "new"}`} name="sort_order" type="number" defaultValue={initial.sort_order} className="field" />
          <p className="hint">Lower numbers appear first.</p></div>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" defaultChecked={initial.is_published} /> Published (visible to visitors)</label>
      {error && <p className="text-sm text-signal" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        <button type="button" className="btn-ghost" onClick={() => onDone()}>Cancel</button>
      </div>
    </form>
  );
}
