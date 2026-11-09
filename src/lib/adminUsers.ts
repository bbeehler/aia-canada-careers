import { supabase } from "./supabase";

// Calls the admin-users server function. Returns { error } with a readable message on failure.
export async function adminUsers<T = { ok: boolean; link?: string; user_id?: string }>(body: Record<string, unknown>): Promise<T & { error?: string }> {
  const { data, error } = await supabase.functions.invoke("admin-users", { body: { ...body, origin: window.location.origin } });
  if (error) {
    let message = "Something went wrong. Try again.";
    try { const ctx = (error as { context?: Response }).context; if (ctx) message = (await ctx.json()).error ?? message; } catch { /* keep default */ }
    return { error: message } as T & { error?: string };
  }
  return data;
}
