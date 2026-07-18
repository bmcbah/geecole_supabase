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
