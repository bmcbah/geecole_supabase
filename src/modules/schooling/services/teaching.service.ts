import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../../../shared/lib/supabase/client";

const teachingDb = supabase as unknown as SupabaseClient;

export type CycleSubject = {
  id: string;
  institution_id: string;
  academic_year_id: string;
  academic_year_cycle_id: string;
  subject_id: string;
  coefficient: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  subject?: {
    id: string;
    name: string;
    code: string;
    description: string | null;
  } | null;
};

export type TeacherOption = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
};

export type TeachingAssignment = {
  id: string;
  institution_id: string;
  academic_year_id: string;
  class_id: string;
  subject_id: string | null;
  teacher_person_id: string;
  assignment_kind: "primary" | "subject";
  whole_year: boolean;
  academic_period_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TeachingAssignmentInput = {
  institutionId: string;
  academicYearId: string;
  classId: string;
  teacherPersonId: string;
  assignmentKind: "primary" | "subject";
  subjectId?: string | null;
  academicPeriodId?: string | null;
  wholeYear: boolean;
  isActive?: boolean;
};

export type Course = {
  id: string;
  institution_id: string;
  academic_year_id: string;
  teaching_assignment_id: string;
  class_id: string;
  subject_id: string;
  teacher_person_id: string;
  whole_year: boolean;
  academic_period_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function listCycleSubjects(academicYearCycleId: string) {
  const { data, error } = await teachingDb
    .from("academic_cycle_subjects")
    .select("*, subject:subjects(id,name,code,description)")
    .eq("academic_year_cycle_id", academicYearCycleId)
    .order("sort_order")
    .order("created_at");

  if (error) throw error;
  return (data ?? []) as CycleSubject[];
}

export async function saveCycleSubject(input: {
  id?: string;
  institutionId: string;
  academicYearId: string;
  academicYearCycleId: string;
  subjectId: string;
  coefficient: number;
  sortOrder: number;
  isActive?: boolean;
}) {
  const payload = {
    institution_id: input.institutionId,
    academic_year_id: input.academicYearId,
    academic_year_cycle_id: input.academicYearCycleId,
    subject_id: input.subjectId,
    coefficient: input.coefficient,
    sort_order: input.sortOrder,
    is_active: input.isActive ?? true,
    updated_at: new Date().toISOString(),
  };

  const query = input.id
    ? teachingDb
        .from("academic_cycle_subjects")
        .update(payload)
        .eq("id", input.id)
    : teachingDb.from("academic_cycle_subjects").insert(payload);

  const { data, error } = await query.select().single();
  if (error) throw error;
  return data as CycleSubject;
}

export async function removeCycleSubject(id: string) {
  const { error } = await teachingDb
    .from("academic_cycle_subjects")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function listTeacherOptions(institutionId: string) {
  const { data: roles, error: roleError } = await teachingDb
    .from("person_roles")
    .select("person_id")
    .eq("institution_id", institutionId)
    .eq("role", "teacher");
  if (roleError) throw roleError;

  const personIds = (roles ?? []).map((role) => String(role.person_id));
  if (!personIds.length) return [];

  const { data, error } = await teachingDb
    .from("people")
    .select("id,first_name,last_name,email,phone")
    .eq("institution_id", institutionId)
    .eq("status", "active")
    .in("id", personIds)
    .order("last_name")
    .order("first_name");

  if (error) throw error;
  return (data ?? []) as TeacherOption[];
}

export async function listTeachingAssignments(
  institutionId: string,
  academicYearId: string,
) {
  const { data, error } = await teachingDb
    .from("teaching_assignments")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("academic_year_id", academicYearId)
    .order("class_id")
    .order("subject_id");

  if (error) throw error;
  return (data ?? []) as TeachingAssignment[];
}

export async function saveTeachingAssignment(
  input: TeachingAssignmentInput,
  id?: string,
) {
  if (input.assignmentKind === "subject" && !input.subjectId) {
    throw new Error("Une matière est obligatoire pour une affectation par matière.");
  }
  if (!input.wholeYear && !input.academicPeriodId) {
    throw new Error("Une période est obligatoire pour une affectation temporaire.");
  }

  const payload = {
    institution_id: input.institutionId,
    academic_year_id: input.academicYearId,
    class_id: input.classId,
    subject_id: input.assignmentKind === "subject" ? input.subjectId : null,
    teacher_person_id: input.teacherPersonId,
    assignment_kind: input.assignmentKind,
    whole_year: input.wholeYear,
    academic_period_id: input.wholeYear ? null : input.academicPeriodId,
    is_active: input.isActive ?? true,
    updated_at: new Date().toISOString(),
  };

  const query = id
    ? teachingDb.from("teaching_assignments").update(payload).eq("id", id)
    : teachingDb.from("teaching_assignments").insert(payload);

  const { data, error } = await query.select().single();
  if (error) throw error;
  return data as TeachingAssignment;
}

export async function removeTeachingAssignment(id: string) {
  const { error } = await teachingDb
    .from("teaching_assignments")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function listCourses(
  institutionId: string,
  academicYearId: string,
) {
  const { data, error } = await teachingDb
    .from("courses")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("academic_year_id", academicYearId)
    .eq("is_active", true)
    .order("class_id")
    .order("subject_id");

  if (error) throw error;
  return (data ?? []) as Course[];
}
