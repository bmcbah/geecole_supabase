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

export async function listAssessmentTypes(yearId: string) {
  const { data, error } = await supabase
    .from("assessment_types")
    .select("*")
    .eq("academic_year_id", yearId)
    .order("name");
  if (error) throw error;
  return data;
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

export async function listFinancialRules(yearId: string) {
  const { data, error } = await supabase
    .from("financial_rules")
    .select("*")
    .eq("academic_year_id", yearId)
    .order("name");
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
  },
  id?: string,
) {
  const query = id
    ? supabase.from("financial_rules").update(input).eq("id", id)
    : supabase.from("financial_rules").insert({
        institution_id: institutionId,
        academic_year_id: yearId,
        ...input,
      });
  const { error } = await query;
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
