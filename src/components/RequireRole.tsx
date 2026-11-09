import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import type { Role } from "../lib/types";

export default function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="mx-auto max-w-6xl px-4 py-12 text-steel">Loading…</p>;
  if (!session) return <Navigate to={`/sign-in?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!profile || !roles.includes(profile.role)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-3xl">This page is for {roles.join(" or ")} accounts</h1>
        <p className="mt-2 text-steel">You’re signed in with a {profile?.role ?? "different"} account.</p>
      </div>
    );
  }
  return <>{children}</>;
}
