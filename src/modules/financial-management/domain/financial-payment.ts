export type PaymentMethod =
  | "cash"
  | "card"
  | "bank_transfer"
  | "mobile_money"
  | "cheque"
  | "other";

export type FinancialPaymentStatus = "posted" | "cancelled";

export type FinancialPayment = {
  id: string;
  financialAccountId: string;
  receiptNumber: string;
  studentName: string;
  matricule: string;
  levelName: string;
  cycleName: string;
  paymentDate: string;
  amount: number;
  method: PaymentMethod;
  externalReference: string | null;
  note: string | null;
  status: FinancialPaymentStatus;
  cancellationReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
};

export type OpenFinancialInstallment = {
  id: string;
  financialAccountId: string;
  studentName: string;
  matricule: string;
  levelName: string;
  cycleName: string;
  sequence: number;
  label: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balanceAmount: number;
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Espèces",
  card: "Carte",
  bank_transfer: "Virement bancaire",
  mobile_money: "Mobile Money",
  cheque: "Chèque",
  other: "Autre",
};

export const financialPaymentStatusLabels: Record<FinancialPaymentStatus, string> = {
  posted: "Comptabilisé",
  cancelled: "Annulé",
};
