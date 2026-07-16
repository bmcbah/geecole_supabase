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
