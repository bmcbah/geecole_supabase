import { supabase } from "../../../shared/lib/supabase/client";
import type { Database } from "../../../shared/lib/supabase/database.types";
export type SchoolClass = Database["public"]["Tables"]["school_classes"]["Row"];
export async function listClasses(yearId: string) {
  const { data, error } = await supabase
    .from("school_classes")
    .select("*")
    .eq("academic_year_id", yearId)
    .order("name");
  if (error) throw error;
  return data;
}
export async function saveClass(
  input: Database["public"]["Tables"]["school_classes"]["Insert"],
  id?: string,
) {
  const query = id
    ? supabase.from("school_classes").update(input).eq("id", id)
    : supabase.from("school_classes").insert(input);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}
export async function archiveClass(id: string) {
  const { error } = await supabase
    .from("school_classes")
    .update({ is_active: false })
    .eq("id", id);
  if (error) throw error;
}
export async function assignEnrollment(
  enrollmentId: string,
  classId: string,
  reason?: string,
) {
  const { error } = await supabase.rpc("assign_enrollment_to_class", {
    target_enrollment: enrollmentId,
    target_class: classId,
    change_reason: reason ?? null,
  });
  if (error) throw error;
}
export async function listAssignments(yearId: string) {
  const { data, error } = await supabase
    .from("class_assignments")
    .select("*")
    .eq("academic_year_id", yearId)
    .is("ends_on", null);
  if (error) throw error;
  return data;
}
