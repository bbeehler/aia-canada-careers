import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Link, useNavigate } from "../components/L";
import { supabase } from "../lib/supabase";
import PageHero from "../components/PageHero";

import { lp, t } from "../lib/i18n";
export default function SignIn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get("next") ?? "";
  const [mode, setMode] = useState<"sign-in" | "sign-up">(params.get("mode") === "sign-up" ? "sign-up" : "sign-in");
  const [role, setRole] = useState<"candidate" | "employer">(params.get("as") === "employer" ? "employer" : "candidate");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(""); setNotice(""); setBusy(true);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));

    if (mode === "sign-in") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (err) { setError("That email and password don’t match an account."); return; }
      navigate(next || "/");
      return;
    }

    if (role === "candidate" && !f.get("age_ok")) {
      setBusy(false);
      setError("You need to be 16 or older to create a job seeker account. You can still browse jobs without one.");
      return;
    }
    const { data, error: err } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { role, full_name: String(f.get("full_name")) },
        emailRedirectTo: `${window.location.origin}${lp(role === "employer" ? "/employer" : next || "/jobs")}`,
      },
    });
    setBusy(false);
    if (err) { setError(err.message); return; }
    if (data.session) navigate(role === "employer" ? "/employer" : next || "/jobs");
    else setNotice(t("Check {email} for a link to confirm your account.", { email }));
  };

  return (
    <>
    <PageHero compact tag={t("Your account")} title={mode === "sign-in" ? t("Sign in") : t("Create an account")}
      body={mode === "sign-in" ? t("Job seekers track applications. Employers manage postings.") : t("Free for job seekers. AIA Canada members post jobs free.")} />
    <div className="mx-auto max-w-md px-4 py-12">
      <p className="text-steel">
        {mode === "sign-in" ? t("New here? ") : t("Already have an account? ")}
        <button className="font-semibold text-navy underline" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setError(""); }}>
          {mode === "sign-in" ? t("Create an account") : t("Sign in")}
        </button>
      </p>

      <form onSubmit={submit} className="panel mt-6 space-y-4 p-6">
        {mode === "sign-up" && (
          <>
            <fieldset>
              <legend className="label">{t("I’m here to")}</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["candidate", "employer"] as const).map((r) => (
                  <label key={r} className={`cursor-pointer rounded border px-3 py-3 text-sm font-medium ${role === r ? "border-navy bg-navy-soft text-navy" : "border-line"}`}>
                    <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="sr-only" />
                    {r === "candidate" ? t("Find a job") : t("Hire people")}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label className="label" htmlFor="full_name">{t("Full name")}</label>
              <input id="full_name" name="full_name" required className="field" autoComplete="name" />
            </div>
          </>
        )}
        <div>
          <label className="label" htmlFor="email">{role === "employer" && mode === "sign-up" ? t("Work email") : t("Email")}</label>
          <input id="email" name="email" type="email" required className="field" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">{t("Password")}</label>
          <input id="password" name="password" type="password" required minLength={8} className="field"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"} />
          {mode === "sign-up" && <p className="hint">{t("At least 8 characters.")}</p>}
        </div>
        {mode === "sign-up" && role === "candidate" && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="age_ok" className="mt-0.5" />
            <span>{t("I’m 16 or older.")}</span>
          </label>
        )}
        {mode === "sign-up" && role === "employer" && (
          <p className="text-sm text-steel">{t("AIA Canada members post free. We’ll confirm your membership when you add your company.")}</p>
        )}
        {error && <p className="text-sm text-signal" role="alert">{error}</p>}
        {notice && <p className="text-sm text-navy" role="status">{notice}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? t("One moment…") : mode === "sign-in" ? t("Sign in") : t("Create account")}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-steel"><Link to="/jobs" className="hover:text-navy">{t("Browse jobs without an account")}</Link></p>
    </div>
    </>
  );
}
