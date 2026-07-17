import type { Database } from "../../../shared/lib/supabase/database.types";
export type AcademicCycle =
  Database["public"]["Tables"]["academic_cycles"]["Row"];
export type AnnualAcademicCycle =
  Database["public"]["Tables"]["academic_year_cycles"]["Row"];
export type GradeLevel = Database["public"]["Tables"]["grade_levels"]["Row"];
export type AnnualAcademicLevel =
  Database["public"]["Tables"]["academic_year_levels"]["Row"];
