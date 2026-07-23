export type EnrollmentStatus =
  | "draft"
  | "pre_registered"
  | "confirmed"
  | "rejected"
  | "withdrawn"
  | "cancelled"
  | "transferred";

export type EnrollmentKind = "pre_registered" | "confirmed";

export interface StudentListItem {
  id: string;
  enrollmentId: string;
  matricule: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string | null;
  status: EnrollmentStatus;
  cycleName: string;
  levelName: string;
  className?: string;
  guardianName: string;
  guardianPhone: string;
}

export interface EnrollmentInput {
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  birthPlace: string;
  address: string;
  guardianFirstName: string;
  guardianLastName: string;
  guardianPhone: string;
  guardianRelationship: string;
  annualLevelId: string;
  kind: EnrollmentKind;
}

export interface DuplicateCandidate {
  id: string;
  matricule: string;
  fullName: string;
  birthDate: string | null;
}

export type GuardianLinkInput = {
  studentId: string;
  guardianId: string;
  relationship: string;
  primary: boolean;
  financial: boolean;
  emergency: boolean;
};

export type NewGuardianLinkInput = Omit<GuardianLinkInput, "guardianId"> & {
  firstName: string;
  lastName: string;
  phone: string;
};

export const enrollmentStatusLabels: Record<EnrollmentStatus, string> = {
  draft: "Brouillon",
  pre_registered: "Préinscrit",
  confirmed: "Inscrit",
  rejected: "Rejeté",
  withdrawn: "Retiré",
  cancelled: "Annulé",
  transferred: "Transféré",
};
