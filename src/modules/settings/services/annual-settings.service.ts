import { supabase } from "../../../shared/lib/supabase/client";

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

export async function installSubjectCatalog(institutionId: string) {
  const { data, error } = await supabase.rpc("install_subject_catalog", {
    target_institution_id: institutionId,
  });
  if (error) throw error;
  return data;
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
  { name: "Interrogation", code: "INTERRO" },
  { name: "Devoir surveillé", code: "DS" },
  { name: "Devoir à domicile", code: "DM" },
  { name: "Composition", code: "COMPO" },
  { name: "Examen blanc", code: "EXAM-BLANC" },
  { name: "Évaluation orale", code: "ORAL" },
  { name: "Travaux pratiques", code: "TP" },
  { name: "Projet", code: "PROJET" },
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
  const { error } = await supabase.rpc("save_grading_formula_version", {
    target_institution_id: input.institutionId,
    target_year_id: input.yearId,
    target_series_id: input.seriesId ?? null,
    formula_name: input.name,
    formula_code: input.code,
    formula_expression: input.expression.trim(),
    formula_rounding: input.rounding,
    scope_type: input.scopeType,
    scope_id: input.scopeId,
  });
  if (error) throw error;
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
    status: "active" | "suspended";
    reason?: string;
  },
) {
  const { error } = await supabase.rpc(
    "set_membership_status" as never,
    {
      target_membership_id: id,
      next_status: input.status,
      status_reason: input.reason ?? null,
    } as never,
  );
  if (error) throw error;
}

export async function listPeople(institutionId: string) {
  const [
    { data: people, error },
    { data: assignments, error: assignmentsError },
    { data: accessProfiles, error: accessProfilesError },
  ] = await Promise.all([
    supabase
      .from("people")
      .select("*")
      .eq("institution_id", institutionId)
      .order("last_name"),
    supabase
      .from("person_access_profiles")
      .select("*")
      .eq("institution_id", institutionId),
    supabase
      .from("access_profiles")
      .select("*")
      .eq("institution_id", institutionId)
      .eq("is_active", true)
      .order("name"),
  ]);
  if (error) throw error;
  if (assignmentsError) throw assignmentsError;
  if (accessProfilesError) throw accessProfilesError;
  return people.map((person) => ({
    ...person,
    access_profiles: assignments
      .filter((assignment) => assignment.person_id === person.id)
      .map((assignment) =>
        accessProfiles.find(
          (profile) => profile.id === assignment.access_profile_id,
        ),
      )
      .filter((profile) => profile !== undefined),
  }));
}

export async function listAccessProfiles(institutionId: string) {
  const { data, error } = await supabase
    .from("access_profiles")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data;
}

export async function listAllAccessProfiles(institutionId: string) {
  const { data, error } = await supabase
    .from("access_profiles")
    .select("*")
    .eq("institution_id", institutionId)
    .order("name");
  if (error) throw error;
  return data;
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
    accessProfileIds: string[];
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
    assigned_access_profile_ids: input.accessProfileIds,
  });
  if (error) throw error;
  return data;
}
export async function deletePerson(id: string) {
  const { error } = await supabase.rpc("delete_person", {
    target_person_id: id,
    deletion_reason: null,
  });
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
