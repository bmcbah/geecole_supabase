import { supabase } from "../../../shared/lib/supabase/client";

const client = supabase as any;

export type EnrollmentWorkflowStatus =
  | "draft"
  | "pre_registered"
  | "confirmed"
  | "rejected"
  | "withdrawn"
  | "cancelled"
  | "transferred";

export type EnrollmentWorkflowRow = {
  id: string;
  status: EnrollmentWorkflowStatus;
  admission_date: string;
  created_at: string;
  updated_at: string;
  level_name_snapshot: string;
  cycle_name_snapshot: string;
  cancellation_reason: string | null;
  student: {
    id: string;
    matricule: string;
    first_name: string;
    last_name: string;
    birth_date: string | null;
  };
  assignment: Array<{ class_id: string; class_name: string }>;
};

export async function listEnrollmentWorkflows(
  institutionId: string,
  academicYearId: string,
) {
  const { data, error } = await client
    .from("enrollments")
    .select(
      `
      id,status,admission_date,created_at,updated_at,level_name_snapshot,cycle_name_snapshot,cancellation_reason,
      student:students!inner(id,matricule,first_name,last_name,birth_date),
      assignment:class_assignments(class_id,class_name_snapshot,ends_on)
    `,
    )
    .eq("institution_id", institutionId)
    .eq("academic_year_id", academicYearId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    student: Array.isArray(row.student) ? row.student[0] : row.student,
    assignment: (row.assignment ?? [])
      .filter((item: any) => !item.ends_on)
      .map((item: any) => ({
        class_id: item.class_id,
        class_name: item.class_name_snapshot ?? "Classe",
      })),
  })) as EnrollmentWorkflowRow[];
}

export async function changeEnrollmentStatus(
  enrollmentId: string,
  status: EnrollmentWorkflowStatus,
  reason?: string,
) {
  const { error } = await client.rpc("change_enrollment_status", {
    target_enrollment_id: enrollmentId,
    target_status: status,
    change_reason: reason?.trim() || null,
  });
  if (error) throw error;
}

export type AttendanceRow = {
  id: string;
  attendance_date: string;
  slot_label: string | null;
  kind: "absence" | "late";
  justification_status: "unjustified" | "pending" | "justified";
  reason: string | null;
  enrollment: {
    id: string;
    student: {
      id: string;
      matricule: string;
      first_name: string;
      last_name: string;
    };
  };
};

export async function listAttendance(
  institutionId: string,
  academicYearId: string,
) {
  const { data, error } = await client
    .from("student_attendance_records")
    .select(
      `
      id,attendance_date,slot_label,kind,justification_status,reason,
      enrollment:enrollments!inner(id,student:students!inner(id,matricule,first_name,last_name))
    `,
    )
    .eq("institution_id", institutionId)
    .eq("academic_year_id", academicYearId)
    .order("attendance_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => {
    const enrollment = Array.isArray(row.enrollment)
      ? row.enrollment[0]
      : row.enrollment;
    return {
      ...row,
      enrollment: {
        ...enrollment,
        student: Array.isArray(enrollment?.student)
          ? enrollment.student[0]
          : enrollment?.student,
      },
    };
  }) as AttendanceRow[];
}

export async function createAttendance(input: {
  institutionId: string;
  academicYearId: string;
  enrollmentId: string;
  classId?: string;
  date: string;
  slot?: string;
  kind: "absence" | "late";
  reason?: string;
}) {
  const { error } = await client.from("student_attendance_records").insert({
    institution_id: input.institutionId,
    academic_year_id: input.academicYearId,
    enrollment_id: input.enrollmentId,
    class_id: input.classId || null,
    attendance_date: input.date,
    slot_label: input.slot?.trim() || null,
    kind: input.kind,
    reason: input.reason?.trim() || null,
  });
  if (error) throw error;
}

export async function createAttendanceBatch(input: {
  institutionId: string;
  academicYearId: string;
  enrollmentIds: string[];
  date: string;
  slot?: string;
  kind: "absence" | "late";
  reason?: string;
}) {
  if (!input.enrollmentIds.length) return;
  const rows = input.enrollmentIds.map((enrollmentId) => ({
    institution_id: input.institutionId,
    academic_year_id: input.academicYearId,
    enrollment_id: enrollmentId,
    class_id: input.classId || null,
    attendance_date: input.date,
    slot_label: input.slot?.trim() || null,
    kind: input.kind,
    reason: input.reason?.trim() || null,
  }));
  const { error } = await client
    .from("student_attendance_records")
    .insert(rows);
  if (error) throw error;
}

export async function updateAttendanceJustification(
  id: string,
  status: "unjustified" | "pending" | "justified",
  reason?: string,
) {
  const { error } = await client
    .from("student_attendance_records")
    .update({ justification_status: status, reason: reason?.trim() || null })
    .eq("id", id);
  if (error) throw error;
}

export type EnrollmentDocumentStatus =
  "requested" | "received" | "verified" | "rejected" | "expired";

export type EnrollmentDocumentRow = {
  id: string;
  document_code: string;
  document_name: string;
  status: EnrollmentDocumentStatus;
  storage_path: string | null;
  rejection_reason: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  enrollment: {
    id: string;
    level_name_snapshot: string;
    cycle_name_snapshot: string;
    student: {
      id: string;
      matricule: string;
      first_name: string;
      last_name: string;
    };
    class_assignments: Array<{
      class_name_snapshot: string;
      ends_on: string | null;
    }>;
  };
};

export async function listEnrollmentDocuments(
  institutionId: string,
  academicYearId: string,
) {
  const { data, error } = await client
    .from("enrollment_documents")
    .select(
      `
      id,document_code,document_name,status,storage_path,rejection_reason,verified_at,created_at,updated_at,
      enrollment:enrollments!inner(
        id,academic_year_id,level_name_snapshot,cycle_name_snapshot,
        student:students!inner(id,matricule,first_name,last_name),
        class_assignments(class_name_snapshot,ends_on)
      )
    `,
    )
    .eq("institution_id", institutionId)
    .eq("enrollment.academic_year_id", academicYearId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => {
    const enrollment = Array.isArray(row.enrollment)
      ? row.enrollment[0]
      : row.enrollment;
    return {
      ...row,
      enrollment: {
        ...enrollment,
        student: Array.isArray(enrollment?.student)
          ? enrollment.student[0]
          : enrollment?.student,
        class_assignments: enrollment?.class_assignments ?? [],
      },
    };
  }) as EnrollmentDocumentRow[];
}

export async function updateEnrollmentDocumentStatus(
  id: string,
  status: EnrollmentDocumentStatus,
  rejectionReason?: string,
) {
  const patch: Record<string, unknown> = {
    status,
    rejection_reason:
      status === "rejected" ? rejectionReason?.trim() || null : null,
  };
  if (status === "verified") patch.verified_at = new Date().toISOString();
  const { error } = await client
    .from("enrollment_documents")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}
