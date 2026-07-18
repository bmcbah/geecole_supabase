import { supabase } from "../../../shared/lib/supabase/client";
import type { FinancialAccount } from "../domain/financial-account";

const db = supabase as any;

const mapAccount = (row: any): FinancialAccount => ({
  id: row.id,
  institutionId: row.institution_id,
  academicYearId: row.academic_year_id,
  enrollmentId: row.enrollment_id,
  studentId: row.student_id,
  paymentPlanId: row.payment_plan_id,
  status: row.status,
  currencyCode: row.currency_code,
  totalAmount: Number(row.total_amount),
  paidAmount: Number(row.paid_amount),
  balanceAmount: Number(row.balance_amount),
  studentName: row.student_name_snapshot,
  matricule: row.matricule_snapshot,
  levelName: row.level_name_snapshot,
  cycleName: row.cycle_name_snapshot,
  paymentPlanName: row.payment_plan_name_snapshot,
  generatedAt: row.generated_at,
});

export async function getStudentFinancialAccount(
  studentId: string,
  academicYearId: string,
): Promise<FinancialAccount | null> {
  const { data, error } = await db
    .from("student_financial_accounts")
    .select("*")
    .eq("student_id", studentId)
    .eq("academic_year_id", academicYearId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapAccount(data) : null;
}

export async function listAccountPayments(financialAccountId: string) {
  const { data, error } = await db
    .from("financial_payments")
    .select("*")
    .eq("financial_account_id", financialAccountId)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    receiptNumber: row.receipt_number,
    paymentDate: row.payment_date,
    amount: Number(row.amount),
    method: row.method,
    status: row.status,
    note: row.note,
    externalReference: row.external_reference,
  }));
}
