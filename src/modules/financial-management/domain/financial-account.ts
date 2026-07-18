export type FinancialAccountStatus =
  | "draft"
  | "active"
  | "settled"
  | "cancelled";

export type FinancialAccount = {
  id: string;
  institutionId: string;
  academicYearId: string;
  enrollmentId: string;
  studentId: string;
  paymentPlanId: string | null;
  status: FinancialAccountStatus;
  currencyCode: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  studentName: string;
  matricule: string;
  levelName: string;
  cycleName: string;
  paymentPlanName: string | null;
  generatedAt: string | null;
};

export type FinancialInstallment = {
  id: string;
  accountId: string;
  itemId: string | null;
  sequence: number;
  label: string;
  percentage: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balanceAmount: number;
};

export type FinancialAccountItem = {
  id: string;
  accountId: string;
  feeTypeId: string | null;
  paymentPlanId: string | null;
  paymentPlanName: string | null;
  code: string;
  label: string;
  amount: number;
  adjustmentAmount: number;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  installments?: FinancialInstallment[];
};

export type FinancialAccountDetails = FinancialAccount & {
  items: FinancialAccountItem[];
  installments: FinancialInstallment[];
};

export const financialAccountStatusLabels: Record<
  FinancialAccountStatus,
  string
> = {
  draft: "Brouillon",
  active: "Actif",
  settled: "Soldé",
  cancelled: "Annulé",
};
