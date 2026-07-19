export type GradeStatus = "graded" | "absent" | "exempt" | "missing";
export type AssessmentStatus = "draft" | "open" | "locked" | "cancelled";

export interface Assessment {
  id: string;
  institution_id: string;
  academic_year_id: string;
  academic_period_id: string;
  class_id: string;
  annual_subject_id: string;
  assessment_type_id: string;
  title: string;
  description: string | null;
  assessment_date: string;
  scale: number;
  status: AssessmentStatus;
  created_at: string;
  updated_at: string;
}

export interface AssessmentInput {
  academic_period_id: string;
  class_id: string;
  annual_subject_id: string;
  assessment_type_id: string;
  title: string;
  description: string | null;
  assessment_date: string;
  scale: number;
  status: AssessmentStatus;
}

export interface GradebookStudent {
  enrollment_id: string;
  student_id: string;
  matricule: string;
  full_name: string;
}

export interface GradeEntry {
  enrollment_id: string;
  status: GradeStatus;
  score: number | null;
  comment: string | null;
}

export interface GradebookRow extends GradebookStudent, GradeEntry {}

export function validateGradeEntry(entry: GradeEntry, scale: number): string | null {
  if (entry.status !== "graded") return entry.score === null ? null : "Une note non notée ne doit pas contenir de valeur.";
  if (entry.score === null || Number.isNaN(entry.score)) return "La note est obligatoire.";
  if (entry.score < 0 || entry.score > scale) return `La note doit être comprise entre 0 et ${scale}.`;
  return null;
}

export function normalizeGradeEntry(entry: GradeEntry): GradeEntry {
  return {
    ...entry,
    score: entry.status === "graded" ? entry.score : null,
    comment: entry.comment?.trim() || null,
  };
}

export function gradeStatusLabel(status: GradeStatus): string {
  return ({ graded: "Noté", absent: "Absent", exempt: "Dispensé", missing: "Non noté" } as const)[status];
}
