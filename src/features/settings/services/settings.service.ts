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
      "clone_academic_year_configuration",
      { source_year_id: input.sourceYearId, target_year_id: data.id },
    );
    if (cloneError) throw cloneError;
    const { error: periodsError } = await supabase.rpc(
      "sync_all_academic_year_periods",
      { target_year_id: data.id },
    );
    if (periodsError) throw periodsError;
  }
  return data;
}

export interface CloneOptions {
  structure: boolean;
  subjects: boolean;
  assessments: boolean;
  finance: boolean;
  users: boolean;
}

export async function cloneAcademicYearConfiguration(
  sourceYearId: string,
  targetYearId: string,
  options: CloneOptions,
) {
  const { data, error } = await supabase.rpc(
    "clone_academic_year_configuration",
    {
      source_year_id: sourceYearId,
      target_year_id: targetYearId,
      include_structure: options.structure,
      include_subjects: options.subjects,
      include_assessments: options.assessments,
      include_finance: options.finance,
      include_users: options.users,
    },
  );
  if (error) throw error;
  if (options.structure) {
    const { error: periodsError } = await supabase.rpc(
      "sync_all_academic_year_periods",
      { target_year_id: targetYearId },
    );
    if (periodsError) throw periodsError;
  }
  return data;
}

export async function getAcademicYearConfigurationCounts(yearId: string) {
  const tables = [
    "academic_year_levels",
    "annual_subjects",
    "assessment_types",
    "grading_formulas",
    "financial_rules",
    "academic_year_user_assignments",
  ] as const;
  const results = await Promise.all(
    tables.map((table) =>
      supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("academic_year_id", yearId),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
  return {
    structure: results[0]!.count ?? 0,
    subjects: results[1]!.count ?? 0,
    assessments: results[2]!.count ?? 0,
    formulas: results[3]!.count ?? 0,
    finance: results[4]!.count ?? 0,
    users: results[5]!.count ?? 0,
  };
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
