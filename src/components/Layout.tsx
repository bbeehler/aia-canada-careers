import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabaseConfigured } from "../lib/supabase";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm font-medium rounded ${isActive ? "text-navy bg-navy-soft" : "text-steel hover:text-navy"}`;

export default function Layout() {
  const { profile, session, signOut } = useAuth();

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
            <NavLink to="/jobs" className={navClass}>Find jobs</NavLink>
            {profile?.role === "employer" && <NavLink to="/employer" className={navClass}>My postings</NavLink>}
            {profile?.role === "admin" && <NavLink to="/admin" className={navClass}>Review queue</NavLink>}
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

      <footer className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-steel sm:grid-cols-3">
          <div>
            <p className="font-display text-lg font-bold text-navy">Careers in Auto Care</p>
            <p className="mt-1">The job board for Canada’s automotive aftermarket, from the Automotive Industries Association of Canada.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Link to="/jobs" className="hover:text-navy">Find jobs</Link>
            <Link to="/employers" className="hover:text-navy">Post a job</Link>
          </div>
          <div className="flex flex-col gap-1.5">
            <a href="https://www.aiacanada.com" className="hover:text-navy">AIA Canada</a>
            <a href="https://www.i-car.ca" className="hover:text-navy">I-CAR Canada training</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
