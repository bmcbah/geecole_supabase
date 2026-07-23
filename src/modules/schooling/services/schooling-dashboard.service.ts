import { supabase } from "../../../shared/lib/supabase/client";
import type { SchoolingDashboard } from "../domain/schooling-dashboard";

const client = supabase as any;

export async function getSchoolingDashboard(
  institutionId: string,
  academicYearId: string,
): Promise<SchoolingDashboard> {
  const { data, error } = await client.rpc("get_schooling_dashboard", {
    target_institution_id: institutionId,
    target_academic_year_id: academicYearId,
  });

  if (error) throw error;
  return data as SchoolingDashboard;
}
