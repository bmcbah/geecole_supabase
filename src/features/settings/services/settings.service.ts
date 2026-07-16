import { supabase } from "../../../shared/lib/supabase/client";
import type { Database } from "../../../shared/lib/supabase/database.types";
import type {
  AcademicYearInput,
  InstitutionSettingsInput,
} from "../schemas/settings.schema";
import type { AcademicYearStatus } from "../types/settings";

function toDateOnly(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function updateInstitution(
  id: string,
  input: InstitutionSettingsInput,
) {
  const payload: InstitutionUpdate = {
    ...input,
    phone: input.phone || null,
    email: input.email || null,
    address: input.address || null,
  };
  const { data, error } = await supabase
    .from("institutions")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

type InstitutionUpdate = Database["public"]["Tables"]["institutions"]["Update"];

export async function listAcademicYears(institutionId: string) {
  const { data, error } = await supabase
    .from("academic_years")
    .select("*")
    .eq("institution_id", institutionId)
    .order("starts_on", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createAcademicYear(
  institutionId: string,
  input: AcademicYearInput,
) {
  const { data, error } = await supabase
    .from("academic_years")
    .insert({
      institution_id: institutionId,
      name: input.name,
      starts_on: toDateOnly(input.startsOn),
      ends_on: toDateOnly(input.endsOn),
    })
    .select("id")
    .single();
  if (error) throw error;
  if (input.sourceYearId) {
    const { error: cloneError } = await supabase.rpc(
      "clone_academic_year_levels",
      { source_year_id: input.sourceYearId, target_year_id: data.id },
    );
    if (cloneError) throw cloneError;
  }
  return data;
}

export async function changeAcademicYearStatus(
  id: string,
  status: AcademicYearStatus,
) {
  const { error } = await supabase
    .from("academic_years")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAcademicYear(id: string) {
  const { error } = await supabase.from("academic_years").delete().eq("id", id);
  if (error) throw error;
}
