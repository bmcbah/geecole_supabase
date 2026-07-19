import { supabase } from "../../../shared/lib/supabase/client";
import type {
  AssessmentType,
  AssessmentTypeInput,
} from "../domain/assessment-type";

const assessmentTypesTable = () =>
  supabase.from("assessment_types") as unknown as {
    select: (columns: string) => any;
    insert: (values: Record<string, unknown>) => any;
    update: (values: Record<string, unknown>) => any;
    delete: () => any;
  };

export async function listAssessmentTypes(yearId: string) {
  const { data, error } = await assessmentTypesTable()
    .select("*")
    .eq("academic_year_id", yearId)
    .order("sort_order")
    .order("name");

  if (error) throw error;
  return (data ?? []) as AssessmentType[];
}

export async function saveAssessmentType(
  institutionId: string,
  yearId: string,
  input: AssessmentTypeInput,
  id?: string,
) {
  const payload = {
    ...input,
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    icon: input.icon.trim() || "pi pi-file-edit",
    color: input.color.trim() || "#64748b",
    weight: 1,
  };

  const query = id
    ? assessmentTypesTable().update(payload).eq("id", id)
    : assessmentTypesTable().insert({
        institution_id: institutionId,
        academic_year_id: yearId,
        ...payload,
      });

  const { error } = await query;
  if (error) throw error;
}

export async function deleteAssessmentType(id: string) {
  const { error } = await assessmentTypesTable().delete().eq("id", id);
  if (error) throw error;
}
