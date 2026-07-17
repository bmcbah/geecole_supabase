export type EnrollmentStatus =
  | "draft"
  | "pre_registered"
  | "confirmed"
  | "rejected"
  | "withdrawn"
  | "cancelled"
  | "transferred";

export interface StudentListItem {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string | null;
  status: EnrollmentStatus;
  cycleName: string;
  levelName: string;
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
  kind: "pre_registered" | "confirmed";
}

export interface DuplicateCandidate {
  id: string;
  matricule: string;
  fullName: string;
  birthDate: string | null;
}
