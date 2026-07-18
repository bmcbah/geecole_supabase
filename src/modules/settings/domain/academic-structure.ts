export type PeriodSystem = "term" | "semester" | "custom";

export type SubjectsPeriodScope = "all" | "selectable";

export type StructureItemInput = {
  name: string;
  code: string;
  sortOrder: number;
  isActive: boolean;
  periodSystem?: PeriodSystem;
  periodCount?: number;
  subjectsPeriodScope?: SubjectsPeriodScope;
  gradingScale?: number;
  passAverage?: number;
  rankingEnabled?: boolean;
  absencesOnReport?: boolean;
  capacity?: number | null;
  repeatAllowed?: boolean;
};

export type AcademicPeriodStatus = "draft" | "open" | "closed" | "archived";

export type AcademicPeriodInput = {
  name: string;
  code: string;
  startsOn: string;
  endsOn: string;
  status: AcademicPeriodStatus;
};

export const normalizeStructureCode = (code: string) =>
  code.trim().toUpperCase();
