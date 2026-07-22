import { supabase } from "../../../shared/lib/supabase/client";

export type FeeScope = "institution" | "cycle" | "level";

export type FeeType = {
  id: string;
  institution_id: string;
  catalog_id: string | null;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FeeScheduleItem = {
  id: string;
  institution_id: string;
  academic_year_id: string;
  fee_schedule_id: string;
  fee_type_id: string;
  scope: FeeScope;
  amount: number;
  cycle_ids: string[];
  level_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  fee_type?: Pick<FeeType, "id" | "name" | "code" | "is_active"> | null;
};

const db = supabase as any;

export async function listFeeTypes(institutionId: string) {
  const { data, error } = await db
    .from("fee_types")
    .select("*")
    .eq("institution_id", institutionId)
    .is("archived_at", null)
    .order("name");
  if (error) throw error;
  return (data ?? []) as FeeType[];
}

export async function saveFeeType(
  institutionId: string,
  input: Pick<FeeType, "name" | "code" | "description" | "is_active">,
  id?: string,
) {
  const payload = {
    ...input,
    institution_id: institutionId,
    code: input.code.trim().toUpperCase(),
  };
  const query = id
    ? db.from("fee_types").update(payload).eq("id", id)
    : db.from("fee_types").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function archiveFeeType(id: string) {
  const { error } = await db
    .from("fee_types")
    .update({ is_active: false, archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function installFeeTypeCatalog(institutionId: string) {
  const { data, error } = await db.rpc("install_fee_type_catalog", {
    target_institution_id: institutionId,
  });
  if (error) throw error;
  return data as number;
}

export async function ensureFeeSchedule(
  institutionId: string,
  academicYearId: string,
) {
  const { data: existing, error: readError } = await db
    .from("fee_schedules")
    .select("id")
    .eq("institution_id", institutionId)
    .eq("academic_year_id", academicYearId)
    .maybeSingle();
  if (readError) throw readError;
  if (existing?.id) return existing.id as string;

  const { data, error } = await db
    .from("fee_schedules")
    .insert({ institution_id: institutionId, academic_year_id: academicYearId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function listFeeScheduleItems(
  institutionId: string,
  academicYearId: string,
) {
  const { data, error } = await db
    .from("fee_schedule_items")
    .select("*, fee_type:fee_types(id,name,code,is_active)")
    .eq("institution_id", institutionId)
    .eq("academic_year_id", academicYearId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as FeeScheduleItem[];
}

export async function saveFeeScheduleItem(
  institutionId: string,
  academicYearId: string,
  input: {
    fee_type_id: string;
    scope: FeeScope;
    amount: number;
    cycle_ids: string[];
    level_ids: string[];
    is_active: boolean;
  },
  id?: string,
) {
  const feeScheduleId = await ensureFeeSchedule(institutionId, academicYearId);
  const payload = {
    institution_id: institutionId,
    academic_year_id: academicYearId,
    fee_schedule_id: feeScheduleId,
    fee_type_id: input.fee_type_id,
    scope: input.scope,
    amount: input.amount,
    cycle_ids: input.scope === "cycle" ? input.cycle_ids : [],
    level_ids: input.scope === "level" ? input.level_ids : [],
    is_active: input.is_active,
  };
  const query = id
    ? db.from("fee_schedule_items").update(payload).eq("id", id)
    : db.from("fee_schedule_items").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function deleteFeeScheduleItem(id: string) {
  const { error } = await db.from("fee_schedule_items").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateFeeSchedule(
  institutionId: string,
  sourceAcademicYearId: string,
  targetAcademicYearId: string,
) {
  const { error } = await db.rpc("duplicate_fee_schedule", {
    target_institution_id: institutionId,
    source_academic_year_id: sourceAcademicYearId,
    target_academic_year_id: targetAcademicYearId,
  });
  if (error) throw error;
}
