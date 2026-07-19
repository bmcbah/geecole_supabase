import { supabase } from "../../../shared/lib/supabase/client";
import type { GradingFormula, GradingFormulaInput } from "../domain/grading-formula";
import { validateFormulaExpression } from "../domain/grading-formula";

export type FormulaTemporalScope = "year" | "period";

export interface GradingFormulaScopeInput {
  academic_year_cycle_id: string | null;
  academic_year_level_id: string | null;
  annual_subject_id: string | null;
  temporal_scope: FormulaTemporalScope;
  period_index: number | null;
}

const gradingFormulasTable = () =>
  supabase.from("grading_formulas") as unknown as {
    select: (columns: string) => any;
    insert: (values: Record<string, unknown>) => any;
    update: (values: Record<string, unknown>) => any;
    delete: () => any;
  };

export async function listGradingFormulas(yearId: string) {
  const { data, error } = await gradingFormulasTable()
    .select("*")
    .eq("academic_year_id", yearId)
    .order("is_default", { ascending: false })
    .order("name");
  if (error) throw error;
  return (data ?? []) as Array<GradingFormula & GradingFormulaScopeInput>;
}

export async function saveGradingFormula(
  institutionId: string,
  yearId: string,
  input: GradingFormulaInput & GradingFormulaScopeInput,
  allowedCodes: string[],
  id?: string,
) {
  const expression = input.expression.trim().toUpperCase();
  const validation = validateFormulaExpression(expression, allowedCodes);
  if (!validation.valid) throw new Error(validation.error ?? "Formule invalide.");
  if (input.temporal_scope === "period" && (!input.period_index || input.period_index < 1)) {
    throw new Error("Sélectionnez une période valide.");
  }

  const payload = {
    name: input.name.trim(),
    code: input.code.trim().toUpperCase(),
    description: input.description?.trim() || null,
    is_default: input.is_default,
    is_active: input.is_active,
    expression,
    academic_year_cycle_id: input.academic_year_cycle_id,
    academic_year_level_id: input.academic_year_level_id,
    annual_subject_id: input.annual_subject_id,
    temporal_scope: input.temporal_scope,
    period_index: input.temporal_scope === "period" ? input.period_index : null,
    definition: {
      language_version: 1,
      missing_grade_policy: input.missing_grade_policy,
      variables: validation.variables,
    },
  };

  const query = id
    ? gradingFormulasTable().update(payload).eq("id", id)
    : gradingFormulasTable().insert({ institution_id: institutionId, academic_year_id: yearId, ...payload });
  const { error } = await query;
  if (error) throw error;
}

export async function deleteGradingFormula(id: string) {
  const { error } = await gradingFormulasTable().delete().eq("id", id);
  if (error) throw error;
}
