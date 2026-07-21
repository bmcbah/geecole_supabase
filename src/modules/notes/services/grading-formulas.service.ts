import { supabase } from "../../../shared/lib/supabase/client";
import type { FormulaRules } from "../domain/grading-formula";

export type ResolvedFormula = {
  seriesId: string;
  versionId: string;
  name: string;
  code: string;
  version: number;
  source: "level" | "cycle";
  rules: FormulaRules;
};

export async function resolveFormula(input: {
  institutionId: string;
  yearId: string;
  cycleId: string;
  levelId: string;
}): Promise<ResolvedFormula | null> {
  const { data: assignments, error } = await supabase
    .from("grading_formula_assignments")
    .select("formula_version_id,cycle_id,academic_year_level_id")
    .eq("institution_id", input.institutionId)
    .eq("academic_year_id", input.yearId)
    .eq("is_active", true)
    .or(
      `academic_year_level_id.eq.${input.levelId},cycle_id.eq.${input.cycleId}`,
    );
  if (error) throw error;
  const assignment =
    assignments?.find(
      (item) => item.academic_year_level_id === input.levelId,
    ) ?? assignments?.find((item) => item.cycle_id === input.cycleId);
  if (!assignment) return null;
  const { data: version, error: versionError } = await supabase
    .from("grading_formula_versions")
    .select("id,series_id,version,rules")
    .eq("id", assignment.formula_version_id)
    .single();
  if (versionError) throw versionError;
  const { data: series, error: seriesError } = await supabase
    .from("grading_formula_series")
    .select("name,code")
    .eq("id", version.series_id)
    .single();
  if (seriesError) throw seriesError;
  return {
    seriesId: version.series_id,
    versionId: version.id,
    name: series.name,
    code: series.code,
    version: version.version,
    source: assignment.academic_year_level_id ? "level" : "cycle",
    rules: version.rules as unknown as FormulaRules,
  };
}
