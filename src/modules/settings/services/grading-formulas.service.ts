import { supabase } from "../../../shared/lib/supabase/client";
import type {
  GradingFormula,
  GradingFormulaInput,
} from "../domain/grading-formula";

export async function listGradingFormulas(yearId: string) {
  const { data, error } = await supabase
    .from("grading_formulas")
    .select("*")
    .eq("academic_year_id", yearId)
    .order("is_default", { ascending: false })
    .order("name");

  if (error) throw error;
  return (data ?? []) as unknown as GradingFormula[];
}

export async function saveGradingFormula(
  institutionId: string,
  yearId: string,
  input: GradingFormulaInput,
  id?: string,
) {
  const expression = input.definition.components
    .map((component) => `${component.assessment_type_id}:${component.weight}`)
    .join(" + ");

  const payload = {
    name: input.name.trim(),
    code: input.code.trim().toUpperCase(),
    description: input.description?.trim() || null,
    is_default: input.is_default,
    is_active: input.is_active,
    definition: input.definition,
    expression,
  };

  const { error } = id
    ? await supabase.from("grading_formulas").update(payload).eq("id", id)
    : await supabase.from("grading_formulas").insert({
        institution_id: institutionId,
        academic_year_id: yearId,
        ...payload,
      });

  if (error) throw error;
}

export async function deleteGradingFormula(id: string) {
  const { error } = await supabase.from("grading_formulas").delete().eq("id", id);
  if (error) throw error;
}
