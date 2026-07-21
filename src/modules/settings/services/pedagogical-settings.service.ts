import { supabase } from "../../../shared/lib/supabase/client";
import type { Database } from "../../../shared/lib/supabase/database.types";

export type PedagogicalSettingsInput = Omit<
  Database["public"]["Tables"]["pedagogical_settings"]["Insert"],
  "institution_id" | "academic_year_id"
>;

export async function getPedagogicalSettings(institutionId: string, yearId: string) {
  const { data, error } = await supabase.from("pedagogical_settings").select("*").eq("institution_id", institutionId).eq("academic_year_id", yearId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function savePedagogicalSettings(institutionId: string, yearId: string, input: PedagogicalSettingsInput) {
  const { data, error } = await supabase.from("pedagogical_settings").upsert({ institution_id: institutionId, academic_year_id: yearId, ...input }).select().single();
  if (error) throw error;
  return data;
}
