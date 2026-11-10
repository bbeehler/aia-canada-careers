import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import type { Role } from "../lib/types";
import { lp, t } from "../lib/i18n";
import PageHero from "./PageHero";

export default function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="mx-auto max-w-6xl px-4 py-12 text-steel">{t("Loading…")}</p>;
  if (!session) return <Navigate to={`${lp("/sign-in")}?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!profile || !roles.includes(profile.role)) {
    return (
      <PageHero compact title={t("This page isn’t available with your account")}
        body={t("Sign in with a different account, or go back to the home page.")} />
    );
  }
  return <>{children}</>;
}
