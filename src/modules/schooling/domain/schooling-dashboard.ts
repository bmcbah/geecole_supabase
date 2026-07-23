import type { WorkspaceAlert } from "../../../shared/types/workspace";

export type SchoolingDashboardKpis = {
  enrolledStudents: number;
  enrollmentsInProgress: number;
  preRegistrations: number;
  studentsWithoutClass: number;
  attendanceToReview: number;
  documentsToReview: number;
};

export type SchoolingRecentAction = {
  id: string;
  entity: string;
  title: string;
  description: string;
  occurredAt: string;
  route: string;
};

export type SchoolingDashboard = {
  kpis: SchoolingDashboardKpis;
  alerts: WorkspaceAlert[];
  recentActions: SchoolingRecentAction[];
};
