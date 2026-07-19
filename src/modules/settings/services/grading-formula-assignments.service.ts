import { supabase } from "../../../shared/lib/supabase/client";
import type {
  GradingFormulaAssignment,
  GradingFormulaAssignmentInput,
} from "../domain/grading-formula-assignment";

const assignmentsTable = () =>
  supabase.from("grading_formula_assignments") as unknown as {
    select: (columns: string) => any;
    insert: (values: Record<string, unknown>) => any;
    update: (values: Record<string, unknown>) => any;
    delete: () => any;
  };

export async function listGradingFormulaAssignments(yearId: string) {
  const { data, error } = await assignmentsTable()
    .select("*")
    .eq("academic_year_id", yearId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as GradingFormulaAssignment[];
}

export async function saveGradingFormulaAssignment(
  institutionId: string,
  yearId: string,
  input: GradingFormulaAssignmentInput,
  id?: string,
) {
  const hasScope = Boolean(
    input.academic_cycle_id ||
      input.academic_year_level_id ||
      input.annual_subject_id ||
      input.period_id,
  );
  if (!hasScope) throw new Error("Sélectionnez au moins un périmètre d’affectation.");

  const query = id
    ? assignmentsTable().update(input).eq("id", id)
    : assignmentsTable().insert({
        institution_id: institutionId,
        academic_year_id: yearId,
        ...input,
      });
  const { error } = await query;
  if (error) throw error;
}

export async function deleteGradingFormulaAssignment(id: string) {
  const { error } = await assignmentsTable().delete().eq("id", id);
  if (error) throw error;
}
