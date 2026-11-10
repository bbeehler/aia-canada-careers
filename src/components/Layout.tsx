import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabaseConfigured } from "../lib/supabase";
import { useContent } from "../lib/content";
import SmartLink from "./SmartLink";

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
    profile?.role === "admin" ? [["/admin", "Review queue", true], ["/admin/users", "Users"], ["/admin/careers", "Careers"], ["/admin/resources", "Resources"], ["/admin/content", "Site content"]]
    : profile?.role === "staff" ? [["/admin", "Review queue", true]]
    : profile?.role === "employer" ? [["/employer", "My postings", true], ["/employer/jobs/new", "Post a job"]]
    : profile?.role === "candidate" ? [["/applications", "My applications"]]
    : [];
  const roleLabel = profile?.role === "admin" ? "Super admin" : profile?.role === "staff" ? "AIA staff" : profile?.role === "employer" ? "Employer" : "Job seeker";
  const publicLinks = session ? PUBLIC_LINKS : [...PUBLIC_LINKS, ["/employers", "For Employers"] as [string, string]];

  return (
    <div className="flex min-h-screen flex-col">
      {!supabaseConfigured && (
        <div className="bg-signal px-4 py-2 text-center text-sm text-white">
          Supabase isn’t connected yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to see live data.
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        {/* Row 1: logo and title on the left, account and admin links with sign in/out on the right */}
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3" aria-label="Careers in Auto Care home">
            <img src="/aia-canada-logo.png" alt="AIA Canada" width={45} height={48} className="h-10 w-auto sm:h-12" />
            <span className="h-8 w-px shrink-0 bg-line sm:h-9" aria-hidden />
            <span className="truncate font-display text-xl font-bold leading-none text-navy sm:text-2xl">Careers in Auto Care</span>
          </Link>

          <nav className="hidden shrink-0 items-center gap-1 md:flex" aria-label="Account">
            {roleLinks.length > 0 && (
              <span className="mr-1 hidden text-xs font-semibold uppercase tracking-wide text-steel lg:inline">{roleLabel}</span>
            )}
            {roleLinks.map(([to, label, end]) => <NavLink key={to} to={to} end={end} className={navClass}>{label}</NavLink>)}
            {session ? (
              <>
                <NavLink to="/account" className={navClass} title={session.user.email}>My account</NavLink>
                <button onClick={signOut} className="ml-2 btn-ghost whitespace-nowrap">Sign out</button>
              </>
            ) : (
              <Link to="/sign-in" className="ml-1 btn-navy whitespace-nowrap">Sign in</Link>
            )}
          </nav>

          <button type="button" className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded text-navy hover:bg-paper md:hidden"
            aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2 [stroke-linecap:round]" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {/* Row 2: main site navigation, under the logo */}
        <div className="hidden border-t border-line md:block">
          <nav className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-2 py-1.5" aria-label="Main">
            {publicLinks.map(([to, label]) => <NavLink key={to} to={to} className={navClass}>{label}</NavLink>)}
          </nav>
        </div>

        {open && (
          <div id="mobile-menu" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-white md:hidden">
            <nav className="mx-auto max-w-6xl space-y-1 px-4 py-3" aria-label="Main">
              {publicLinks.map(([to, label]) => <NavLink key={to} to={to} className={drawerClass}>{label}</NavLink>)}
              {roleLinks.length > 0 && (
                <div className="mt-3 border-t border-line pt-3">
                  <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-steel">{roleLabel}</p>
                  {roleLinks.map(([to, label, end]) => <NavLink key={to} to={to} end={end} className={drawerClass}>{label}</NavLink>)}
                </div>
              )}
              <div className="mt-3 border-t border-line pt-4 pb-1">
                {session ? (
                  <>
                    <p className="truncate px-3 pb-2 text-sm text-steel">{session.user.email}</p>
                    <NavLink to="/account" className={drawerClass}>My account</NavLink>
                    <button onClick={signOut} className="btn-ghost w-full py-3">Sign out</button>
                  </>
                ) : (
                  <Link to="/sign-in" className="btn-navy w-full py-3">Sign in</Link>
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
              <span className="font-display text-xl font-bold text-navy">Careers in Auto Care</span>
            </Link>
            <p className="mt-3 max-w-xs leading-relaxed text-steel">{c.get("footer.blurb")}</p>
          </div>
          <FooterColumn title="Explore" links={[["About the Industry", "/about-the-industry"], ["All Careers", "/careers"], ["Find Jobs", "/jobs"], ["Career Quiz", "/quiz"], ["Resources", "/resources"]]} />
          <FooterColumn title="Career Areas" links={[["Vehicle Repair", "/careers?category=mechanical"], ["Collision Repair", "/careers?category=collision"], ["Parts & Manufacturing", "/careers?category=parts_manufacturing"], ["Business Operations", "/careers?category=business_operations"]]} />
          <FooterColumn title="For Parents" links={[["Parent Guide", "/parents"], ["Salary Information", "/parents#pay"], ["AIA Canada", "https://www.aiacanada.com"]]} />
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
