import { supabase } from "../../../shared/lib/supabase/client";
import type { Database } from "../../../shared/lib/supabase/database.types";
export async function listDocumentRequirements(institutionId: string) {
  const { data, error } = await supabase
    .from("document_requirements")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data;
}
export async function saveDocumentRequirement(
  input: Database["public"]["Tables"]["document_requirements"]["Insert"],
  id?: string,
) {
  const query = id
    ? supabase.from("document_requirements").update(input).eq("id", id)
    : supabase.from("document_requirements").insert(input);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}
export async function listStudentDocuments(
  studentId: string,
  enrollmentId?: string,
) {
  let query = supabase
    .from("student_documents")
    .select("*")
    .eq("student_id", studentId);
  if (enrollmentId) query = query.eq("enrollment_id", enrollmentId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
export async function saveStudentDocument(
  input: Database["public"]["Tables"]["student_documents"]["Insert"],
) {
  const { data, error } = await supabase
    .from("student_documents")
    .upsert(input, { onConflict: "student_id,enrollment_id,requirement_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function uploadSchoolFile(path: string, file: File) {
  const { data, error } = await supabase.storage
    .from("school-admin")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return data.path;
}
export async function getSchoolFileUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("school-admin")
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
export async function updateStudentAvatar(studentId: string, path: string) {
  const { error } = await supabase
    .from("students")
    .update({ photo_url: path })
    .eq("id", studentId);
  if (error) throw error;
}
