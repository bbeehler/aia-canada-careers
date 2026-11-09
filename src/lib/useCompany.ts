import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import type { Company } from "./types";

export function useCompany() {
  const { session } = useAuth();
  const [company, setCompany] = useState<Company | null | undefined>(undefined);

  const load = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase.from("company_users")
      .select("companies(id, name, website, city, province, is_member, membership_lapsed_at)")
      .eq("user_id", session.user.id).limit(1).maybeSingle();
    const row = data as unknown as { companies: Company | null } | null;
    setCompany(row?.companies ?? null);
  }, [session]);

  useEffect(() => { load(); }, [load]);
  return { company, reload: load };
}
