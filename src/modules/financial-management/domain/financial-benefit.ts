export type FinancialBenefitType =
  | "discount"
  | "scholarship"
  | "exemption"
  | "sponsorship";

export type FinancialBenefitCalculation = "fixed" | "percentage";
export type FinancialAdjustmentStatus = "active" | "cancelled";

export type FinancialBenefitTemplate = {
  id: string;
  institutionId: string;
  name: string;
  code: string;
  description: string | null;
  benefitType: FinancialBenefitType;
  calculationType: FinancialBenefitCalculation;
  defaultValue: number;
  feeTypeIds: string[];
  scope: "institution" | "cycle" | "level";
  cycleIds: string[];
  levelIds: string[];
  isStackable: boolean;
  isActive: boolean;
};

export type StudentFinancialAdjustment = {
  id: string;
  financialAccountId: string;
  financialItemId: string;
  templateId: string | null;
  templateName: string | null;
  benefitType: FinancialBenefitType;
  calculationType: FinancialBenefitCalculation;
  value: number;
  calculatedAmount: number;
  reason: string;
  externalReference: string | null;
  status: FinancialAdjustmentStatus;
  grantedAt: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
};

export const financialBenefitTypeLabels: Record<FinancialBenefitType, string> = {
  discount: "Remise",
  scholarship: "Bourse",
  exemption: "Exonération",
  sponsorship: "Prise en charge",
};

export const financialBenefitCalculationLabels: Record<
  FinancialBenefitCalculation,
  string
> = {
  fixed: "Montant fixe",
  percentage: "Pourcentage",
};
