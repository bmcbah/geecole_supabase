import { supabase } from "../../../shared/lib/supabase/client";
import type {
  FinancialBenefitTemplate,
  StudentFinancialAdjustment,
} from "../domain/financial-benefit";

const db = supabase as any;

const mapTemplate = (row: any): FinancialBenefitTemplate => ({
  id: row.id,
  institutionId: row.institution_id,
  name: row.name,
  code: row.code,
  description: row.description,
  benefitType: row.benefit_type,
  calculationType: row.calculation_type,
  defaultValue: Number(row.default_value),
  feeTypeIds: row.fee_type_ids ?? [],
  scope: row.scope,
  cycleIds: row.cycle_ids ?? [],
  levelIds: row.level_ids ?? [],
  isStackable: Boolean(row.is_stackable),
  isActive: Boolean(row.is_active),
});

const mapAdjustment = (row: any): StudentFinancialAdjustment => ({
  id: row.id,
  financialAccountId: row.financial_account_id,
  financialItemId: row.financial_item_id,
  templateId: row.template_id,
  templateName: row.template?.name ?? null,
  benefitType: row.benefit_type,
  calculationType: row.calculation_type,
  value: Number(row.value),
  calculatedAmount: Number(row.calculated_amount),
  reason: row.reason,
  externalReference: row.external_reference,
  status: row.status,
  grantedAt: row.granted_at,
  cancelledAt: row.cancelled_at,
  cancellationReason: row.cancellation_reason,
});

export async function listFinancialBenefitTemplates(
  institutionId: string,
): Promise<FinancialBenefitTemplate[]> {
  const { data, error } = await db
    .from("financial_benefit_templates")
    .select("*")
    .eq("institution_id", institutionId)
    .order("name");

  if (error) throw error;
  return (data ?? []).map(mapTemplate);
}

export async function saveFinancialBenefitTemplate(
  institutionId: string,
  input: Omit<FinancialBenefitTemplate, "id" | "institutionId">,
  templateId?: string,
) {
  const payload = {
    institution_id: institutionId,
    name: input.name.trim(),
    code: input.code.trim().toUpperCase(),
    description: input.description?.trim() || null,
    benefit_type: input.benefitType,
    calculation_type: input.calculationType,
    default_value: input.defaultValue,
    fee_type_ids: input.feeTypeIds,
    scope: input.scope,
    cycle_ids: input.scope === "cycle" ? input.cycleIds : [],
    level_ids: input.scope === "level" ? input.levelIds : [],
    is_stackable: input.isStackable,
    is_active: input.isActive,
  };

  const query = templateId
    ? db.from("financial_benefit_templates").update(payload).eq("id", templateId)
    : db.from("financial_benefit_templates").insert(payload);

  const { error } = await query;
  if (error) throw error;
}

export async function listFinancialAdjustments(
  financialAccountId: string,
): Promise<StudentFinancialAdjustment[]> {
  const { data, error } = await db
    .from("student_financial_adjustments")
    .select("*, template:financial_benefit_templates(name)")
    .eq("financial_account_id", financialAccountId)
    .order("granted_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapAdjustment);
}

export async function grantStudentFinancialBenefit(input: {
  financialItemId: string;
  templateId: string;
  value?: number;
  reason?: string;
  externalReference?: string;
}) {
  const { data, error } = await db.rpc("grant_student_financial_benefit", {
    target_financial_item_id: input.financialItemId,
    target_template_id: input.templateId,
    target_value: input.value ?? null,
    target_reason: input.reason?.trim() || null,
    target_external_reference: input.externalReference?.trim() || null,
  });

  if (error) throw error;
  return data as string;
}

export async function cancelStudentFinancialBenefit(
  adjustmentId: string,
  reason: string,
) {
  const { error } = await db.rpc("cancel_student_financial_benefit", {
    target_adjustment_id: adjustmentId,
    target_reason: reason.trim(),
  });

  if (error) throw error;
}
