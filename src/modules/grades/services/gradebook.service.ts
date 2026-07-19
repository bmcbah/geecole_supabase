import { supabase } from "../../../shared/lib/supabase/client";
import type { Assessment, AssessmentInput, GradeEntry, GradebookRow } from "../domain/gradebook";

const assessmentsTable = () => supabase.from("assessments") as any;
const gradesTable = () => supabase.from("student_grades") as any;

export async function listAssessments(yearId: string) {
  const { data, error } = await assessmentsTable()
    .select("*")
    .eq("academic_year_id", yearId)
    .neq("status", "cancelled")
    .order("assessment_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Assessment[];
}

export async function saveAssessment(
  institutionId: string,
  yearId: string,
  input: AssessmentInput,
  id?: string,
) {
  const payload = {
    ...input,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    institution_id: institutionId,
    academic_year_id: yearId,
  };
  const query = id
    ? assessmentsTable().update(payload).eq("id", id)
    : assessmentsTable().insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function updateAssessmentStatus(id: string, status: Assessment["status"]) {
  const { error } = await assessmentsTable().update({ status }).eq("id", id);
  if (error) throw error;
}

export async function loadGradebook(assessment: Assessment): Promise<GradebookRow[]> {
  const [{ data: assignments, error: assignmentsError }, { data: grades, error: gradesError }] = await Promise.all([
    supabase
      .from("class_assignments")
      .select("enrollment_id,enrollments!inner(id,student_id,status,students!inner(id,matricule,first_name,last_name))")
      .eq("class_id", assessment.class_id)
      .is("ends_on", null),
    gradesTable().select("enrollment_id,status,score,comment").eq("assessment_id", assessment.id),
  ]);
  if (assignmentsError) throw assignmentsError;
  if (gradesError) throw gradesError;

  const gradeByEnrollment = new Map((grades ?? []).map((grade: any) => [grade.enrollment_id, grade]));
  return (assignments ?? []).map((assignment: any) => {
    const enrollment = assignment.enrollments;
    const student = enrollment.students;
    const grade = gradeByEnrollment.get(assignment.enrollment_id) as any;
    return {
      enrollment_id: assignment.enrollment_id,
      student_id: student.id,
      matricule: student.matricule,
      full_name: `${student.last_name} ${student.first_name}`.trim(),
      status: grade?.status ?? "missing",
      score: grade?.score ?? null,
      comment: grade?.comment ?? null,
    } as GradebookRow;
  }).sort((a: GradebookRow, b: GradebookRow) => a.full_name.localeCompare(b.full_name, "fr"));
}

export async function saveGradebook(assessmentId: string, rows: GradeEntry[]) {
  const { error } = await supabase.rpc("save_assessment_grades" as never, {
    target_assessment_id: assessmentId,
    grade_rows: rows,
  } as never);
  if (error) throw error;
}
