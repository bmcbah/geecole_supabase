import { supabase } from "../../../shared/lib/supabase/client";
import type { FeeScope } from "./school-fees.service";

export type PaymentPlanKind = "cash" | "installments" | "monthly" | "custom";

export type PaymentPlanInstallment = {
  id?: string;
  payment_plan_id?: string;
  sequence: number;
  label: string;
  percentage: number;
  due_date: string;
};

export type PaymentPlan = {
  id: string;
  institution_id: string;
  academic_year_id: string;
  name: string;
  code: string;
  kind: PaymentPlanKind;
  fee_type_ids: string[];
  scope: FeeScope;
  cycle_ids: string[];
  level_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  installments: PaymentPlanInstallment[];
};

export type PaymentPlanInput = Omit<
  PaymentPlan,
  "id" | "created_at" | "updated_at" | "installments"
> & {
  installments: PaymentPlanInstallment[];
};

const db = supabase as any;

export async function listPaymentPlans(
  institutionId: string,
  academicYearId: string,
) {
  const { data, error } = await db
    .from("payment_plans")
    .select("*, installments:payment_plan_installments(*)")
    .eq("institution_id", institutionId)
    .eq("academic_year_id", academicYearId)
    .order("name");

  if (error) throw error;

  return ((data ?? []) as PaymentPlan[]).map((plan) => ({
    ...plan,
    installments: [...(plan.installments ?? [])].sort(
      (left, right) => left.sequence - right.sequence,
    ),
  }));
}

export async function savePaymentPlan(
  input: PaymentPlanInput,
  id?: string,
) {
  const total = input.installments.reduce(
    (sum, installment) => sum + Number(installment.percentage),
    0,
  );

  if (Math.abs(total - 100) > 0.001) {
    throw new Error("Le total des échéances doit être égal à 100 %.");
  }

  if (input.installments.length === 0) {
    throw new Error("Ajoutez au moins une échéance.");
  }

  const payload = {
    institution_id: input.institution_id,
    academic_year_id: input.academic_year_id,
    name: input.name.trim(),
    code: input.code.trim().toUpperCase(),
    kind: input.kind,
    fee_type_ids: input.fee_type_ids,
    scope: input.scope,
    cycle_ids: input.scope === "cycle" ? input.cycle_ids : [],
    level_ids: input.scope === "level" ? input.level_ids : [],
    is_active: input.is_active,
    updated_at: new Date().toISOString(),
  };

  let paymentPlanId = id;

  if (id) {
    const { error } = await db.from("payment_plans").update(payload).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await db
      .from("payment_plans")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    paymentPlanId = data.id as string;
  }

  const { error: deleteError } = await db
    .from("payment_plan_installments")
    .delete()
    .eq("payment_plan_id", paymentPlanId);
  if (deleteError) throw deleteError;

  const rows = input.installments.map((installment, index) => ({
    payment_plan_id: paymentPlanId,
    sequence: index + 1,
    label: installment.label.trim(),
    percentage: installment.percentage,
    due_date: installment.due_date,
  }));

  const { error: insertError } = await db
    .from("payment_plan_installments")
    .insert(rows);
  if (insertError) throw insertError;
}

export async function setPaymentPlanActive(id: string, isActive: boolean) {
  const { error } = await db
    .from("payment_plans")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deletePaymentPlan(id: string) {
  const { error } = await db.from("payment_plans").delete().eq("id", id);
  if (error) throw error;
}