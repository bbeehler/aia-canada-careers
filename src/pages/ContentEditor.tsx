import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CONTENT_SECTIONS, contentDefault, useContent, type ContentField, type ContentSection } from "../lib/content";
import PageHero from "../components/PageHero";

export default function ContentEditor() {
  const { hash } = useLocation();
  const pages = Array.from(new Set(CONTENT_SECTIONS.map((s) => s.page)));

  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, [hash]);

  return (
    <>
    <PageHero compact tag="AIA staff" title="Site content" body="Edit the wording and photos on the site. Changes go live as soon as you save." />
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <details className="panel p-4 lg:hidden">
          <summary className="cursor-pointer font-semibold text-navy">Jump to a section</summary>
          <ul className="mt-3 space-y-1 text-sm">
            {CONTENT_SECTIONS.map((s) => <li key={s.id}><a href={`#${s.id}`} className="block py-1.5 text-steel hover:text-navy">{s.page}: {s.title}</a></li>)}
          </ul>
        </details>
        <nav className="hidden space-y-4 text-sm lg:block">
          {pages.map((page) => (
            <div key={page}>
              <p className="font-semibold text-ink">{page}</p>
              <ul className="mt-1 space-y-1">
                {CONTENT_SECTIONS.filter((s) => s.page === page).map((s) => (
                  <li key={s.id}><a href={`#${s.id}`} className="text-steel hover:text-navy">{s.title}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <div className="space-y-8">
        {CONTENT_SECTIONS.map((s) => <SectionForm key={s.id} section={s} />)}
      </div>
    </div>
    </>
  );
}

function SectionForm({ section }: { section: ContentSection }) {
  const content = useContent();
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");
  const [error, setError] = useState("");

  useEffect(() => {
    setValues(Object.fromEntries(section.fields.map((f) => [f.key, content.get(f.key)])));
  }, [section, content]);

  const dirty = section.fields.some((f) => values[f.key] !== content.get(f.key));

  const save = async () => {
    setStatus("saving"); setError("");
    const changed = section.fields.filter((f) => values[f.key] !== content.get(f.key));
    const toReset = changed.filter((f) => values[f.key] === f.default).map((f) => f.key);
    const toSave = changed.filter((f) => values[f.key] !== f.default).map((f) => ({ key: f.key, value: values[f.key] }));
    if (toSave.length) {
      const { error: err } = await supabase.from("site_content").upsert(toSave);
      if (err) { setStatus("error"); setError(err.message); return; }
    }
    if (toReset.length) {
      const { error: err } = await supabase.from("site_content").delete().in("key", toReset);
      if (err) { setStatus("error"); setError(err.message); return; }
    }
    await content.reload();
    setStatus("saved");
  };

  return (
    <section id={section.id} className="panel scroll-mt-24 p-4 sm:p-6">
      <p className="text-xs font-medium text-steel">{section.page}</p>
      <h2 className="text-2xl">{section.title}</h2>
      <div className="mt-5 space-y-5">
        {section.fields.map((f) => (
          <Field key={f.key} field={f} value={values[f.key] ?? ""}
            onChange={(v) => { setValues((old) => ({ ...old, [f.key]: v })); setStatus(""); }} />
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={!dirty || status === "saving"}>
          {status === "saving" ? "Saving…" : "Save changes"}
        </button>
        {dirty && (
          <button className="btn-ghost" onClick={() => setValues(Object.fromEntries(section.fields.map((f) => [f.key, content.get(f.key)])))}>
            Discard changes
          </button>
        )}
        {status === "saved" && !dirty && <span className="text-sm text-emerald-700" role="status">Saved. It’s live now.</span>}
        {status === "error" && <span className="text-sm text-signal" role="alert">Changes didn’t save: {error}</span>}
      </div>
    </section>
  );
}

function Field({ field, value, onChange }: { field: ContentField; value: string; onChange: (v: string) => void }) {
  const id = `f-${field.key}`;
  const isDefault = value === contentDefault(field.key);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label className="label" htmlFor={id}>{field.label}</label>
        {!isDefault && (
          <button type="button" className="text-xs text-steel hover:text-navy" onClick={() => onChange(field.default)}>
            Restore original
          </button>
        )}
      </div>
      {field.type === "text" && <input id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)} />}
      {(field.type === "textarea" || field.type === "list") && (
        <textarea id={id} className="field" rows={field.type === "list" ? 5 : 3} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.type === "image" && <ImageField id={id} value={value} onChange={onChange} allowEmpty={field.default === ""} />}
      {field.type === "image" && <p className="hint">After uploading, click Save changes to put the new photo live.</p>}
      {field.hint && <p className="hint">{field.hint}</p>}
    </div>
  );
}

function ImageField({ id, value, onChange, allowEmpty }: { id: string; value: string; onChange: (v: string) => void; allowEmpty: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    setError("");
    if (file.size > 5 * 1024 * 1024) { setError("Images must be 5 MB or smaller."); return; }
    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `hero/${Date.now()}.${ext}`;
    const { error: err } = await supabase.storage.from("site-assets").upload(path, file, { contentType: file.type });
    setBusy(false);
    if (err) { setError("The photo didn’t upload. Use a JPG, PNG or WebP file."); return; }
    onChange(supabase.storage.from("site-assets").getPublicUrl(path).data.publicUrl);
  };

  return (
    <div className="space-y-3">
      {value ? (
        <img src={value} alt="" className="aspect-[16/7] w-full rounded border border-line object-cover" />
      ) : (
        <div className="flex aspect-[16/7] w-full items-center justify-center rounded border border-dashed border-line bg-gradient-to-br from-[#1D3264] to-navy-deep text-sm text-white/70">
          No photo: plain navy banner
        </div>
      )}
      {allowEmpty && value && <button type="button" className="text-sm text-steel hover:text-signal" onClick={() => onChange("")}>Remove photo</button>}
      <input id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} className="block text-sm" />
      {busy && <p className="text-sm text-steel">Uploading…</p>}
      {error && <p className="text-sm text-signal" role="alert">{error}</p>}
    </div>
  );
}
