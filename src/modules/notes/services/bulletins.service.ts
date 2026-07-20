import { supabase } from "../../../shared/lib/supabase/client";
import type { Json } from "../../../shared/lib/supabase/database.types";

export type BulletinBatchRow = { id: string; periodName: string; scope: string; status: string; total: number; generated: number; blocked: number; createdAt: string };
export type BulletinRow = { id: string; studentName: string; matricule: string; className: string; periodName: string; version: number; status: "generated" | "pending_validation" | "validated" | "published" | "rejected" | "replaced"; createdAt: string; snapshot: Json };

export async function listGenerationContext(institutionId: string, yearId: string) {
  const [periods, classes] = await Promise.all([
    supabase.from("academic_periods").select("id,name,cycle_id,sequence").eq("institution_id", institutionId).eq("academic_year_id", yearId).order("sequence"),
    supabase.from("school_classes").select("id,name,academic_year_level_id").eq("institution_id", institutionId).eq("academic_year_id", yearId).eq("is_active", true).order("name"),
  ]); if (periods.error) throw periods.error; if (classes.error) throw classes.error;
  return { periods: periods.data ?? [], classes: classes.data ?? [] };
}

export async function listBatches(institutionId: string, yearId: string): Promise<BulletinBatchRow[]> {
  const [batches, periods] = await Promise.all([
    supabase.from("bulletin_generation_batches").select("*").eq("institution_id", institutionId).eq("academic_year_id", yearId).order("created_at", { ascending: false }),
    supabase.from("academic_periods").select("id,name").eq("institution_id", institutionId).eq("academic_year_id", yearId),
  ]); if (batches.error) throw batches.error; if (periods.error) throw periods.error;
  return (batches.data ?? []).map((row) => ({ id: row.id, periodName: periods.data?.find((p) => p.id === row.period_id)?.name ?? "—", scope: row.scope_type === "class" ? "Classe" : "Établissement", status: row.status, total: row.total_count, generated: row.generated_count, blocked: row.blocked_count, createdAt: row.created_at }));
}

export async function generateBulletins(input: { institutionId: string; yearId: string; periodId: string; classId?: string }) {
  const { data: auth } = await supabase.auth.getUser();
  const { data: batch, error: batchError } = await supabase.from("bulletin_generation_batches").insert({ institution_id: input.institutionId, academic_year_id: input.yearId, period_id: input.periodId, scope_type: input.classId ? "class" : "school", scope_ids: input.classId ? [input.classId] : [], initiated_by: auth.user?.id }).select("id").single();
  if (batchError) throw batchError;
  const { data: enrollments, error } = await supabase.from("enrollments").select("id,student_id").eq("institution_id", input.institutionId).eq("academic_year_id", input.yearId).eq("status", "confirmed"); if (error) throw error;
  const { data: assignments, error: assignmentError } = await supabase.from("class_assignments").select("enrollment_id,class_id").eq("institution_id", input.institutionId).eq("academic_year_id", input.yearId).is("ends_on", null); if (assignmentError) throw assignmentError;
  const selected = (enrollments ?? []).flatMap((enrollment) => { const assignment = assignments?.find((item) => item.enrollment_id === enrollment.id); return assignment && (!input.classId || assignment.class_id === input.classId) ? [{ ...enrollment, classId: assignment.class_id }] : []; });
  let generated = 0; let blocked = 0;
  for (const enrollment of selected) {
    const { data: notes } = await supabase.from("gradebook_notes").select("id,label,subject_id,scale_snapshot").eq("period_id", input.periodId).eq("class_id", enrollment.classId);
    const noteIds = (notes ?? []).map((n) => n.id);
    const { data: results } = noteIds.length ? await supabase.from("note_results").select("note_id,value,status,comment").eq("student_id", enrollment.student_id).in("note_id", noteIds) : { data: [] };
    const postponed = (results ?? []).some((result) => result.status === "postponed");
    if (postponed) { blocked += 1; const { error: itemError } = await supabase.from("bulletin_generation_items").insert({ institution_id: input.institutionId, batch_id: batch.id, enrollment_id: enrollment.id, student_id: enrollment.student_id, class_id: enrollment.classId, status: "blocked", issue_code: "POSTPONED_RESULT", message: "Un résultat reporté bloque le calcul." }); if (itemError) throw itemError; continue; }
    const { data: previous } = await supabase.from("bulletin_versions").select("version").eq("enrollment_id", enrollment.id).eq("period_id", input.periodId).order("version", { ascending: false }).limit(1);
    const { data: bulletin, error: bulletinError } = await supabase.from("bulletin_versions").insert({ institution_id: input.institutionId, academic_year_id: input.yearId, period_id: input.periodId, enrollment_id: enrollment.id, student_id: enrollment.student_id, class_id: enrollment.classId, batch_id: batch.id, version: (previous?.[0]?.version ?? 0) + 1, snapshot: { notes: notes ?? [], results: results ?? [], generated_at: new Date().toISOString() } }).select("id").single(); if (bulletinError) throw bulletinError;
    generated += 1; const { error: itemError } = await supabase.from("bulletin_generation_items").insert({ institution_id: input.institutionId, batch_id: batch.id, enrollment_id: enrollment.id, student_id: enrollment.student_id, class_id: enrollment.classId, status: "generated", bulletin_version_id: bulletin.id }); if (itemError) throw itemError;
  }
  const status = blocked && generated ? "partial" : blocked ? "failed" : "completed";
  const { error: updateError } = await supabase.from("bulletin_generation_batches").update({ status, total_count: selected.length, generated_count: generated, blocked_count: blocked, completed_at: new Date().toISOString() }).eq("id", batch.id); if (updateError) throw updateError;
  return { generated, blocked };
}

export async function listBulletins(institutionId: string, yearId: string): Promise<BulletinRow[]> {
  const [versions, students, classes, periods] = await Promise.all([
    supabase.from("bulletin_versions").select("*").eq("institution_id", institutionId).eq("academic_year_id", yearId).order("created_at", { ascending: false }),
    supabase.from("students").select("id,first_name,last_name,matricule").eq("institution_id", institutionId), supabase.from("school_classes").select("id,name").eq("academic_year_id", yearId), supabase.from("academic_periods").select("id,name").eq("academic_year_id", yearId),
  ]); for (const result of [versions, students, classes, periods]) if (result.error) throw result.error;
  return (versions.data ?? []).map((row) => { const student = students.data?.find((item) => item.id === row.student_id); return { id: row.id, studentName: student ? `${student.first_name} ${student.last_name}` : "Élève", matricule: student?.matricule ?? "—", className: classes.data?.find((item) => item.id === row.class_id)?.name ?? "—", periodName: periods.data?.find((item) => item.id === row.period_id)?.name ?? "—", version: row.version, status: row.status, createdAt: row.created_at, snapshot: row.snapshot }; });
}

export async function changeBulletinStatus(id: string, status: BulletinRow["status"], comment?: string) { const { data: auth } = await supabase.auth.getUser(); const now = new Date().toISOString(); const patch = status === "validated" ? { status, validation_comment: comment ?? null, validated_by: auth.user?.id, validated_at: now } : status === "published" ? { status, published_by: auth.user?.id, published_at: now } : { status, validation_comment: comment ?? null }; const { error } = await supabase.from("bulletin_versions").update(patch).eq("id", id); if (error) throw error; }
