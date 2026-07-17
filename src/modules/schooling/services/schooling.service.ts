import { supabase } from "../../../shared/lib/supabase/client";
import type {
  DuplicateCandidate,
  EnrollmentInput,
  StudentListItem,
} from "../types/schooling";

export async function listStudents(
  institutionId: string,
  yearId: string,
): Promise<StudentListItem[]> {
  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("academic_year_id", yearId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!enrollments.length) return [];
  const studentIds = [...new Set(enrollments.map((item) => item.student_id))];
  const { data: students, error: studentError } = await supabase
    .from("students")
    .select("*")
    .in("id", studentIds);
  if (studentError) throw studentError;
  const { data: links, error: linkError } = await supabase
    .from("student_guardians")
    .select("*")
    .in("student_id", studentIds)
    .eq("is_primary_contact", true);
  if (linkError) throw linkError;
  const guardianIds = links.map((item) => item.guardian_id);
  const { data: guardians, error: guardianError } = guardianIds.length
    ? await supabase.from("guardians").select("*").in("id", guardianIds)
    : { data: [], error: null };
  if (guardianError) throw guardianError;
  return enrollments.flatMap((enrollment) => {
    const student = students.find((item) => item.id === enrollment.student_id);
    if (!student) return [];
    const link = links.find((item) => item.student_id === student.id);
    const guardian = guardians.find((item) => item.id === link?.guardian_id);
    return [
      {
        id: student.id,
        matricule: student.matricule,
        firstName: student.first_name,
        lastName: student.last_name,
        gender: student.gender,
        birthDate: student.birth_date,
        status: enrollment.status as StudentListItem["status"],
        cycleName: enrollment.cycle_name_snapshot,
        levelName: enrollment.level_name_snapshot,
        guardianName: guardian
          ? `${guardian.first_name} ${guardian.last_name}`
          : "Non renseigné",
        guardianPhone: guardian?.primary_phone ?? "",
      },
    ];
  });
}

export async function findDuplicateCandidates(
  institutionId: string,
  firstName: string,
  lastName: string,
): Promise<DuplicateCandidate[]> {
  if (firstName.trim().length < 2 || lastName.trim().length < 2) return [];
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("institution_id", institutionId)
    .ilike("last_name", `%${lastName.trim()}%`)
    .ilike("first_name", `%${firstName.trim()}%`)
    .limit(5);
  if (error) throw error;
  return data.map((student) => ({
    id: student.id,
    matricule: student.matricule,
    fullName: `${student.first_name} ${student.last_name}`,
    birthDate: student.birth_date,
  }));
}

export async function searchGuardians(institutionId: string, query: string) {
  const normalized = query.trim();
  if (normalized.length < 3) return [];
  const { data, error } = await supabase
    .from("guardians")
    .select("*")
    .eq("institution_id", institutionId)
    .or(
      `primary_phone.ilike.%${normalized}%,first_name.ilike.%${normalized}%,last_name.ilike.%${normalized}%`,
    )
    .limit(8);
  if (error) throw error;
  return data;
}

export async function createEnrollment(
  institutionId: string,
  yearId: string,
  input: EnrollmentInput,
) {
  const { data, error } = await supabase.rpc("create_student_enrollment", {
    target_institution_id: institutionId,
    target_academic_year_id: yearId,
    target_annual_level_id: input.annualLevelId,
    student_first_name: input.firstName,
    student_last_name: input.lastName,
    student_gender: input.gender,
    student_birth_date: input.birthDate || null,
    student_birth_place: input.birthPlace,
    student_address: input.address,
    guardian_first_name: input.guardianFirstName,
    guardian_last_name: input.guardianLastName,
    guardian_phone: input.guardianPhone,
    guardian_relationship: input.guardianRelationship,
    enrollment_kind: input.kind,
  });
  if (error) throw error;
  return data;
}

export async function getStudent(studentId: string, yearId: string) {
  const [studentResult, enrollmentResult, linksResult] = await Promise.all([
    supabase.from("students").select("*").eq("id", studentId).single(),
    supabase
      .from("enrollments")
      .select("*")
      .eq("student_id", studentId)
      .eq("academic_year_id", yearId)
      .maybeSingle(),
    supabase.from("student_guardians").select("*").eq("student_id", studentId),
  ]);
  if (studentResult.error) throw studentResult.error;
  if (enrollmentResult.error) throw enrollmentResult.error;
  if (linksResult.error) throw linksResult.error;
  const guardianIds = linksResult.data.map((item) => item.guardian_id);
  const guardianResult = guardianIds.length
    ? await supabase.from("guardians").select("*").in("id", guardianIds)
    : { data: [], error: null };
  if (guardianResult.error) throw guardianResult.error;
  return {
    student: studentResult.data,
    enrollment: enrollmentResult.data,
    guardians: guardianResult.data,
  };
}
