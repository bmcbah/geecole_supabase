import { supabase } from "../../../shared/lib/supabase/client";
import type {
  FinancialAccount,
  FinancialAccountDetails,
  FinancialAccountItem,
  FinancialInstallment,
} from "../domain/financial-account";

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

const mapItem = (row: any): FinancialAccountItem => ({
  id: row.id,
  accountId: row.financial_account_id,
  feeTypeId: row.fee_type_id,
  code: row.code_snapshot,
  label: row.label_snapshot,
  amount: Number(row.amount),
});

const mapInstallment = (row: any): FinancialInstallment => ({
  id: row.id,
  accountId: row.financial_account_id,
  sequence: row.sequence,
  label: row.label_snapshot,
  percentage: Number(row.percentage_snapshot),
  dueDate: row.due_date,
  amount: Number(row.amount),
  paidAmount: Number(row.paid_amount),
  balanceAmount: Number(row.balance_amount),
});

export async function listFinancialAccounts(
  institutionId: string,
  academicYearId: string,
): Promise<FinancialAccount[]> {
  const { data, error } = await db
    .from("student_financial_accounts")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("academic_year_id", academicYearId)
    .order("student_name_snapshot");

  if (error) throw error;
  return (data ?? []).map(mapAccount);
}

export async function getFinancialAccount(
  accountId: string,
): Promise<FinancialAccountDetails> {
  const { data, error } = await db
    .from("student_financial_accounts")
    .select(
      "*, items:student_financial_items(*), installments:student_financial_installments(*)",
    )
    .eq("id", accountId)
    .single();

  if (error) throw error;

  return {
    ...mapAccount(data),
    items: (data.items ?? []).map(mapItem),
    installments: (data.installments ?? [])
      .map(mapInstallment)
      .sort(
        (left: FinancialInstallment, right: FinancialInstallment) =>
          left.sequence - right.sequence,
      ),
  };
}

export async function listConfirmedEnrollmentsWithoutFinancialAccount(
  institutionId: string,
  academicYearId: string,
) {
  const { data, error } = await db
    .from("enrollments")
    .select(
      "id, student_id, level_name_snapshot, cycle_name_snapshot, student:students(first_name,last_name,matricule), financial_account:student_financial_accounts(id)",
    )
    .eq("institution_id", institutionId)
    .eq("academic_year_id", academicYearId)
    .eq("status", "confirmed")
    .is("financial_account.id", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function generateFinancialAccount(
  enrollmentId: string,
  paymentPlanId: string,
) {
  const { data, error } = await db.rpc("generate_student_financial_account", {
    target_enrollment_id: enrollmentId,
    target_payment_plan_id: paymentPlanId,
  });

  if (error) throw error;
  return data as string;
}