import { supabase } from "../../../shared/lib/supabase/client";
import { listCourseSummaries } from "./notes.service";

export type PostponedResultItem = { id: string; studentName: string; matricule: string; className: string; subjectName: string; noteLabel: string; noteDate: string; impact: string };
export type AppreciationItem = { id: string; studentName: string; matricule: string; className: string; subjectName: string; appreciation: string; updatedAt: string };
export type AverageControlItem = { id: string; className: string; subjectName: string; teacherName: string; coefficient: number; notesCount: number; postponedCount: number; state: "ready" | "incomplete" | "not_started" };

export async function listPostponedResults(institutionId: string, yearId: string): Promise<PostponedResultItem[]> {
  const [results, notes, students, classes, subjects] = await Promise.all([
    supabase.from("note_results").select("id,note_id,student_id").eq("institution_id", institutionId).eq("status", "postponed"),
    supabase.from("gradebook_notes").select("id,academic_year_id,class_id,subject_id,label,note_date").eq("institution_id", institutionId).eq("academic_year_id", yearId),
    supabase.from("students").select("id,first_name,last_name,matricule").eq("institution_id", institutionId),
    supabase.from("school_classes").select("id,name").eq("institution_id", institutionId).eq("academic_year_id", yearId),
    supabase.from("subjects").select("id,name").eq("institution_id", institutionId),
  ]);
  for (const result of [results, notes, students, classes, subjects]) if (result.error) throw result.error;
  return (results.data ?? []).flatMap((result) => {
    const note = notes.data?.find((item) => item.id === result.note_id); const student = students.data?.find((item) => item.id === result.student_id);
    if (!note || !student) return [];
    return [{ id: result.id, studentName: `${student.first_name} ${student.last_name}`, matricule: student.matricule, className: classes.data?.find((item) => item.id === note.class_id)?.name ?? "—", subjectName: subjects.data?.find((item) => item.id === note.subject_id)?.name ?? "—", noteLabel: note.label, noteDate: note.note_date, impact: "Moyenne et bulletin bloqués" }];
  });
}

export async function listAppreciations(institutionId: string, yearId: string): Promise<AppreciationItem[]> {
  const [items, students, classes, subjects] = await Promise.all([
    supabase.from("subject_appreciations").select("*").eq("institution_id", institutionId).eq("academic_year_id", yearId).order("updated_at", { ascending: false }),
    supabase.from("students").select("id,first_name,last_name,matricule").eq("institution_id", institutionId),
    supabase.from("school_classes").select("id,name").eq("institution_id", institutionId).eq("academic_year_id", yearId),
    supabase.from("subjects").select("id,name").eq("institution_id", institutionId),
  ]);
  for (const result of [items, students, classes, subjects]) if (result.error) throw result.error;
  return (items.data ?? []).map((item) => { const student = students.data?.find((entry) => entry.id === item.student_id); return { id: item.id, studentName: student ? `${student.first_name} ${student.last_name}` : "Élève", matricule: student?.matricule ?? "—", className: classes.data?.find((entry) => entry.id === item.class_id)?.name ?? "—", subjectName: subjects.data?.find((entry) => entry.id === item.subject_id)?.name ?? "—", appreciation: item.appreciation, updatedAt: item.updated_at }; });
}

export async function listAverageControls(institutionId: string, yearId: string): Promise<AverageControlItem[]> {
  const courses = await listCourseSummaries(institutionId, yearId);
  const [notes, results] = await Promise.all([
    supabase.from("gradebook_notes").select("id,class_id,subject_id").eq("institution_id", institutionId).eq("academic_year_id", yearId),
    supabase.from("note_results").select("note_id,status").eq("institution_id", institutionId),
  ]);
  if (notes.error) throw notes.error; if (results.error) throw results.error;
  return courses.map((course) => { const courseNotes = (notes.data ?? []).filter((note) => note.class_id === course.classId && note.subject_id === course.subjectId); const noteIds = new Set(courseNotes.map((note) => note.id)); const postponedCount = (results.data ?? []).filter((result) => noteIds.has(result.note_id) && result.status === "postponed").length; return { id: course.assignmentId, className: course.className, subjectName: course.subjectName, teacherName: course.teacherName, coefficient: course.coefficient, notesCount: courseNotes.length, postponedCount, state: courseNotes.length === 0 ? "not_started" : postponedCount ? "incomplete" : "ready" }; });
}
