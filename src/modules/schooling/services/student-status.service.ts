import { supabase } from "../../../shared/lib/supabase/client";

export async function changeStudentStatus(studentId: string, status: "active" | "inactive") {
  const { error } = await supabase.from("students").update({ status }).eq("id", studentId);
  if (error) throw error;
}
