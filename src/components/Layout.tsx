import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabaseConfigured } from "../lib/supabase";
import { useContent } from "../lib/content";
import SmartLink from "./SmartLink";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm font-medium rounded ${isActive ? "text-navy bg-navy-soft" : "text-steel hover:text-navy"}`;

export default function Layout() {
  const { profile, session, signOut } = useAuth();
  const c = useContent();

  return (
    <div className="flex min-h-screen flex-col">
      {!supabaseConfigured && (
        <div className="bg-signal px-4 py-2 text-center text-sm text-white">
          Supabase isn’t connected yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to see live data.
        </div>
      )}
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-3" aria-label="Careers in Auto Care home">
            <img src="/aia-canada-logo.png" alt="AIA Canada" width={45} height={48} className="h-12 w-auto" />
            <span className="h-9 w-px bg-line" aria-hidden />
            <span className="font-display text-2xl font-bold leading-none text-navy">Careers in Auto Care</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/about-the-industry" className={navClass}>About the Industry</NavLink>
            <NavLink to="/careers" className={navClass}>Explore Careers</NavLink>
            <NavLink to="/jobs" className={navClass}>Find jobs</NavLink>
            <NavLink to="/quiz" className={navClass}>Career quiz</NavLink>
            {profile?.role === "employer" && <NavLink to="/employer" className={navClass}>My postings</NavLink>}
            {profile?.role === "admin" && <NavLink to="/admin" end className={navClass}>Review queue</NavLink>}
            {profile?.role === "admin" && <NavLink to="/admin/careers" className={navClass}>Careers</NavLink>}
            {profile?.role === "admin" && <NavLink to="/admin/content" className={navClass}>Site content</NavLink>}
            {profile?.role === "candidate" && <NavLink to="/applications" className={navClass}>My applications</NavLink>}
            {!session && <NavLink to="/employers" className={navClass}>For employers</NavLink>}
            {session ? (
              <button onClick={signOut} className="ml-2 btn-ghost">Sign out</button>
            ) : (
              <Link to="/sign-in" className="ml-2 btn-navy">Sign in</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-paper">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/aia-canada-logo.png" alt="AIA Canada" width={30} height={32} className="h-8 w-auto" />
              <span className="font-display text-xl font-bold text-navy">Careers in Auto Care</span>
            </Link>
            <p className="mt-3 max-w-xs leading-relaxed text-steel">{c.get("footer.blurb")}</p>
          </div>
          <FooterColumn title="Explore" links={[["About the Industry", "/about-the-industry"], ["All Careers", "/careers"], ["Find Jobs", "/jobs"], ["Career Quiz", "/quiz"], ["Resources", "/parents"]]} />
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
