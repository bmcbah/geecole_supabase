import { supabase } from "../../../shared/lib/supabase/client";
import type {
  DuplicateCandidate,
  EnrollmentInput,
  StudentListItem,
} from "../types/schooling";

export type GuardianLinkInput = {
  guardianId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  relationship: string;
  primary: boolean;
  financial: boolean;
  emergency: boolean;
};

export type StudentGuardian = {
  id: string;
  first_name: string;
  last_name: string;
  primary_phone: string;
  relationship: string;
  is_primary_contact: boolean;
  is_financial_responsible: boolean;
  is_emergency_contact: boolean;
};

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
  const annualLevelIds = [
    ...new Set(
      enrollments
        .map((item) => item.academic_year_level_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [{ data: students, error: studentError }, { data: links, error: linkError }, annualLevelsResult] =
    await Promise.all([
      supabase.from("students").select("*").in("id", studentIds),
      supabase.from("student_guardians").select("*").in("student_id", studentIds),
      annualLevelIds.length
        ? supabase
            .from("academic_year_levels")
            .select("id,level_name_snapshot,cycle_name_snapshot")
            .in("id", annualLevelIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (studentError) throw studentError;
  if (linkError) throw linkError;
  if (annualLevelsResult.error) throw annualLevelsResult.error;

  const guardianIds = [
    ...new Set((links ?? []).map((item) => item.guardian_id)),
  ];
  const { data: guardians, error: guardianError } = guardianIds.length
    ? await supabase.from("guardians").select("*").in("id", guardianIds)
    : { data: [], error: null };
  if (guardianError) throw guardianError;

  return enrollments.flatMap((enrollment) => {
    const student = students.find((item) => item.id === enrollment.student_id);
    if (!student) return [];

    const studentLinks = (links ?? []).filter(
      (item) => item.student_id === student.id,
    );
    const link =
      studentLinks.find((item) => item.is_primary_contact) ?? studentLinks[0];
    const guardian = guardians.find((item) => item.id === link?.guardian_id);
    const annualLevel = (annualLevelsResult.data ?? []).find(
      (item) => item.id === enrollment.academic_year_level_id,
    );

    return [
      {
        id: student.id,
        enrollmentId: enrollment.id,
        matricule: student.matricule,
        firstName: student.first_name,
        lastName: student.last_name,
        gender: student.gender,
        birthDate: student.birth_date,
        status: enrollment.status as StudentListItem["status"],
        cycleName:
          enrollment.cycle_name_snapshot?.trim() ||
          annualLevel?.cycle_name_snapshot?.trim() ||
          "Cycle non défini",
        levelName:
          enrollment.level_name_snapshot?.trim() ||
          annualLevel?.level_name_snapshot?.trim() ||
          "Niveau non défini",
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

export async function linkGuardian(input: {
  studentId: string;
  guardianId: string;
  relationship: string;
  primary: boolean;
  financial: boolean;
  emergency: boolean;
}) {
  const { error } = await supabase.rpc("link_student_guardian", {
    target_student_id: input.studentId,
    target_guardian_id: input.guardianId,
    guardian_relationship: input.relationship,
    primary_contact: input.primary,
    financial_responsible: input.financial,
    emergency_contact: input.emergency,
    pickup_allowed: false,
    communications_enabled: true,
  });
  if (error) throw error;
}

export async function createAndLinkGuardian(input: {
  studentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  relationship: string;
  primary: boolean;
  financial: boolean;
  emergency: boolean;
}) {
  const { data, error } = await supabase.rpc("create_and_link_guardian", {
    target_student_id: input.studentId,
    guardian_first_name: input.firstName,
    guardian_last_name: input.lastName,
    guardian_phone: input.phone,
    guardian_relationship: input.relationship,
    primary_contact: input.primary,
    financial_responsible: input.financial,
    emergency_contact: input.emergency,
  });
  if (error) throw error;
  return data;
}

async function attachGuardian(studentId: string, guardian: GuardianLinkInput) {
  if (guardian.guardianId) {
    await linkGuardian({
      studentId,
      guardianId: guardian.guardianId,
      relationship: guardian.relationship,
      primary: guardian.primary,
      financial: guardian.financial,
      emergency: guardian.emergency,
    });
    return;
  }
  await createAndLinkGuardian({ studentId, ...guardian });
}

export async function createEnrollment(
  institutionId: string,
  yearId: string,
  input: EnrollmentInput,
  additionalGuardians: GuardianLinkInput[] = [],
) {
  const { data: enrollmentId, error } = await supabase.rpc(
    "create_student_enrollment",
    {
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
    },
  );
  if (error) throw error;

  if (additionalGuardians.length) {
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("id", enrollmentId)
      .single();
    if (enrollmentError) throw enrollmentError;
    for (const guardian of additionalGuardians) {
      await attachGuardian(enrollment.student_id, guardian);
    }
  }

  return enrollmentId;
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

  const guardians: StudentGuardian[] = linksResult.data
    .map((link) => {
      const guardian = guardianResult.data.find(
        (item) => item.id === link.guardian_id,
      );
      return guardian
        ? {
            ...guardian,
            relationship: link.relationship,
            is_primary_contact: link.is_primary_contact,
            is_financial_responsible: link.is_financial_responsible,
            is_emergency_contact: link.is_emergency_contact,
          }
        : null;
    })
    .filter((guardian): guardian is StudentGuardian => Boolean(guardian))
    .sort(
      (left, right) =>
        Number(right.is_primary_contact) - Number(left.is_primary_contact),
    );

  return {
    student: studentResult.data,
    enrollment: enrollmentResult.data,
    guardians,
  };
}

export async function updateStudent(
  studentId: string,
  input: {
    first_name: string;
    last_name: string;
    birth_date: string | null;
    birth_place: string;
    address: string;
  },
) {
  const { error } = await supabase
    .from("students")
    .update(input)
    .eq("id", studentId);
  if (error) throw error;
}

export async function updateGuardian(
  guardianId: string,
  input: { first_name: string; last_name: string; primary_phone: string },
) {
  const { error } = await supabase
    .from("guardians")
    .update(input)
    .eq("id", guardianId);
  if (error) throw error;
}

export async function updateStudentGuardian(
  studentId: string,
  guardianId: string,
  input: {
    firstName: string;
    lastName: string;
    phone: string;
    relationship: string;
    primary: boolean;
    financial: boolean;
    emergency: boolean;
  },
) {
  await updateGuardian(guardianId, {
    first_name: input.firstName,
    last_name: input.lastName,
    primary_phone: input.phone,
  });
  if (input.primary) {
    const { error: resetError } = await supabase
      .from("student_guardians")
      .update({ is_primary_contact: false })
      .eq("student_id", studentId);
    if (resetError) throw resetError;
  }
  const { error } = await supabase
    .from("student_guardians")
    .update({
      relationship: input.relationship,
      is_primary_contact: input.primary,
      is_financial_responsible: input.financial,
      is_emergency_contact: input.emergency,
    })
    .eq("student_id", studentId)
    .eq("guardian_id", guardianId);
  if (error) throw error;
}

export async function removeStudentGuardian(
  studentId: string,
  guardianId: string,
) {
  const { count, error: countError } = await supabase
    .from("student_guardians")
    .select("guardian_id", { count: "exact", head: true })
    .eq("student_id", studentId);
  if (countError) throw countError;
  if ((count ?? 0) <= 1) {
    throw new Error("Un élève doit conserver au moins un responsable.");
  }
  const { error } = await supabase
    .from("student_guardians")
    .delete()
    .eq("student_id", studentId)
    .eq("guardian_id", guardianId);
  if (error) throw error;
}

export async function changeEnrollmentStatus(
  enrollmentId: string,
  status: "confirmed" | "cancelled" | "rejected" | "withdrawn" | "transferred",
  reason?: string,
) {
  const { error } = await supabase.rpc("change_enrollment_status", {
    target_enrollment_id: enrollmentId,
    target_status: status,
    change_reason: reason ?? null,
  });
  if (error) throw error;
}
