import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import type { Role } from "../lib/types";
import PageHero from "./PageHero";

export default function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="mx-auto max-w-6xl px-4 py-12 text-steel">Loading…</p>;
  if (!session) return <Navigate to={`/sign-in?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!profile || !roles.includes(profile.role)) {
    return (
      <PageHero compact title={`This page is for ${roles.join(" or ")} accounts`}
        body={`You’re signed in with a ${profile?.role ?? "different"} account.`} />
    );
  }
  return <>{children}</>;
}
