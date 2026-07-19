import { supabase } from "../../../shared/lib/supabase/client";
import type { GradingFormula, GradingFormulaInput } from "../domain/grading-formula";
import { validateFormulaExpression } from "../domain/grading-formula";

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
  return (data ?? []) as GradingFormula[];
}

export async function saveGradingFormula(
  institutionId: string,
  yearId: string,
  input: GradingFormulaInput,
  allowedCodes: string[],
  id?: string,
) {
  const expression = input.expression.trim().toUpperCase();
  const validation = validateFormulaExpression(expression, allowedCodes);
  if (!validation.valid) throw new Error(validation.error ?? "Formule invalide.");

  const payload = {
    name: input.name.trim(),
    code: input.code.trim().toUpperCase(),
    description: input.description?.trim() || null,
    is_default: input.is_default,
    is_active: input.is_active,
    expression,
    definition: {
      language: "geecole-expression-v1",
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
