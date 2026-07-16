import { supabase } from "../../../shared/lib/supabase/client";
import type { StructureItemInput } from "../schemas/academic-structure.schema";

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

const payload = (input: StructureItemInput) => ({
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
    ? supabase.from("academic_cycles").update(payload(input)).eq("id", id)
    : supabase
        .from("academic_cycles")
        .insert({ institution_id: institutionId, ...payload(input) });
  const { error } = await query;
  if (error) throw error;
}
export async function saveLevel(
  institutionId: string,
  cycleId: string,
  input: StructureItemInput,
  id?: string,
) {
  const query = id
    ? supabase.from("grade_levels").update(payload(input)).eq("id", id)
    : supabase.from("grade_levels").insert({
        institution_id: institutionId,
        cycle_id: cycleId,
        ...payload(input),
      });
  const { error } = await query;
  if (error) throw error;
}
