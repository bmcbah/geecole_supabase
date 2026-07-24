import { supabase } from "../../../shared/lib/supabase/client";

const db = supabase as any;

export type InstallmentSituation = "upcoming" | "due" | "overdue" | "settled";

export type FinancialInstallmentRow = {
  id: string;
  accountId: string;
  studentId: string;
  studentName: string;
  matricule: string;
  cycleName: string;
  levelName: string;
  feeLabel: string;
  installmentLabel: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balanceAmount: number;
  daysLate: number;
  situation: InstallmentSituation;
};

export type FinancialDashboardBreakdown = {
  label: string;
  total: number;
  paid: number;
  balance: number;
  rate: number;
  count: number;
};

export type FinancialDashboard = {
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  overdueAmount: number;
  overdueCount: number;
  overdueStudentCount: number;
  dueTodayAmount: number;
  dueTodayCount: number;
  dueSoonAmount: number;
  dueSoonCount: number;
  collectedToday: number;
  collectedThisMonth: number;
  paymentCountToday: number;
  paymentCountThisMonth: number;
  accountCount: number;
  settledAccountCount: number;
  partialAccountCount: number;
  unpaidAccountCount: number;
  averageAccountAmount: number;
  averagePaymentAmount: number;
  cycles: FinancialDashboardBreakdown[];
  methods: Array<{ method: string; amount: number; count: number }>;
  urgentAccounts: Array<{
    accountId: string;
    studentName: string;
    matricule: string;
    levelName: string;
    balanceAmount: number;
    overdueAmount: number;
    maxDaysLate: number;
  }>;
};

export type FamilyFinancialRow = {
  key: string;
  guardianId: string | null;
  guardianName: string;
  guardianPhone: string;
  students: Array<{ studentId: string; studentName: string; matricule: string }>;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  overdueAmount: number;
  nextDueDate: string | null;
};

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function situationOf(dueDate: string, balanceAmount: number): InstallmentSituation {
  if (balanceAmount <= 0) return "settled";
  const today = todayIso();
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "due";
  return "upcoming";
}

function daysLate(dueDate: string, balanceAmount: number) {
  if (balanceAmount <= 0 || dueDate >= todayIso()) return 0;
  const due = new Date(`${dueDate}T00:00:00`);
  const today = new Date(`${todayIso()}T00:00:00`);
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86_400_000));
}

export async function listFinancialInstallments(
  institutionId: string,
  academicYearId: string,
): Promise<FinancialInstallmentRow[]> {
  const { data, error } = await db
    .from("student_financial_installments")
    .select(`
      id,financial_account_id,financial_item_id,label_snapshot,due_date,amount,paid_amount,balance_amount,
      account:student_financial_accounts!inner(
        student_id,student_name_snapshot,matricule_snapshot,cycle_name_snapshot,level_name_snapshot,
        institution_id,academic_year_id
      ),
      item:student_financial_items(label_snapshot)
    `)
    .eq("account.institution_id", institutionId)
    .eq("account.academic_year_id", academicYearId)
    .order("due_date", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const account = Array.isArray(row.account) ? row.account[0] : row.account;
    const item = Array.isArray(row.item) ? row.item[0] : row.item;
    const balanceAmount = Number(row.balance_amount ?? 0);
    return {
      id: row.id,
      accountId: row.financial_account_id,
      studentId: account.student_id,
      studentName: account.student_name_snapshot,
      matricule: account.matricule_snapshot,
      cycleName: account.cycle_name_snapshot,
      levelName: account.level_name_snapshot,
      feeLabel: item?.label_snapshot ?? "Frais scolaire",
      installmentLabel: row.label_snapshot,
      dueDate: row.due_date,
      amount: Number(row.amount ?? 0),
      paidAmount: Number(row.paid_amount ?? 0),
      balanceAmount,
      daysLate: daysLate(row.due_date, balanceAmount),
      situation: situationOf(row.due_date, balanceAmount),
    } satisfies FinancialInstallmentRow;
  });
}

export async function getFinancialDashboard(
  institutionId: string,
  academicYearId: string,
): Promise<FinancialDashboard> {
  const [{ data: accounts, error: accountsError }, installments, { data: payments, error: paymentsError }] = await Promise.all([
    db
      .from("student_financial_accounts")
      .select("id,student_name_snapshot,matricule_snapshot,level_name_snapshot,cycle_name_snapshot,total_amount,paid_amount,balance_amount")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", academicYearId),
    listFinancialInstallments(institutionId, academicYearId),
    db
      .from("financial_payments")
      .select("amount,payment_date,status,method")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", academicYearId)
      .eq("status", "posted")
      .gte("payment_date", startOfMonth()),
  ]);
  if (accountsError) throw accountsError;
  if (paymentsError) throw paymentsError;

  const accountRows = accounts ?? [];
  const paymentRows = payments ?? [];
  const totalBilled = accountRows.reduce((sum: number, row: any) => sum + Number(row.total_amount ?? 0), 0);
  const totalCollected = accountRows.reduce((sum: number, row: any) => sum + Number(row.paid_amount ?? 0), 0);
  const totalOutstanding = accountRows.reduce((sum: number, row: any) => sum + Number(row.balance_amount ?? 0), 0);
  const overdue = installments.filter((row) => row.situation === "overdue");
  const dueToday = installments.filter((row) => row.situation === "due");
  const limit = new Date();
  limit.setDate(limit.getDate() + 30);
  const limitIso = limit.toISOString().slice(0, 10);
  const dueSoon = installments.filter((row) => row.balanceAmount > 0 && row.dueDate > todayIso() && row.dueDate <= limitIso);
  const today = todayIso();
  const todayPayments = paymentRows.filter((row: any) => String(row.payment_date) === today);

  const cyclesMap = new Map<string, FinancialDashboardBreakdown>();
  accountRows.forEach((row: any) => {
    const label = row.cycle_name_snapshot || "Cycle non renseigné";
    const current = cyclesMap.get(label) ?? { label, total: 0, paid: 0, balance: 0, rate: 0, count: 0 };
    current.total += Number(row.total_amount ?? 0);
    current.paid += Number(row.paid_amount ?? 0);
    current.balance += Number(row.balance_amount ?? 0);
    current.count += 1;
    cyclesMap.set(label, current);
  });
  const cycles = [...cyclesMap.values()].map((item) => ({ ...item, rate: item.total > 0 ? (item.paid / item.total) * 100 : 0 })).sort((left, right) => right.balance - left.balance);

  const methodsMap = new Map<string, { method: string; amount: number; count: number }>();
  paymentRows.forEach((row: any) => {
    const method = String(row.method ?? "unknown");
    const current = methodsMap.get(method) ?? { method, amount: 0, count: 0 };
    current.amount += Number(row.amount ?? 0);
    current.count += 1;
    methodsMap.set(method, current);
  });

  const overdueByAccount = new Map<string, { overdueAmount: number; maxDaysLate: number }>();
  overdue.forEach((row) => {
    const current = overdueByAccount.get(row.accountId) ?? { overdueAmount: 0, maxDaysLate: 0 };
    current.overdueAmount += row.balanceAmount;
    current.maxDaysLate = Math.max(current.maxDaysLate, row.daysLate);
    overdueByAccount.set(row.accountId, current);
  });
  const urgentAccounts = accountRows
    .map((row: any) => {
      const late = overdueByAccount.get(row.id);
      return late ? {
        accountId: row.id,
        studentName: row.student_name_snapshot,
        matricule: row.matricule_snapshot,
        levelName: row.level_name_snapshot,
        balanceAmount: Number(row.balance_amount ?? 0),
        overdueAmount: late.overdueAmount,
        maxDaysLate: late.maxDaysLate,
      } : null;
    })
    .filter(Boolean)
    .sort((left: any, right: any) => right.overdueAmount - left.overdueAmount || right.maxDaysLate - left.maxDaysLate)
    .slice(0, 8);

  const settledAccountCount = accountRows.filter((row: any) => Number(row.balance_amount ?? 0) <= 0).length;
  const partialAccountCount = accountRows.filter((row: any) => Number(row.paid_amount ?? 0) > 0 && Number(row.balance_amount ?? 0) > 0).length;
  const unpaidAccountCount = accountRows.filter((row: any) => Number(row.paid_amount ?? 0) <= 0 && Number(row.balance_amount ?? 0) > 0).length;
  const collectedThisMonth = paymentRows.reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0);

  return {
    totalBilled,
    totalCollected,
    totalOutstanding,
    collectionRate: totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0,
    overdueAmount: overdue.reduce((sum, row) => sum + row.balanceAmount, 0),
    overdueCount: overdue.length,
    overdueStudentCount: new Set(overdue.map((row) => row.studentId)).size,
    dueTodayAmount: dueToday.reduce((sum, row) => sum + row.balanceAmount, 0),
    dueTodayCount: dueToday.length,
    dueSoonAmount: dueSoon.reduce((sum, row) => sum + row.balanceAmount, 0),
    dueSoonCount: dueSoon.length,
    collectedToday: todayPayments.reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0),
    collectedThisMonth,
    paymentCountToday: todayPayments.length,
    paymentCountThisMonth: paymentRows.length,
    accountCount: accountRows.length,
    settledAccountCount,
    partialAccountCount,
    unpaidAccountCount,
    averageAccountAmount: accountRows.length ? totalBilled / accountRows.length : 0,
    averagePaymentAmount: paymentRows.length ? collectedThisMonth / paymentRows.length : 0,
    cycles,
    methods: [...methodsMap.values()].sort((left, right) => right.amount - left.amount),
    urgentAccounts,
  };
}

export async function listFamilyFinancialRows(
  institutionId: string,
  academicYearId: string,
): Promise<FamilyFinancialRow[]> {
  const [{ data: accounts, error: accountsError }, installments, { data: links, error: linksError }] = await Promise.all([
    db
      .from("student_financial_accounts")
      .select("student_id,student_name_snapshot,matricule_snapshot,total_amount,paid_amount,balance_amount")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", academicYearId),
    listFinancialInstallments(institutionId, academicYearId),
    db
      .from("student_guardians")
      .select(`
        student_id,is_financial_responsible,is_primary_contact,
        student:students!inner(institution_id),
        guardian:guardians(id,first_name,last_name,primary_phone)
      `)
      .eq("student.institution_id", institutionId)
      .eq("is_financial_responsible", true),
  ]);
  if (accountsError) throw accountsError;
  if (linksError) throw linksError;

  const linksByStudent = new Map<string, any>();
  for (const link of links ?? []) {
    const guardian = Array.isArray(link.guardian) ? link.guardian[0] : link.guardian;
    if (guardian) linksByStudent.set(link.student_id, guardian);
  }

  const families = new Map<string, FamilyFinancialRow>();
  for (const account of accounts ?? []) {
    const guardian = linksByStudent.get(account.student_id) ?? null;
    const key = guardian?.id ?? `student:${account.student_id}`;
    const studentInstallments = installments.filter((row) => row.studentId === account.student_id);
    const overdueAmount = studentInstallments.filter((row) => row.situation === "overdue").reduce((sum, row) => sum + row.balanceAmount, 0);
    const nextDueDate = studentInstallments.filter((row) => row.balanceAmount > 0 && row.dueDate >= todayIso()).map((row) => row.dueDate).sort()[0] ?? null;
    const current = families.get(key) ?? {
      key,
      guardianId: guardian?.id ?? null,
      guardianName: guardian ? `${guardian.first_name} ${guardian.last_name}`.trim() : "Responsable financier non renseigné",
      guardianPhone: guardian?.primary_phone ?? "",
      students: [],
      totalAmount: 0,
      paidAmount: 0,
      balanceAmount: 0,
      overdueAmount: 0,
      nextDueDate: null,
    };
    current.students.push({ studentId: account.student_id, studentName: account.student_name_snapshot, matricule: account.matricule_snapshot });
    current.totalAmount += Number(account.total_amount ?? 0);
    current.paidAmount += Number(account.paid_amount ?? 0);
    current.balanceAmount += Number(account.balance_amount ?? 0);
    current.overdueAmount += overdueAmount;
    if (nextDueDate && (!current.nextDueDate || nextDueDate < current.nextDueDate)) current.nextDueDate = nextDueDate;
    families.set(key, current);
  }

  return [...families.values()].sort((left, right) => right.overdueAmount - left.overdueAmount || right.balanceAmount - left.balanceAmount);
}
