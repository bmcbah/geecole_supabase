import { supabase } from "../../../shared/lib/supabase/client";
import { listTeacherProfiles } from "./teachers.service";

export interface TeachingAssignment {
  id: string;
  institution_id: string;
  academic_year_id: string;
  teacher_user_id: string;
  class_id: string;
  annual_subject_id: string;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
}

export interface PeriodSubjectResultInput {
  institution_id: string;
  academic_year_id: string;
  academic_period_id: string;
  class_id: string;
  annual_subject_id: string;
  enrollment_id: string;
  grading_formula_id: string | null;
  grading_formula_version: number | null;
  variables: Record<string, number | null>;
  result: number | null;
  status: "draft" | "calculated" | "validated";
  teacher_comment: string | null;
}

export async function listTeachers(institutionId: string, yearId: string) {
  const profiles = await listTeacherProfiles(institutionId, yearId);
  return profiles.filter((profile) => profile.is_active && profile.employment_status !== "inactive");
}

export async function listTeachingAssignments(yearId: string) {
  const { data, error } = await supabase.from("teaching_assignments").select("*").eq("academic_year_id", yearId).order("created_at");
  if (error) throw error;
  return (data ?? []) as TeachingAssignment[];
}

export async function saveTeachingAssignment(
  institutionId: string,
  yearId: string,
  input: Pick<TeachingAssignment, "teacher_user_id" | "class_id" | "annual_subject_id" | "starts_on" | "ends_on" | "is_active">,
  id?: string,
) {
  const payload = { institution_id: institutionId, academic_year_id: yearId, ...input };
  const query = id ? supabase.from("teaching_assignments").update(payload).eq("id", id) : supabase.from("teaching_assignments").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function deleteTeachingAssignment(id: string) {
  const { error } = await supabase.from("teaching_assignments").delete().eq("id", id);
  if (error) throw error;
}

export async function listMyTeachingAssignments(yearId: string) {
  const { data: userResult } = await supabase.auth.getUser();
  const userId = userResult.user?.id;
  if (!userId) return [] as TeachingAssignment[];
  const { data, error } = await supabase.from("teaching_assignments").select("*").eq("academic_year_id", yearId).eq("teacher_user_id", userId).eq("is_active", true);
  if (error) throw error;
  return (data ?? []) as TeachingAssignment[];
}

export async function upsertPeriodSubjectResults(rows: PeriodSubjectResultInput[]) {
  if (!rows.length) return;
  const { error } = await supabase.from("period_subject_results").upsert(rows, { onConflict: "academic_period_id,annual_subject_id,enrollment_id" });
  if (error) throw error;
}

export async function listDeliberations(periodId: string, classId: string) {
  const { data, error } = await supabase.from("deliberations").select("*").eq("academic_period_id", periodId).eq("class_id", classId).order("rank");
  if (error) throw error;
  return data ?? [];
}

export async function saveDeliberations(rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const { error } = await supabase.from("deliberations").upsert(rows, { onConflict: "academic_period_id,enrollment_id" });
  if (error) throw error;
}

export async function listReportCards(periodId: string, classId: string) {
  const { data, error } = await supabase.from("report_cards").select("*").eq("academic_period_id", periodId).eq("class_id", classId).order("generated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createReportCards(rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const { error } = await supabase.from("report_cards").insert(rows);
  if (error) throw error;
}

export async function publishReportCard(id: string) {
  const { error } = await supabase.rpc("publish_report_card", { target_report_card_id: id });
  if (error) throw error;
}
