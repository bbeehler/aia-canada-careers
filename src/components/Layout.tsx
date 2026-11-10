import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Link, NavLink } from "./L";
import { Link as RawLink } from "react-router-dom";
import { getLang, switchPath } from "../lib/i18n";
import { useAuth } from "../lib/auth";
import { supabaseConfigured } from "../lib/supabase";
import { useContent } from "../lib/content";
import SmartLink from "./SmartLink";

import { t } from "../lib/i18n";
const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-2.5 py-2 text-sm font-medium rounded whitespace-nowrap xl:px-3 ${isActive ? "text-navy bg-navy-soft" : "text-steel hover:text-navy"}`;
const drawerClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded px-3 py-3 text-base font-medium ${isActive ? "bg-navy-soft text-navy" : "text-ink hover:bg-paper"}`;

const PUBLIC_LINKS: [string, string][] = [
  ["/about-the-industry", "About the Industry"],
  ["/careers", "Explore Careers"],
  ["/jobs", "Find Jobs"],
  ["/quiz", "Career Quiz"],
  ["/resources", "Resources"],
];

export default function Layout() {
  const { profile, session, signOut } = useAuth();
  const c = useContent();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const roleLinks: [string, string, boolean?][] =
    profile?.role === "admin" ? [["/admin", t("Review queue"), true], ["/admin/users", t("Users")], ["/admin/careers", t("Careers")], ["/admin/resources", t("Resources")], ["/admin/content", t("Site content")]]
    : profile?.role === "staff" ? [["/admin", t("Review queue"), true]]
    : profile?.role === "employer" ? [["/employer", t("My postings"), true], ["/employer/jobs/new", t("Post a job")]]
    : profile?.role === "candidate" ? [["/applications", t("My applications")]]
    : [];
  const roleLabel = profile?.role === "admin" ? t("Super admin") : profile?.role === "staff" ? t("AIA staff") : profile?.role === "employer" ? t("Employer") : t("Job seeker");
  const publicLinks = session ? PUBLIC_LINKS : [...PUBLIC_LINKS, ["/employers", t("For Employers")] as [string, string]];

  return (
    <div className="flex min-h-screen flex-col">
      {!supabaseConfigured && (
        <div className="bg-signal px-4 py-2 text-center text-sm text-white">
          {t("Supabase isn’t connected yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to see live data.")}
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        {/* Row 1: logo and title on the left, account and admin links with sign in/out on the right */}
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3" aria-label={t("Careers in Auto Care home")}>
            <img src="/aia-canada-logo.png" alt="AIA Canada" width={45} height={48} className="h-10 w-auto sm:h-12" />
            <span className="h-8 w-px shrink-0 bg-line sm:h-9" aria-hidden />
            <span className="font-display text-lg font-bold leading-[1.05] text-navy min-[400px]:text-xl sm:text-2xl sm:leading-none">{t("Careers in Auto Care")}</span>
          </Link>

          <div className="ml-auto flex items-center gap-1">
          <LanguageSwitch />
          <nav className="hidden shrink-0 items-center gap-1 md:flex" aria-label={t("Account")}>
            {roleLinks.length > 0 && (
              <span className="mr-1 hidden text-xs font-semibold uppercase tracking-wide text-steel lg:inline">{roleLabel}</span>
            )}
            {roleLinks.map(([to, label, end]) => <NavLink key={to} to={to} end={end} className={navClass}>{t(label)}</NavLink>)}
            {session ? (
              <>
                <NavLink to="/account" className={navClass} title={session.user.email}>{t("My account")}</NavLink>
                <button onClick={signOut} className="ml-2 btn-ghost whitespace-nowrap">{t("Sign out")}</button>
              </>
            ) : (
              <Link to="/sign-in" className="ml-1 btn-navy whitespace-nowrap">{t("Sign in")}</Link>
            )}
          </nav>

          <button type="button" className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded text-navy hover:bg-paper md:hidden"
            aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? t("Close menu") : t("Open menu")} onClick={() => setOpen(!open)}>
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2 [stroke-linecap:round]" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
          </div>
        </div>

        {/* Row 2: main site navigation, under the logo */}
        <div className="hidden border-t border-line md:block">
          <nav className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-2 py-1.5" aria-label={t("Main")}>
            {publicLinks.map(([to, label]) => <NavLink key={to} to={to} className={navClass}>{t(label)}</NavLink>)}
          </nav>
        </div>

        {open && (
          <div id="mobile-menu" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-white md:hidden">
            <nav className="mx-auto max-w-6xl space-y-1 px-4 py-3" aria-label={t("Main")}>
              {publicLinks.map(([to, label]) => <NavLink key={to} to={to} className={drawerClass}>{t(label)}</NavLink>)}
              {roleLinks.length > 0 && (
                <div className="mt-3 border-t border-line pt-3">
                  <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-steel">{roleLabel}</p>
                  {roleLinks.map(([to, label, end]) => <NavLink key={to} to={to} end={end} className={drawerClass}>{t(label)}</NavLink>)}
                </div>
              )}
              <div className="mt-3 border-t border-line pt-4 pb-1">
                {session ? (
                  <>
                    <p className="truncate px-3 pb-2 text-sm text-steel">{session.user.email}</p>
                    <NavLink to="/account" className={drawerClass}>{t("My account")}</NavLink>
                    <button onClick={signOut} className="btn-ghost w-full py-3">{t("Sign out")}</button>
                  </>
                ) : (
                  <Link to="/sign-in" className="btn-navy w-full py-3">{t("Sign in")}</Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-paper">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 text-sm lg:grid-cols-4">
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/aia-canada-logo.png" alt="AIA Canada" width={30} height={32} className="h-8 w-auto" />
              <span className="font-display text-xl font-bold text-navy">{t("Careers in Auto Care")}</span>
            </Link>
            <p className="mt-3 max-w-xs leading-relaxed text-steel">{c.get("footer.blurb")}</p>
          </div>
          <FooterColumn title={t("Explore")} links={[[t("About the Industry"), "/about-the-industry"], [t("All Careers"), "/careers"], [t("Find Jobs"), "/jobs"], [t("Career Quiz"), "/quiz"], [t("Resources"), "/resources"]]} />
          <FooterColumn title={t("Career Areas")} links={[[t("Vehicle Repair"), "/careers?category=mechanical"], [t("Collision Repair"), "/careers?category=collision"], [t("Parts & Manufacturing"), "/careers?category=parts_manufacturing"], [t("Business Operations"), "/careers?category=business_operations"]]} />
          <FooterColumn title={t("For Parents")} links={[[t("Parent Guide"), "/parents"], [t("Salary Information"), "/parents#pay"], [t("AIA Canada"), "https://www.aiacanada.com"]]} />
        </div>
        <div className="border-t border-line">
          <p className="mx-auto max-w-6xl px-4 py-5 text-center text-xs text-steel">{c.get("footer.bottom")}</p>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="font-semibold text-ink">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map(([label, to]) => (
          <li key={label}><SmartLink to={to} className="text-steel hover:text-navy">{label}</SmartLink></li>
        ))}
      </ul>
    </div>
  );
}

// EN | FR switch: the same page in the other language
function LanguageSwitch({ className = "" }: { className?: string }) {
  const { pathname, search, hash } = useLocation();
  const other = getLang() === "fr" ? "en" : "fr";
  return (
    <RawLink to={switchPath(pathname, search, hash, other)} lang={other === "fr" ? "fr" : "en"} hrefLang={other}
      className={`inline-flex min-h-[40px] items-center rounded px-2.5 text-sm font-semibold text-navy hover:bg-paper ${className}`}
      aria-label={other === "fr" ? "Français" : "English"}>
      {other === "fr" ? "FR" : "EN"}
    </RawLink>
  );
}
