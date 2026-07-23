export type SchoolingOverviewSeverity = "blocking" | "warning" | "information";

export type SchoolingOverviewKpi = {
  id: string;
  label: string;
  value: number;
  description: string;
  icon: string;
  route: string;
};

export type SchoolingOverviewAlert = {
  id: string;
  severity: SchoolingOverviewSeverity;
  domain: string;
  title: string;
  description: string;
  count: number;
  route: string;
};

export type SchoolingOverviewActivity = {
  id: string;
  title: string;
  description: string;
  occurredAt: string;
  route: string;
};

export type SchoolingOverviewData = {
  kpis: {
    enrolledStudents: number;
    enrollmentsInProgress: number;
    preRegistrations: number;
    studentsWithoutClass: number;
    attendanceToReview: number;
    documentsToReview: number;
  };
  alerts: SchoolingOverviewAlert[];
  recentActivities: SchoolingOverviewActivity[];
};
