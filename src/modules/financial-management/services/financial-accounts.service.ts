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
  paymentPlanId: row.payment_plan_id,
  paymentPlanName: row.payment_plan_name_snapshot,
  code: row.code_snapshot,
  label: row.label_snapshot,
  amount: Number(row.amount),
  adjustmentAmount: Number(row.adjustment_amount ?? 0),
  netAmount: Number(row.net_amount ?? row.amount),
  paidAmount: Number(row.paid_amount ?? 0),
  balanceAmount: Number(row.balance_amount ?? 0),
});

const mapInstallment = (row: any): FinancialInstallment => ({
  id: row.id,
  accountId: row.financial_account_id,
  itemId: row.financial_item_id,
  sequence: row.sequence,
  label: row.label_snapshot,
  percentage: Number(row.percentage_snapshot),
  dueDate: row.due_date,
  amount: Number(row.amount),
  paidAmount: Number(row.paid_amount),
  balanceAmount: Number(row.balance_amount),
});

export type FinancialAccountPageRequest = {
  first: number;
  rows: number;
  search?: string;
  status?: string;
  sortField?: string;
  sortOrder?: 1 | -1 | 0 | null;
};

export type FinancialGenerationError = {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  matricule?: string | null;
  levelName?: string | null;
  cycleName?: string | null;
  code: string;
  message: string;
  detail?: string | null;
  hint?: string | null;
  context?: string | null;
};

export type FinancialGenerationResult = {
  generated: number;
  regenerated: number;
  skippedPaid: number;
  failed: number;
  errors: FinancialGenerationError[];
};

export async function listFinancialAccountsPage(
  institutionId: string,
  academicYearId: string,
  request: FinancialAccountPageRequest,
): Promise<{ rows: FinancialAccount[]; total: number }> {
  const start = request.first;
  const end = start + request.rows - 1;
  const sortMap: Record<string, string> = {
    studentName: "student_name_snapshot",
    matricule: "matricule_snapshot",
    levelName: "level_name_snapshot",
    totalAmount: "total_amount",
    paidAmount: "paid_amount",
    balanceAmount: "balance_amount",
    status: "status",
  };

  let query = db
    .from("student_financial_accounts")
    .select("*", { count: "exact" })
    .eq("institution_id", institutionId)
    .eq("academic_year_id", academicYearId);

  if (request.search?.trim()) {
    const value = request.search.trim().replace(/,/g, " ");
    query = query.or(`student_name_snapshot.ilike.%${value}%,matricule_snapshot.ilike.%${value}%,level_name_snapshot.ilike.%${value}%`);
  }
  if (request.status) query = query.eq("status", request.status);

  const sortColumn = sortMap[request.sortField ?? "studentName"] ?? "student_name_snapshot";
  query = query.order(sortColumn, { ascending: request.sortOrder !== -1 }).range(start, end);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []).map(mapAccount), total: count ?? 0 };
}

export async function listFinancialAccounts(
  institutionId: string,
  academicYearId: string,
): Promise<FinancialAccount[]> {
  const result = await listFinancialAccountsPage(institutionId, academicYearId, { first: 0, rows: 1000 });
  return result.rows;
}

export async function getFinancialAccount(accountId: string): Promise<FinancialAccountDetails> {
  const { data, error } = await db
    .from("student_financial_accounts")
    .select("*, items:student_financial_items(*), installments:student_financial_installments(*)")
    .eq("id", accountId)
    .single();
  if (error) throw error;

  const installments = (data.installments ?? []).map(mapInstallment).sort(
    (left: FinancialInstallment, right: FinancialInstallment) =>
      left.dueDate.localeCompare(right.dueDate) || left.sequence - right.sequence,
  );

  return {
    ...mapAccount(data),
    items: (data.items ?? []).map((row: any) => {
      const item = mapItem(row);
      return { ...item, installments: installments.filter((installment: FinancialInstallment) => installment.itemId === item.id) };
    }),
    installments,
  };
}

export async function listConfirmedEnrollmentsWithoutFinancialAccount(institutionId: string, academicYearId: string) {
  const { data, error } = await db
    .from("enrollments")
    .select("id, student_id, level_name_snapshot, cycle_name_snapshot, student:students(first_name,last_name,matricule), financial_account:student_financial_accounts(id)")
    .eq("institution_id", institutionId)
    .eq("academic_year_id", academicYearId)
    .eq("status", "confirmed")
    .is("financial_account.id", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function generateFinancialAccount(enrollmentId: string) {
  const { data, error } = await db.rpc("generate_student_financial_account", { target_enrollment_id: enrollmentId });
  if (error) throw error;
  return data as string;
}

export async function reapplyAllFinancialAccounts(
  institutionId: string,
  academicYearId: string,
): Promise<FinancialGenerationResult> {
  const { data, error } = await db.rpc("reapply_all_student_financial_accounts", {
    target_institution_id: institutionId,
    target_academic_year_id: academicYearId,
  });
  if (error) throw error;

  const result = data as Partial<FinancialGenerationResult> | null;
  return {
    generated: Number(result?.generated ?? 0),
    regenerated: Number(result?.regenerated ?? 0),
    skippedPaid: Number(result?.skippedPaid ?? 0),
    failed: Number(result?.failed ?? 0),
    errors: Array.isArray(result?.errors) ? result.errors : [],
  };
}
