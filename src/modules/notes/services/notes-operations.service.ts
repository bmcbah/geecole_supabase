import { supabase } from "../../../shared/lib/supabase/client";
import { listCourseSummaries } from "./notes.service";

export type PostponedResultItem = { id: string; studentName: string; matricule: string; className: string; subjectName: string; noteLabel: string; noteDate: string; impact: string };
export type AppreciationItem = { id: string; studentName: string; matricule: string; className: string; subjectName: string; appreciation: string; updatedAt: string };
export type AverageControlItem = { id: string; classId: string; className: string; subjectName: string; teacherName: string; coefficient: number; notesCount: number; postponedCount: number; state: "ready" | "incomplete" | "not_started" };
export type OperationsMode = "postponed" | "appreciations" | "averages";
export type OperationsFilters = { first: number; rows: number; search?: string; classId?: string; periodId?: string; state?: string };
export type OperationsPage = { rows: (PostponedResultItem | AppreciationItem | AverageControlItem)[]; total: number };

export async function listOperationsContext(institutionId: string, yearId: string) { const [classes, periods] = await Promise.all([supabase.from("school_classes").select("id,name").eq("institution_id",institutionId).eq("academic_year_id",yearId).order("name"),supabase.from("academic_periods").select("id,name").eq("institution_id",institutionId).eq("academic_year_id",yearId).order("sequence")]); if(classes.error)throw classes.error;if(periods.error)throw periods.error;return {classes:classes.data??[],periods:periods.data??[]}; }

export async function listOperationsPage(institutionId:string,yearId:string,mode:OperationsMode,filters:OperationsFilters):Promise<OperationsPage>{
  let studentIds:string[]|undefined;if(filters.search?.trim()){const term=filters.search.trim();const {data,error}=await supabase.from("students").select("id").eq("institution_id",institutionId).or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,matricule.ilike.%${term}%`);if(error)throw error;studentIds=(data??[]).map(i=>i.id);if(!studentIds.length&&mode!=="averages")return{rows:[],total:0};}
  if(mode==="appreciations"){let query=supabase.from("subject_appreciations").select("*",{count:"exact"}).eq("institution_id",institutionId).eq("academic_year_id",yearId);if(studentIds)query=query.in("student_id",studentIds);if(filters.classId)query=query.eq("class_id",filters.classId);if(filters.periodId)query=query.eq("period_id",filters.periodId);query=query.order("updated_at",{ascending:false}).range(filters.first,filters.first+filters.rows-1);const {data,count,error}=await query;if(error)throw error;const all=await listAppreciations(institutionId,yearId);const ids=new Set((data??[]).map(i=>i.id));return{rows:all.filter(i=>ids.has(i.id)),total:count??0};}
  if(mode==="postponed"){let notesQuery=supabase.from("gradebook_notes").select("id").eq("institution_id",institutionId).eq("academic_year_id",yearId);if(filters.classId)notesQuery=notesQuery.eq("class_id",filters.classId);if(filters.periodId)notesQuery=notesQuery.eq("period_id",filters.periodId);const {data:notes,error:notesError}=await notesQuery;if(notesError)throw notesError;const noteIds=(notes??[]).map(n=>n.id);if(!noteIds.length)return{rows:[],total:0};let query=supabase.from("note_results").select("id",{count:"exact"}).eq("institution_id",institutionId).eq("status","postponed").in("note_id",noteIds);if(studentIds)query=query.in("student_id",studentIds);query=query.order("updated_at",{ascending:false}).range(filters.first,filters.first+filters.rows-1);const {data,count,error}=await query;if(error)throw error;const all=await listPostponedResults(institutionId,yearId);const ids=new Set((data??[]).map(i=>i.id));return{rows:all.filter(i=>ids.has(i.id)),total:count??0};}
  const courses=await listAverageControls(institutionId,yearId);const filtered=courses.filter(i=>(!filters.classId||i.classId===filters.classId)&&(!filters.state||i.state===filters.state)&&(!filters.search||`${i.className} ${i.subjectName} ${i.teacherName}`.toLowerCase().includes(filters.search.toLowerCase())));return{rows:filtered.slice(filters.first,filters.first+filters.rows),total:filtered.length};
}

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
  return courses.map((course) => { const courseNotes = (notes.data ?? []).filter((note) => note.class_id === course.classId && note.subject_id === course.subjectId); const noteIds = new Set(courseNotes.map((note) => note.id)); const postponedCount = (results.data ?? []).filter((result) => noteIds.has(result.note_id) && result.status === "postponed").length; return { id: course.assignmentId, classId: course.classId, className: course.className, subjectName: course.subjectName, teacherName: course.teacherName, coefficient: course.coefficient, notesCount: courseNotes.length, postponedCount, state: courseNotes.length === 0 ? "not_started" : postponedCount ? "incomplete" : "ready" }; });
}
