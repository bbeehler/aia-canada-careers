// admin-users: super-admin tools to add, edit and delete accounts. Runs on the server because it
// needs Supabase's admin API. Every action re-checks that the caller is a super admin.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { cors, json } from "../_shared/insightly.ts";

const ROLES = ["candidate", "employer", "staff", "admin"];
const ALLOWED_ORIGINS = [/^https:\/\/careers\.aiacanada\.com$/, /^https:\/\/[a-z0-9-]+\.pages\.dev$/, /^http:\/\/localhost:\d+$/];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });

  const { data: u } = await asUser.auth.getUser();
  if (!u?.user) return json({ error: "Sign in required" }, 401);
  const { data: me } = await admin.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
  if (me?.role !== "admin") return json({ error: "Super admins only" }, 403);

  let b: any = {};
  try { b = await req.json(); } catch { /* empty */ }
  const origin = typeof b.origin === "string" && ALLOWED_ORIGINS.some((r) => r.test(b.origin)) ? b.origin : "https://careers.aiacanada.com";

  const superAdminCount = async () => (await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin")).count ?? 0;
  const setRole = async (id: string, role: string) => {
    if (!ROLES.includes(role)) throw new Error("Unknown role");
    const { error } = await admin.from("profiles").update({ role }).eq("id", id);
    if (error) throw error;
  };

  try {
    if (b.action === "invite") {
      const email = String(b.email ?? "").trim().toLowerCase();
      const full_name = String(b.full_name ?? "").trim();
      const role = String(b.role ?? "staff");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
      if (!ROLES.includes(role)) return json({ error: "Choose a role." }, 400);

      const redirectTo = `${origin}/account?welcome=1`;
      let userId = "";
      let link = "";
      if (b.send_email) {
        const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name }, redirectTo });
        if (error) return json({ error: error.message.includes("already") ? "This person already has an account. Find them in the list and change their role." : `The invite email couldn’t be sent (${error.message}). Untick “Email the invite” to get a link you can send yourself.` }, 400);
        userId = data.user.id;
      } else {
        const { data, error } = await admin.auth.admin.generateLink({ type: "invite", email, options: { data: { full_name }, redirectTo } });
        if (error) return json({ error: error.message.includes("already") ? "This person already has an account. Find them in the list and change their role." : error.message }, 400);
        userId = data.user.id;
        link = data.properties.action_link;
      }
      await admin.from("profiles").update({ full_name: full_name || null }).eq("id", userId);
      await setRole(userId, role);
      if (b.company_id) {
        await admin.from("company_users").upsert({ company_id: b.company_id, user_id: userId });
      }
      return json({ ok: true, user_id: userId, link });
    }

    const target = String(b.user_id ?? "");
    if (!target) return json({ error: "user_id is required" }, 400);

    if (b.action === "update") {
      if (b.role !== undefined && b.role !== "admin") {
        if (target === u.user.id) return json({ error: "You can’t remove your own super admin access. Ask another super admin." }, 400);
        const { data: t } = await admin.from("profiles").select("role").eq("id", target).maybeSingle();
        if (t?.role === "admin" && (await superAdminCount()) <= 1) return json({ error: "There must always be at least one super admin." }, 400);
      }
      const attrs: any = {};
      if (typeof b.email === "string" && b.email.trim()) { attrs.email = b.email.trim().toLowerCase(); attrs.email_confirm = true; }
      if (typeof b.full_name === "string") attrs.user_metadata = { full_name: b.full_name.trim() };
      if (Object.keys(attrs).length) {
        const { error } = await admin.auth.admin.updateUserById(target, attrs);
        if (error) return json({ error: error.message.includes("already") ? "Another account already uses that email." : error.message }, 400);
      }
      if (typeof b.full_name === "string") await admin.from("profiles").update({ full_name: b.full_name.trim() || null }).eq("id", target);
      if (b.role !== undefined) await setRole(target, String(b.role));
      return json({ ok: true });
    }

    if (b.action === "reset_link") {
      const { data: t } = await admin.auth.admin.getUserById(target);
      if (!t?.user?.email) return json({ error: "User not found" }, 404);
      const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: t.user.email, options: { redirectTo: `${origin}/account?reset=1` } });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, link: data.properties.action_link });
    }

    if (b.action === "delete") {
      if (target === u.user.id) return json({ error: "You can’t delete your own account here." }, 400);
      const { data: t } = await admin.from("profiles").select("role").eq("id", target).maybeSingle();
      if (t?.role === "admin" && (await superAdminCount()) <= 1) return json({ error: "There must always be at least one super admin." }, 400);
      const { error } = await admin.auth.admin.deleteUser(target);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong. Try again." }, 500);
  }
});
