import { supabase } from "../../../shared/lib/supabase/client";

const client = supabase as any;

export async function listClassOccupancy(yearId: string) {
  const [
    { data: classes, error: classError },
    { data: assignments, error: assignmentError },
  ] = await Promise.all([
    client
      .from("school_classes")
      .select("id,name,code,capacity,room,academic_year_level_id,is_active")
      .eq("academic_year_id", yearId)
      .order("name"),
    client
      .from("class_assignments")
      .select("id,class_id,enrollment_id,class_name_snapshot")
      .eq("academic_year_id", yearId)
      .is("ends_on", null),
  ]);
  if (classError) throw classError;
  if (assignmentError) throw assignmentError;
  const counts = new Map<string, number>();
  for (const item of assignments ?? [])
    counts.set(item.class_id, (counts.get(item.class_id) ?? 0) + 1);
  return (classes ?? []).map((item: any) => ({
    ...item,
    occupancy: counts.get(item.id) ?? 0,
  }));
}

export async function listAssignableEnrollments(
  institutionId: string,
  yearId: string,
) {
  const { data, error } = await client
    .from("enrollments")
    .select(
      `
    id,status,academic_year_level_id,level_name_snapshot,cycle_name_snapshot,
    student:students!inner(id,matricule,first_name,last_name),
    class_assignments(id,class_id,class_name_snapshot,ends_on)
  `,
    )
    .eq("institution_id", institutionId)
    .eq("academic_year_id", yearId)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    student: Array.isArray(row.student) ? row.student[0] : row.student,
    currentAssignment:
      (row.class_assignments ?? []).find((item: any) => !item.ends_on) ?? null,
  }));
}

export async function batchAssignEnrollments(
  enrollmentIds: string[],
  classId: string,
  reason?: string,
) {
  const { data, error } = await client.rpc(
    "batch_assign_enrollments_to_class",
    {
      target_enrollment_ids: enrollmentIds,
      target_class_id: classId,
      change_reason: reason?.trim() || null,
    },
  );
  if (error) throw error;
  return data ?? [];
}

export async function listGuardianLinks(institutionId: string) {
  const { data, error } = await client
    .from("student_guardians")
    .select(
      `
    student_id,guardian_id,relationship,is_primary_contact,is_financial_responsible,is_emergency_contact,can_pick_up,receives_communications,
    student:students!inner(id,matricule,first_name,last_name,institution_id),
    guardian:guardians!inner(id,first_name,last_name,primary_phone,secondary_phone,address,occupation)
  `,
    )
    .eq("student.institution_id", institutionId);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    student: Array.isArray(row.student) ? row.student[0] : row.student,
    guardian: Array.isArray(row.guardian) ? row.guardian[0] : row.guardian,
  }));
}

export async function updateGuardianLink(
  studentId: string,
  guardianId: string,
  patch: Record<string, unknown>,
) {
  if (patch.is_primary_contact) {
    const { error: resetError } = await client
      .from("student_guardians")
      .update({ is_primary_contact: false })
      .eq("student_id", studentId);
    if (resetError) throw resetError;
  }
  const { error } = await client
    .from("student_guardians")
    .update(patch)
    .eq("student_id", studentId)
    .eq("guardian_id", guardianId);
  if (error) throw error;
}

export async function unlinkGuardian(studentId: string, guardianId: string) {
  const { count, error: countError } = await client
    .from("student_guardians")
    .select("guardian_id", { count: "exact", head: true })
    .eq("student_id", studentId);
  if (countError) throw countError;
  if ((count ?? 0) <= 1) throw new Error("last_guardian_link");
  const { error } = await client
    .from("student_guardians")
    .delete()
    .eq("student_id", studentId)
    .eq("guardian_id", guardianId);
  if (error) throw error;
}

export async function listDocumentRequirements(
  institutionId: string,
  yearId: string,
) {
  const { data, error } = await client
    .from("enrollment_document_requirements")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("academic_year_id", yearId)
    .order("document_name");
  if (error) throw error;
  return data ?? [];
}

export async function saveDocumentRequirement(
  input: Record<string, unknown>,
  id?: string,
) {
  const query = id
    ? client.from("enrollment_document_requirements").update(input).eq("id", id)
    : client.from("enrollment_document_requirements").insert(input);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function findProbableDuplicates(
  institutionId: string,
  firstName: string,
  lastName: string,
  birthDate?: string,
) {
  const { data, error } = await client.rpc("find_probable_student_duplicates", {
    target_institution_id: institutionId,
    target_first_name: firstName,
    target_last_name: lastName,
    target_birth_date: birthDate || null,
    target_limit: 20,
  });
  if (error) throw error;
  return data ?? [];
}

export async function createImportBatch(
  institutionId: string,
  yearId: string,
  fileName: string,
  rows: Record<string, unknown>[],
) {
  const { data: batch, error: batchError } = await client
    .from("student_import_batches")
    .insert({
      institution_id: institutionId,
      academic_year_id: yearId,
      file_name: fileName,
      total_rows: rows.length,
    })
    .select()
    .single();
  if (batchError) throw batchError;
  const payload = rows.map((row, index) => ({
    batch_id: batch.id,
    row_number: index + 2,
    raw_data: row,
    normalized_data: row,
    status: "pending",
  }));
  if (payload.length) {
    const { error } = await client.from("student_import_rows").insert(payload);
    if (error) throw error;
  }
  return batch;
}

export async function listImportBatches(institutionId: string, yearId: string) {
  const { data, error } = await client
    .from("student_import_batches")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("academic_year_id", yearId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listCertificates(institutionId: string, yearId: string) {
  const { data, error } = await client
    .from("student_certificates")
    .select(`*,student:students(first_name,last_name,matricule)`)
    .eq("institution_id", institutionId)
    .eq("academic_year_id", yearId)
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function issueCertificate(
  enrollmentId: string,
  type: "enrollment" | "schooling" | "transfer" | "withdrawal",
) {
  const { data, error } = await client.rpc("issue_student_certificate", {
    target_enrollment_id: enrollmentId,
    target_type: type,
  });
  if (error) throw error;
  return data as string;
}

export async function listEnrollmentHistory(studentId: string) {
  const { data, error } = await client
    .from("enrollments")
    .select(
      `
    id,status,admission_date,level_name_snapshot,cycle_name_snapshot,academic_year_id,created_at,updated_at,
    academic_year:academic_years(name,status),class_assignments(class_name_snapshot,starts_on,ends_on,change_reason)
  `,
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
