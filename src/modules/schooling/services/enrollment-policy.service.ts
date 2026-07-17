import { supabase } from "../../../shared/lib/supabase/client";
import type { Database } from "../../../shared/lib/supabase/database.types";

export type EnrollmentPolicy =
  Database["public"]["Tables"]["enrollment_policies"]["Row"];
export type EnrollmentPolicyUpdate =
  Database["public"]["Tables"]["enrollment_policies"]["Update"];

export async function getEnrollmentPolicy(institutionId: string) {
  const { data, error } = await supabase
    .from("enrollment_policies")
    .select("*")
    .eq("institution_id", institutionId)
    .single();
  if (error) throw error;
  return data;
}
export async function saveEnrollmentPolicy(
  institutionId: string,
  input: EnrollmentPolicyUpdate,
) {
  const { data, error } = await supabase
    .from("enrollment_policies")
    .upsert({ institution_id: institutionId, ...input })
    .select()
    .single();
  if (error) throw error;
  return data;
}
