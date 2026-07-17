import type { Database } from "../../../shared/lib/supabase/database.types";
export type AcademicYear =
  Database["public"]["Tables"]["academic_years"]["Row"];
export type AcademicYearStatus = AcademicYear["status"];
