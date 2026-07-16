import { supabase } from "../../../shared/lib/supabase/client";
import type { StructureItemInput } from "../schemas/academic-structure.schema";

export async function listCycleCatalog(institutionId: string) {
  const [catalogResult, activationResult] = await Promise.all([
    supabase
      .from("cycle_catalog")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("institution_cycles")
      .select("*")
      .eq("institution_id", institutionId),
  ]);
  if (catalogResult.error) throw catalogResult.error;
  if (activationResult.error) throw activationResult.error;
  return catalogResult.data.map((catalog) => ({
    ...catalog,
    activation:
      activationResult.data.find(
        (item) => item.catalog_cycle_id === catalog.id,
      ) ?? null,
  }));
}

export async function setInstitutionCycle(
  institutionId: string,
  catalogCycleId: string,
  active: boolean,
  yearId?: string,
) {
  const { error } = await supabase.rpc("set_institution_cycle", {
    target_institution_id: institutionId,
    target_catalog_cycle_id: catalogCycleId,
    target_active: active,
    target_year_id: yearId ?? null,
  });
  if (error) throw error;
}

export async function listAcademicStructure(institutionId: string) {
  const [cyclesResult, levelsResult] = await Promise.all([
    supabase
      .from("academic_cycles")
      .select("*")
      .eq("institution_id", institutionId)
      .order("sort_order")
      .order("name"),
    supabase
      .from("grade_levels")
      .select("*")
      .eq("institution_id", institutionId)
      .order("sort_order")
      .order("name"),
  ]);
  if (cyclesResult.error) throw cyclesResult.error;
  if (levelsResult.error) throw levelsResult.error;
  return { cycles: cyclesResult.data, levels: levelsResult.data };
}

export async function listAnnualAcademicLevels(academicYearId: string) {
  const { data, error } = await supabase
    .from("academic_year_levels")
    .select("*")
    .eq("academic_year_id", academicYearId)
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data;
}
export async function listAnnualAcademicCycles(academicYearId: string) {
  const { data, error } = await supabase
    .from("academic_year_cycles")
    .select("*")
    .eq("academic_year_id", academicYearId)
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return data;
}

export async function saveAnnualAcademicCycle(
  academicYearId: string,
  input: StructureItemInput,
  id?: string,
) {
  const { data, error } = await supabase.rpc("save_academic_year_cycle", {
    target_year_id: academicYearId,
    target_annual_cycle_id: id ?? null,
    cycle_name: input.name,
    cycle_code: input.code.toUpperCase(),
    cycle_sort_order: input.sortOrder,
    cycle_period_system: input.periodSystem ?? "term",
    cycle_period_count: input.periodCount ?? 3,
    cycle_is_active: input.isActive,
    cycle_subjects_period_scope: input.subjectsPeriodScope ?? "all",
    cycle_grading_scale: input.gradingScale ?? 20,
    cycle_pass_average: input.passAverage ?? 10,
    cycle_ranking_enabled: input.rankingEnabled ?? true,
    cycle_absences_on_report: input.absencesOnReport ?? true,
  });
  if (error) throw error;
  return data;
}

export async function deleteAnnualAcademicCycle(id: string) {
  const { error } = await supabase
    .from("academic_year_cycles")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function setAnnualCycleLevels(
  academicYearId: string,
  cycleId: string,
  levelIds: string[],
) {
  const { data, error } = await supabase.rpc("set_academic_year_cycle_levels", {
    target_year_id: academicYearId,
    target_cycle_id: cycleId,
    target_level_ids: levelIds,
  });
  if (error) throw error;
  return data;
}

export async function listAcademicPeriods(yearId: string) {
  const { data, error } = await supabase
    .from("academic_periods")
    .select("*")
    .eq("academic_year_id", yearId)
    .order("sequence");
  if (error) throw error;
  return data;
}
export async function configureCyclePeriods(
  cycleId: string,
  periodSystem: string,
  periodCount: number,
) {
  const { error } = await supabase
    .from("academic_cycles")
    .update({ period_system: periodSystem, period_count: periodCount })
    .eq("id", cycleId);
  if (error) throw error;
}
export async function generateAcademicPeriods(yearId: string, cycleId: string) {
  const { data, error } = await supabase.rpc("sync_academic_year_periods", {
    target_year_id: yearId,
    target_cycle_id: cycleId,
  });
  if (error) throw error;
  return data;
}
export async function saveAcademicPeriod(
  input: {
    name: string;
    code: string;
    starts_on: string;
    ends_on: string;
    status: string;
  },
  id: string,
) {
  const { error } = await supabase
    .from("academic_periods")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

const itemPayload = (input: StructureItemInput) => ({
  name: input.name,
  code: input.code,
  sort_order: input.sortOrder,
  is_active: input.isActive,
});
export async function saveCycle(
  institutionId: string,
  input: StructureItemInput,
  id?: string,
) {
  const query = id
    ? supabase
        .from("academic_cycles")
        .update({
          ...itemPayload(input),
          period_system: input.periodSystem ?? "term",
          period_count: input.periodCount ?? 3,
        })
        .eq("id", id)
        .select()
        .single()
    : supabase
        .from("academic_cycles")
        .insert({
          institution_id: institutionId,
          ...itemPayload(input),
          period_system: input.periodSystem ?? "term",
          period_count: input.periodCount ?? 3,
        })
        .select()
        .single();
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
export async function saveLevel(
  institutionId: string,
  cycleId: string,
  input: StructureItemInput,
  id?: string,
) {
  const query = id
    ? supabase
        .from("grade_levels")
        .update({
          ...itemPayload(input),
          capacity: input.capacity ?? null,
          repeat_allowed: input.repeatAllowed ?? true,
        })
        .eq("id", id)
        .select()
        .single()
    : supabase
        .from("grade_levels")
        .insert({
          institution_id: institutionId,
          cycle_id: cycleId,
          ...itemPayload(input),
          capacity: input.capacity ?? null,
          repeat_allowed: input.repeatAllowed ?? true,
        })
        .select()
        .single();
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
export async function deleteCycle(id: string) {
  const { error } = await supabase
    .from("academic_cycles")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
export async function deleteLevel(id: string) {
  const { error } = await supabase.from("grade_levels").delete().eq("id", id);
  if (error) throw error;
}
