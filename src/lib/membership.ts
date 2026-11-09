import { supabase } from "./supabase";

export type MembershipResult = "member" | "not_member" | "not_found" | "not_configured" | "error";

// Asks the server to look the company up in Insightly. Never throws.
export async function checkMembership(companyId: string): Promise<{ status: MembershipResult; organisation?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("check-membership", { body: { company_id: companyId } });
    if (error || !data?.status) return { status: "error" };
    return data;
  } catch {
    return { status: "error" };
  }
}

export const MEMBERSHIP_MESSAGES: Record<MembershipResult, string> = {
  member: "Good news: we found your company in AIA Canada’s member records. Your postings are free.",
  not_member: "We found your company in AIA Canada’s records, but not as a current member. Postings are paid per posting, or contact AIA Canada about membership.",
  not_found: "We couldn’t match your company to AIA Canada’s member records automatically. If you’re a member, contact AIA Canada and we’ll verify you.",
  not_configured: "Membership is verified by AIA Canada staff. If you’re a member, contact AIA Canada and we’ll switch on free posting.",
  error: "We couldn’t check membership just now. You can try again from your dashboard.",
};
