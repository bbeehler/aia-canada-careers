import { useEffect, useState } from "react";
import type { Lang } from "../lib/i18n";
import { FR_DEFAULTS } from "../lib/contentFr";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CONTENT_SECTIONS, contentDefault, useContent, type ContentField, type ContentSection } from "../lib/content";
import PageHero from "../components/PageHero";

export default function ContentEditor() {
  const { hash } = useLocation();
  const [lang, setLang] = useState<Lang>(() => (sessionStorage.getItem("content-lang") === "fr" ? "fr" : "en"));
  const choose = (l: Lang) => { setLang(l); sessionStorage.setItem("content-lang", l); };
  const pages = Array.from(new Set(CONTENT_SECTIONS.map((s) => s.page)));

  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, [hash]);

  return (
    <>
    <PageHero compact tag="AIA staff" title="Site content" body="Edit the wording and photos on the site, in English and French. Changes go live as soon as you save." />
    <div className="sticky top-[72px] z-30 border-b border-line bg-white/95 backdrop-blur sm:top-[118px]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <span className="text-sm font-medium">Editing:</span>
        <div className="inline-flex rounded-lg bg-line/60 p-1" role="tablist" aria-label="Language">
          {(["en", "fr"] as Lang[]).map((l) => (
            <button key={l} role="tab" aria-selected={lang === l} onClick={() => choose(l)}
              className={`min-h-[40px] rounded-md px-4 text-sm font-semibold ${lang === l ? "bg-white text-navy shadow-sm" : "text-steel hover:text-navy"}`}>
              {l === "en" ? "English" : "Français"}
            </button>
          ))}
        </div>
        {lang === "fr" && <span className="text-sm text-steel">French text appears on careers.aiacanada.com/fr pages. The English version is shown under each field for reference.</span>}
      </div>
    </div>
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-32 lg:self-start">
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
        {CONTENT_SECTIONS.map((s) => <SectionForm key={`${s.id}-${lang}`} section={s} lang={lang} />)}
      </div>
    </div>
    </>
  );
}

// The value a visitor sees for a field in a language
function useEffective() {
  const content = useContent();
  return (key: string, lang: Lang) => {
    const en = content.saved(key, "en") ?? contentDefault(key, "en");
    return lang === "en" ? en : content.saved(key, "fr") ?? FR_DEFAULTS[key] ?? en;
  };
}

function SectionForm({ section, lang }: { section: ContentSection; lang: Lang }) {
  const content = useContent();
  const effective = useEffective();
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");
  const [error, setError] = useState("");
  const current = () => Object.fromEntries(section.fields.map((f) => [f.key, effective(f.key, lang)]));

  useEffect(() => { setValues(current()); }, [section, content, lang]);

  const dirty = section.fields.some((f) => values[f.key] !== effective(f.key, lang));

  const save = async () => {
    setStatus("saving"); setError("");
    const changed = section.fields.filter((f) => values[f.key] !== effective(f.key, lang));
    const def = (f: ContentField) => (lang === "fr" ? FR_DEFAULTS[f.key] ?? effective(f.key, "en") : f.default);
    const toReset = changed.filter((f) => values[f.key] === def(f)).map((f) => f.key);
    const toSave = changed.filter((f) => values[f.key] !== def(f)).map((f) => ({ key: f.key, value: values[f.key], lang }));
    if (toSave.length) {
      const { error: err } = await supabase.from("site_content").upsert(toSave, { onConflict: "key,lang" });
      if (err) { setStatus("error"); setError(err.message); return; }
    }
    if (toReset.length) {
      const { error: err } = await supabase.from("site_content").delete().eq("lang", lang).in("key", toReset);
      if (err) { setStatus("error"); setError(err.message); return; }
    }
    await content.reload();
    setStatus("saved");
  };

  return (
    <section id={section.id} className="panel scroll-mt-48 p-4 sm:p-6">
      <p className="text-xs font-medium text-steel">{section.page} · {lang === "en" ? "English" : "Français"}</p>
      <h2 className="text-2xl">{section.title}</h2>
      <div className="mt-5 space-y-5">
        {section.fields.map((f) => (
          <Field key={f.key} field={f} lang={lang} value={values[f.key] ?? ""} english={lang === "fr" ? effective(f.key, "en") : undefined}
            onChange={(v) => { setValues((old) => ({ ...old, [f.key]: v })); setStatus(""); }} />
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={!dirty || status === "saving"}>
          {status === "saving" ? "Saving…" : lang === "fr" ? "Save French changes" : "Save changes"}
        </button>
        {dirty && <button className="btn-ghost" onClick={() => setValues(current())}>Discard changes</button>}
        {status === "saved" && !dirty && <span className="text-sm text-emerald-700" role="status">Saved. It’s live now.</span>}
        {status === "error" && <span className="text-sm text-signal" role="alert">Changes didn’t save: {error}</span>}
      </div>
    </section>
  );
}

function Field({ field, lang, value, english, onChange }: { field: ContentField; lang: Lang; value: string; english?: string; onChange: (v: string) => void }) {
  const id = `f-${lang}-${field.key}`;
  const original = lang === "fr" ? FR_DEFAULTS[field.key] ?? english ?? field.default : field.default;
  const isDefault = value === original;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label className="label" htmlFor={id}>{field.label}</label>
        {!isDefault && (
          <button type="button" className="text-xs text-steel hover:text-navy" onClick={() => onChange(original)}>
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
      {english !== undefined && field.type !== "image" && (
        <p className="mt-1.5 whitespace-pre-line rounded bg-paper px-2 py-1.5 text-xs text-steel"><span className="font-semibold">English:</span> {english}</p>
      )}
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
