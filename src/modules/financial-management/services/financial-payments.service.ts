import { supabase } from "../../../shared/lib/supabase/client";
import type {
  FinancialPayment,
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
  createdAt: row.created_at,
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
