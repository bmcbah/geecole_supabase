import type { Database } from "../../../shared/lib/supabase/database.types";
export type AcademicCycle =
  Database["public"]["Tables"]["academic_cycles"]["Row"];
export type GradeLevel = Database["public"]["Tables"]["grade_levels"]["Row"];
