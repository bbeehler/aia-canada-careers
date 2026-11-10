// Language support. English lives at /..., French at /fr/... The current language comes from the URL.
// t("English text") returns the French version on French pages (from lib/fr.ts), else the English.
import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { FR } from "./fr";

export type Lang = "en" | "fr";
let current: Lang = "en";

export const langFromPath = (path: string): Lang => (path === "/fr" || path.startsWith("/fr/") ? "fr" : "en");
export const getLang = () => current;
export const locale = () => (current === "fr" ? "fr-CA" : "en-CA");

export function t(text: string, vars?: Record<string, string | number>): string {
  let out = current === "fr" ? FR[text] ?? text : text;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

// Adds /fr to site paths on French pages. Leaves full web addresses, anchors and mailto links alone.
export function lp(path: string, lang: Lang = current): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const bare = path === "/fr" ? "/" : path.startsWith("/fr/") ? path.slice(3) : path;
  return lang === "fr" ? (bare === "/" ? "/fr" : `/fr${bare}`) : bare;
}

// The same page in the other language
export const switchPath = (pathname: string, search: string, hash: string, to: Lang) => lp(pathname, to) + search + hash;

// Sets the language for this render pass and the <html lang> attribute.
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  current = langFromPath(pathname);
  useEffect(() => { document.documentElement.lang = current === "fr" ? "fr-CA" : "en-CA"; }, [pathname]);
  return <>{children}</>;
}

// Picks a translated field from a record with a translations column, falling back to English.
export function tr<T extends { translations?: Record<string, Record<string, unknown>> | null }>(row: T, field: keyof T & string): string {
  const fr = current === "fr" ? row.translations?.fr?.[field] : undefined;
  return typeof fr === "string" && fr.trim() ? fr : String(row[field] ?? "");
}

// Returns the record with its French text swapped in (on French pages), field by field; blank French keeps English.
export function localize<T extends object>(row: T): T {
  const fr = current === "fr" ? (row as { translations?: { fr?: Record<string, unknown> } }).translations?.fr : undefined;
  if (!fr) return row;
  const out = { ...row } as Record<string, unknown>;
  for (const [k, v] of Object.entries(fr)) if (typeof v === "string" && v.trim()) out[k] = v;
  return out as T;
}
