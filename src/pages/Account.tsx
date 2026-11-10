import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import PageHero from "../components/PageHero";
import { ROLE_INFO } from "./Users";

import { t } from "../lib/i18n";
export default function Account() {
  const { session, profile } = useAuth();
  const [params] = useSearchParams();
  const welcome = params.get("welcome") === "1";
  const reset = params.get("reset") === "1";
  const [nameMsg, setNameMsg] = useState("");
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState("");

  const saveName = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session) return;
    setBusy("name");
    const full_name = String(new FormData(e.currentTarget).get("full_name")).trim();
    const { error } = await supabase.from("profiles").update({ full_name: full_name || null }).eq("id", session.user.id);
    setBusy(""); setNameMsg(error ? t("Your name didn’t save. Try again.") : t("Saved."));
  };
  const savePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const pw = String(f.get("password")), confirmPw = String(f.get("confirm"));
    if (pw !== confirmPw) { setPwMsg({ text: t("The two passwords don’t match."), ok: false }); return; }
    setBusy("pw");
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy("");
    setPwMsg(error ? { text: error.message, ok: false } : { text: t("Your password is set. Use it next time you sign in."), ok: true });
    if (!error) e.currentTarget.reset();
  };

  return (
    <>
      <PageHero compact tag={t("My account")} title={welcome ? t("Welcome to Careers in Auto Care") : reset ? t("Choose a new password") : t("My account")}
        body={welcome ? t("Set a password to finish setting up your account.") : reset ? t("Enter a new password below.") : session?.user.email} />
      <div className="mx-auto grid max-w-3xl gap-6 px-4 py-10">
        <form onSubmit={savePassword} className={`panel space-y-4 p-4 sm:p-6 ${welcome || reset ? "border-l-4 border-l-signal" : ""}`}>
          <h2 className="text-2xl">{welcome ? t("Set your password") : t("Change password")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="pw">{t("New password")}</label><input id="pw" name="password" type="password" minLength={8} required autoComplete="new-password" className="field" /><p className="hint">{t("At least 8 characters.")}</p></div>
            <div><label className="label" htmlFor="pw2">{t("Type it again")}</label><input id="pw2" name="confirm" type="password" minLength={8} required autoComplete="new-password" className="field" /></div>
          </div>
          {pwMsg && <p className={`text-sm ${pwMsg.ok ? "text-emerald-700" : "text-signal"}`} role="status">{pwMsg.text}</p>}
          <button className="btn-primary" disabled={busy === "pw"}>{busy === "pw" ? t("Saving…") : t("Save password")}</button>
        </form>

        <form onSubmit={saveName} className="panel space-y-4 p-4 sm:p-6">
          <h2 className="text-2xl">{t("Your details")}</h2>
          <div><label className="label" htmlFor="nm">{t("Full name")}</label><input id="nm" name="full_name" defaultValue={profile?.full_name ?? ""} className="field" autoComplete="name" /></div>
          <p className="text-sm text-steel">{t("Email: {email}. Account type: {type}. To change your email or account type, contact AIA Canada.", { email: session?.user.email ?? "", type: profile ? t(ROLE_INFO[profile.role].label) : "" })}</p>
          {nameMsg && <p className="text-sm text-emerald-700" role="status">{nameMsg}</p>}
          <button className="btn-navy" disabled={busy === "name"}>{busy === "name" ? t("Saving…") : t("Save details")}</button>
        </form>
      </div>
    </>
  );
}
