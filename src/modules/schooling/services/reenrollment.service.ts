import { supabase } from "../../../shared/lib/supabase/client";
import type { Database } from "../../../shared/lib/supabase/database.types";

export type ReenrollmentPolicy =
  Database["public"]["Tables"]["reenrollment_policies"]["Row"];

export async function getReenrollmentPolicy(institutionId: string) {
  const { data, error } = await supabase
    .from("reenrollment_policies")
    .select("*")
    .eq("institution_id", institutionId)
    .single();
  if (error) throw error;
  return data;
}

export async function saveReenrollmentPolicy(
  institutionId: string,
  input: Database["public"]["Tables"]["reenrollment_policies"]["Update"],
) {
  const { data, error } = await supabase
    .from("reenrollment_policies")
    .upsert({ institution_id: institutionId, ...input })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function reenrollStudent(input: {
  sourceEnrollmentId: string;
  academicYearId: string;
  annualLevelId: string;
  decision: string;
  status: "draft" | "pre_registered" | "confirmed";
  reason: string;
}) {
  const { data, error } = await supabase.rpc("reenroll_student", {
    source_enrollment: input.sourceEnrollmentId,
    target_academic_year: input.academicYearId,
    target_annual_level: input.annualLevelId,
    target_decision: input.decision,
    target_enrollment_status: input.status,
    target_reason: input.reason || null,
  });
  if (error) throw error;
  return data;
}

export type BatchReenrollmentResult = {
  source_enrollment_id: string;
  student_id: string;
  status: "created" | "error";
  enrollment_id?: string;
  target_level?: string;
  reason?: string;
};

export async function batchReenrollStudents(
  enrollmentIds: string[],
  academicYearId: string,
) {
  const { data, error } = await supabase.rpc("batch_reenroll_students", {
    source_enrollments: enrollmentIds,
    target_academic_year: academicYearId,
  });
  if (error) throw error;
  return data as unknown as BatchReenrollmentResult[];
}
