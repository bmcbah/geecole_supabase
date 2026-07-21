import { supabase } from "../../../shared/lib/supabase/client";
import type { Database } from "../../../shared/lib/supabase/database.types";

export async function listSubjects(institutionId: string) {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("institution_id", institutionId)
    .order("name");
  if (error) throw error;
  return data;
}
export async function saveSubject(
  institutionId: string,
  input: { name: string; code: string; is_active: boolean },
  id?: string,
) {
  const query = id
    ? supabase.from("subjects").update(input).eq("id", id)
    : supabase
        .from("subjects")
        .insert({ institution_id: institutionId, ...input });
  const { error } = await query;
  if (error) throw error;
}
export async function deleteSubject(id: string) {
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw error;
}

export async function listAnnualSubjects(yearId: string) {
  const { data, error } = await supabase
    .from("annual_subjects")
    .select("*")
    .eq("academic_year_id", yearId)
    .order("subject_name_snapshot");
  if (error) throw error;
  return data;
}
export async function saveAnnualSubject(
  institutionId: string,
  yearId: string,
  input: {
    academic_year_level_id: string;
    subject_id: string;
    coefficient: number;
    weekly_hours: number;
    applies_all_periods: boolean;
    period_ids: string[];
  },
  id?: string,
) {
  const body = {
    institution_id: institutionId,
    academic_year_id: yearId,
    subject_name_snapshot: "",
    ...input,
  };
  const query = id
    ? supabase.from("annual_subjects").update(input).eq("id", id)
    : supabase.from("annual_subjects").insert(body);
  const { error } = await query;
  if (error) throw error;
}
export async function deleteAnnualSubject(id: string) {
  const { error } = await supabase
    .from("annual_subjects")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
export async function setAnnualLevelSubjects(
  yearLevelId: string,
  subjectIds: string[],
) {
  const { data, error } = await supabase.rpc("set_annual_level_subjects", {
    target_year_level_id: yearLevelId,
    target_subject_ids: subjectIds,
  });
  if (error) throw error;
  return data;
}

export async function listAssessmentTypes(yearId: string) {
  const { data, error } = await supabase
    .from("assessment_types")
    .select("*")
    .eq("academic_year_id", yearId)
    .order("name");
  if (error) throw error;
  return data;
}
export const recommendedAssessmentTypes = [
  { name: "Interrogation", code: "INTERRO", scale: 20 },
  { name: "Devoir surveillé", code: "DS", scale: 20 },
  { name: "Devoir à domicile", code: "DM", scale: 20 },
  { name: "Composition", code: "COMPO", scale: 20 },
  { name: "Examen blanc", code: "EXAM-BLANC", scale: 20 },
  { name: "Évaluation orale", code: "ORAL", scale: 20 },
  { name: "Travaux pratiques", code: "TP", scale: 20 },
  { name: "Projet", code: "PROJET", scale: 20 },
] as const;
export async function installRecommendedAssessmentTypes(
  institutionId: string,
  yearId: string,
) {
  const { error } = await supabase.rpc("install_assessment_type_catalog", {
    target_institution_id: institutionId,
    target_year_id: yearId,
  });
  if (error) throw error;
}
export async function saveAssessmentType(
  institutionId: string,
  yearId: string,
  input: {
    name: string;
    code: string;
    weight: number;
    scale: number;
    is_active: boolean;
  },
  id?: string,
) {
  const query = id
    ? supabase.from("assessment_types").update(input).eq("id", id)
    : supabase.from("assessment_types").insert({
        institution_id: institutionId,
        academic_year_id: yearId,
        ...input,
      });
  const { error } = await query;
  if (error) throw error;
}
export async function deleteAssessmentType(id: string) {
  const { error } = await supabase
    .from("assessment_types")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function listGradingFormulas(yearId: string) {
  const { data, error } = await supabase
    .from("grading_formulas")
    .select("*")
    .eq("academic_year_id", yearId)
    .order("name");
  if (error) throw error;
  return data;
}
export async function saveGradingFormula(
  institutionId: string,
  yearId: string,
  input: {
    name: string;
    code: string;
    expression: string;
    description: string | null;
    is_default: boolean;
  },
  id?: string,
) {
  const query = id
    ? supabase.from("grading_formulas").update(input).eq("id", id)
    : supabase.from("grading_formulas").insert({
        institution_id: institutionId,
        academic_year_id: yearId,
        ...input,
      });
  const { error } = await query;
  if (error) throw error;
}
export async function deleteGradingFormula(id: string) {
  const { error } = await supabase
    .from("grading_formulas")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export type VersionedFormulaListItem = {
  seriesId: string;
  versionId: string;
  name: string;
  code: string;
  version: number;
  rules: { expression: string; rounding: number };
  assignmentId: string | null;
  scopeType: "cycle" | "level" | null;
  scopeId: string | null;
};

export async function listVersionedGradingFormulas(
  yearId: string,
): Promise<VersionedFormulaListItem[]> {
  const [series, versions, assignments] = await Promise.all([
    supabase
      .from("grading_formula_series")
      .select("*")
      .eq("academic_year_id", yearId)
      .order("name"),
    supabase
      .from("grading_formula_versions")
      .select("*")
      .eq("academic_year_id", yearId)
      .order("version", { ascending: false }),
    supabase
      .from("grading_formula_assignments")
      .select("*")
      .eq("academic_year_id", yearId)
      .order("created_at", { ascending: false }),
  ]);
  for (const result of [series, versions, assignments])
    if (result.error) throw result.error;
  return (series.data ?? []).flatMap((item) =>
    (versions.data ?? [])
      .filter((version) => version.series_id === item.id)
      .map((version) => {
        const formulaAssignments = (assignments.data ?? []).filter(
          (entry) => entry.formula_version_id === version.id,
        );
        const assignment =
          formulaAssignments.find((entry) => entry.is_active) ??
          formulaAssignments[0];
        return {
          seriesId: item.id,
          versionId: version.id,
          name: item.name,
          code: item.code,
          version: version.version,
          rules: version.rules as unknown as VersionedFormulaListItem["rules"],
          assignmentId: assignment?.is_active ? assignment.id : null,
          scopeType: assignment?.academic_year_level_id
            ? "level"
            : assignment?.cycle_id
              ? "cycle"
              : null,
          scopeId:
            assignment?.academic_year_level_id ?? assignment?.cycle_id ?? null,
        };
      }),
  );
}

export async function createGradingFormulaVersion(input: {
  institutionId: string;
  yearId: string;
  name: string;
  code: string;
  seriesId?: string;
  expression: string;
  rounding: number;
  scopeType: "cycle" | "level";
  scopeId: string;
}) {
  let seriesId = input.seriesId;
  if (!seriesId) {
    const { data, error } = await supabase
      .from("grading_formula_series")
      .insert({
        institution_id: input.institutionId,
        academic_year_id: input.yearId,
        name: input.name,
        code: input.code,
        formula_type: "course_average",
      })
      .select("id")
      .single();
    if (error) throw error;
    seriesId = data.id;
  }
  const { data: existing, error: existingError } = await supabase
    .from("grading_formula_versions")
    .select("version")
    .eq("series_id", seriesId)
    .order("version", { ascending: false })
    .limit(1);
  if (existingError) throw existingError;
  const { data: version, error: versionError } = await supabase
    .from("grading_formula_versions")
    .insert({
      institution_id: input.institutionId,
      academic_year_id: input.yearId,
      series_id: seriesId,
      version: (existing?.[0]?.version ?? 0) + 1,
      rules: { expression: input.expression.trim(), rounding: input.rounding },
    })
    .select("id")
    .single();
  if (versionError) throw versionError;
  const scopeColumn =
    input.scopeType === "level" ? "academic_year_level_id" : "cycle_id";
  const { error: deactivateError } = await supabase
    .from("grading_formula_assignments")
    .update({ is_active: false })
    .eq("academic_year_id", input.yearId)
    .eq(scopeColumn, input.scopeId)
    .eq("is_active", true);
  if (deactivateError) throw deactivateError;
  const { error: assignmentError } = await supabase
    .from("grading_formula_assignments")
    .insert({
      institution_id: input.institutionId,
      academic_year_id: input.yearId,
      formula_version_id: version.id,
      cycle_id: input.scopeType === "cycle" ? input.scopeId : null,
      academic_year_level_id:
        input.scopeType === "level" ? input.scopeId : null,
    });
  if (assignmentError) throw assignmentError;
}

export async function activateGradingFormulaVersion(input: {
  institutionId: string;
  yearId: string;
  versionId: string;
  scopeType: "cycle" | "level";
  scopeId: string;
}) {
  const scopeColumn =
    input.scopeType === "level" ? "academic_year_level_id" : "cycle_id";
  const { error } = await supabase
    .from("grading_formula_assignments")
    .update({ is_active: false })
    .eq("academic_year_id", input.yearId)
    .eq(scopeColumn, input.scopeId)
    .eq("is_active", true);
  if (error) throw error;
  const { error: insertError } = await supabase
    .from("grading_formula_assignments")
    .insert({
      institution_id: input.institutionId,
      academic_year_id: input.yearId,
      formula_version_id: input.versionId,
      cycle_id: input.scopeType === "cycle" ? input.scopeId : null,
      academic_year_level_id:
        input.scopeType === "level" ? input.scopeId : null,
    });
  if (insertError) throw insertError;
}

export async function listFinancialRules(yearId: string) {
  const { data, error } = await supabase
    .from("financial_rules")
    .select("*")
    .eq("academic_year_id", yearId)
    .order("name");
  if (error) throw error;
  return data;
}
export async function listFinancialRuleLevels(yearId: string) {
  const { data, error } = await supabase
    .from("financial_rule_levels")
    .select("*")
    .eq("academic_year_id", yearId);
  if (error) throw error;
  return data;
}
export async function saveFinancialRule(
  institutionId: string,
  yearId: string,
  input: {
    name: string;
    code: string;
    amount: number;
    due_day: number | null;
    frequency: string;
    is_active: boolean;
    fee_type: string;
    is_mandatory: boolean;
    discount_allowed: boolean;
    amount_editable: boolean;
    installment_count: number;
  },
  id?: string,
) {
  const query = id
    ? supabase
        .from("financial_rules")
        .update(input)
        .eq("id", id)
        .select("id")
        .single()
    : supabase
        .from("financial_rules")
        .insert({
          institution_id: institutionId,
          academic_year_id: yearId,
          ...input,
        })
        .select("id")
        .single();
  const { data, error } = await query;
  if (error) throw error;
  return data.id;
}
export async function setFinancialRuleLevels(
  ruleId: string,
  levelIds: string[],
) {
  const { error } = await supabase.rpc("set_financial_rule_levels", {
    target_rule_id: ruleId,
    target_level_ids: levelIds,
  });
  if (error) throw error;
}
export async function deleteFinancialRule(id: string) {
  const { error } = await supabase
    .from("financial_rules")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function listYearAssignments(yearId: string) {
  const { data, error } = await supabase
    .from("academic_year_user_assignments")
    .select("*")
    .eq("academic_year_id", yearId);
  if (error) throw error;
  return data;
}
export async function saveYearAssignment(
  institutionId: string,
  yearId: string,
  input: {
    membership_id: string;
    responsibility: string | null;
    is_active: boolean;
  },
  id?: string,
) {
  const query = id
    ? supabase.from("academic_year_user_assignments").update(input).eq("id", id)
    : supabase.from("academic_year_user_assignments").insert({
        institution_id: institutionId,
        academic_year_id: yearId,
        ...input,
      });
  const { error } = await query;
  if (error) throw error;
}
export async function deleteYearAssignment(id: string) {
  const { error } = await supabase
    .from("academic_year_user_assignments")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function listInstitutionMembers(institutionId: string) {
  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("*")
    .eq("institution_id", institutionId)
    .order("created_at");
  if (error) throw error;
  const userIds = memberships.map((item) => item.user_id);
  const { data: profiles, error: profileError } = userIds.length
    ? await supabase.from("profiles").select("*").in("id", userIds)
    : { data: [], error: null };
  if (profileError) throw profileError;
  return memberships.map((membership) => ({
    ...membership,
    profile:
      profiles.find((profile) => profile.id === membership.user_id) ?? null,
  }));
}
export async function updateMembership(
  id: string,
  input: {
    role: "owner" | "admin" | "secretary" | "teacher" | "finance";
    status: "active" | "suspended";
  },
) {
  const { error } = await supabase
    .from("memberships")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function listPeople(institutionId: string) {
  const [{ data: people, error }, { data: roles, error: rolesError }] =
    await Promise.all([
      supabase
        .from("people")
        .select("*")
        .eq("institution_id", institutionId)
        .order("last_name"),
      supabase
        .from("person_roles")
        .select("*")
        .eq("institution_id", institutionId),
    ]);
  if (error) throw error;
  if (rolesError) throw rolesError;
  return people.map((person) => ({
    ...person,
    roles: roles
      .filter((role) => role.person_id === person.id)
      .map((role) => role.role),
  }));
}
export async function savePerson(
  institutionId: string,
  input: {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    status: string;
    roles: Database["public"]["Enums"]["app_role"][];
  },
) {
  const { data, error } = await supabase.rpc("save_person", {
    target_institution_id: institutionId,
    target_person_id: input.id ?? null,
    person_first_name: input.firstName,
    person_last_name: input.lastName,
    person_email: input.email,
    person_phone: input.phone,
    person_status: input.status,
    assigned_roles: input.roles,
  });
  if (error) throw error;
  return data;
}
export async function deletePerson(id: string) {
  const { error } = await supabase.from("people").delete().eq("id", id);
  if (error) throw error;
}
export async function invitePerson(id: string) {
  const { data, error } = await supabase.rpc("create_person_invitation", {
    target_person_id: id,
  });
  if (error) throw error;
  return data;
}
export async function listPersonInvitations(institutionId: string) {
  const { data, error } = await supabase
    .from("person_invitations")
    .select("*")
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
