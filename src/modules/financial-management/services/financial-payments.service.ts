import { supabase } from "../../../shared/lib/supabase/client";
import type {
  FinancialPayment,
  OpenFinancialInstallment,
  PaymentMethod,
} from "../domain/financial-payment";

const db = supabase as any;

const mapPayment = (row: any): FinancialPayment => ({
  id: row.id,
  financialAccountId: row.financial_account_id,
  receiptNumber: row.receipt_number,
  studentName: row.account?.student_name_snapshot ?? "",
  matricule: row.account?.matricule_snapshot ?? "",
  paymentDate: row.payment_date,
  amount: Number(row.amount),
  method: row.method,
  externalReference: row.external_reference,
  note: row.note,
  status: row.status,
  cancellationReason: row.cancellation_reason,
  cancelledAt: row.cancelled_at,
  createdAt: row.created_at,
});

const mapOpenInstallment = (row: any): OpenFinancialInstallment => ({
  id: row.id,
  financialAccountId: row.financial_account_id,
  studentName: row.account?.student_name_snapshot ?? "",
  matricule: row.account?.matricule_snapshot ?? "",
  levelName: row.account?.level_name_snapshot ?? "",
  cycleName: row.account?.cycle_name_snapshot ?? "",
  sequence: Number(row.sequence),
  label: row.label_snapshot,
  dueDate: row.due_date,
  amount: Number(row.amount),
  paidAmount: Number(row.paid_amount),
  balanceAmount: Number(row.balance_amount),
});

export async function listFinancialPayments(
  institutionId: string,
  academicYearId: string,
): Promise<FinancialPayment[]> {
  const { data, error } = await db
    .from("financial_payments")
    .select(
      "*, account:student_financial_accounts(student_name_snapshot,matricule_snapshot)",
    )
    .eq("institution_id", institutionId)
    .eq("academic_year_id", academicYearId)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapPayment);
}

export async function listOpenFinancialInstallments(
  institutionId: string,
  academicYearId: string,
): Promise<OpenFinancialInstallment[]> {
  const { data, error } = await db
    .from("student_financial_installments")
    .select(
      "*, account:student_financial_accounts!inner(institution_id,academic_year_id,student_name_snapshot,matricule_snapshot,level_name_snapshot,cycle_name_snapshot,status)",
    )
    .eq("account.institution_id", institutionId)
    .eq("account.academic_year_id", academicYearId)
    .in("account.status", ["active", "draft"])
    .gt("balance_amount", 0)
    .order("due_date", { ascending: true })
    .order("sequence", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapOpenInstallment);
}

export async function registerFinancialPayment(input: {
  financialAccountId: string;
  amount: number;
  method: PaymentMethod;
  paymentDate: string;
  externalReference?: string;
  note?: string;
}) {
  const { data, error } = await db.rpc("register_financial_payment", {
    target_financial_account_id: input.financialAccountId,
    target_amount: input.amount,
    target_method: input.method,
    target_payment_date: input.paymentDate,
    target_external_reference: input.externalReference || null,
    target_note: input.note || null,
  });

  if (error) throw error;
  return data as string;
}

export async function cancelFinancialPayment(paymentId: string, reason: string) {
  const { data, error } = await db.rpc("cancel_financial_payment", {
    target_payment_id: paymentId,
    target_reason: reason,
  });

  if (error) throw error;
  return data as string;
}
