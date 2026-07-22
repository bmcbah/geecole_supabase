import { supabase } from "../../../shared/lib/supabase/client";
import type { InstitutionInput } from "../schemas/institution.schema";

export async function getMyInstitutions() {
  const { data, error } = await supabase
    .from("institutions")
    .select("*")
    .order("name");
  if (error) throw error;
  return data;
}
export async function createInstitution(input: InstitutionInput) {
  const { data, error } = await supabase.rpc("create_institution", {
    institution_name: input.name,
    institution_slug: input.slug,
  });
  if (error) throw error;
  const { error: updateError } = await supabase
    .from("institutions")
    .update({
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
    })
    .eq("id", data);
  if (updateError) throw updateError;
  return data;
}
export async function getMyMembership(institutionId: string, userId: string) {
  const { data, error } = await supabase
    .from("memberships")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data;
}

export interface AuthorizationSummary {
  institutionId: string;
  membershipId: string;
  isOwner: boolean;
  status: "active" | "suspended";
  profiles: Array<{
    id: string;
    code: string;
    name: string;
    validFrom: string;
    validUntil: string | null;
  }>;
  permissions: string[];
  enabledModules: string[];
}

export async function getMyAuthorizationSummary(institutionId: string) {
  const { data, error } = await supabase.rpc("get_my_authorization_summary", {
    target_institution_id: institutionId,
  });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("authorization_summary_unavailable");
  }
  return data as unknown as AuthorizationSummary;
}
