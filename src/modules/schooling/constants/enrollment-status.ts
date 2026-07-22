export const enrollmentStatuses = [
  "draft",
  "pre_registered",
  "confirmed",
  "rejected",
  "withdrawn",
  "cancelled",
  "transferred",
] as const;

export type EnrollmentStatus = (typeof enrollmentStatuses)[number];

export const enrollmentStatusLabels: Record<EnrollmentStatus, string> = {
  draft: "Brouillon",
  pre_registered: "Préinscription",
  confirmed: "Inscription confirmée",
  rejected: "Refusée",
  withdrawn: "Retirée",
  cancelled: "Annulée",
  transferred: "Transférée",
};

export const enrollmentStatusClasses: Record<EnrollmentStatus, string> = {
  draft: "border-slate-200 bg-slate-100 text-slate-700",
  pre_registered: "border-amber-200 bg-amber-50 text-amber-700",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  withdrawn: "border-orange-200 bg-orange-50 text-orange-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
  transferred: "border-blue-200 bg-blue-50 text-blue-700",
};

export function isEnrollmentStatus(value: string): value is EnrollmentStatus {
  return enrollmentStatuses.includes(value as EnrollmentStatus);
}
