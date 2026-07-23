import { supabase } from "../../../shared/lib/supabase/client";
import type {
  SchoolingOverviewActivity,
  SchoolingOverviewAlert,
  SchoolingOverviewData,
} from "../domain/schooling-overview";

const client = supabase as any;

const countRows = async (
  table: string,
  configure: (query: any) => any,
): Promise<number> => {
  const query = configure(
    client.from(table).select("id", { count: "exact", head: true }),
  );
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
};

export async function getSchoolingOverview(
  institutionId: string,
  academicYearId: string,
): Promise<SchoolingOverviewData> {
  const [
    enrolledStudents,
    enrollmentsInProgress,
    preRegistrations,
    confirmedEnrollmentsResult,
    attendanceToReview,
    documentsToReview,
    unpublishedBulletins,
    recentEnrollmentsResult,
  ] = await Promise.all([
    countRows("enrollments", (query) =>
      query
        .eq("institution_id", institutionId)
        .eq("academic_year_id", academicYearId)
        .eq("status", "confirmed"),
    ),
    countRows("enrollments", (query) =>
      query
        .eq("institution_id", institutionId)
        .eq("academic_year_id", academicYearId)
        .in("status", ["draft", "pending", "pre_registered"]),
    ),
    countRows("enrollments", (query) =>
      query
        .eq("institution_id", institutionId)
        .eq("academic_year_id", academicYearId)
        .eq("status", "pre_registered"),
    ),
    client
      .from("enrollments")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", academicYearId)
      .eq("status", "confirmed"),
    countRows("student_attendance_records", (query) =>
      query
        .eq("institution_id", institutionId)
        .eq("academic_year_id", academicYearId)
        .in("justification_status", ["unjustified", "pending"]),
    ),
    countRows("enrollment_documents", (query) =>
      query
        .eq("institution_id", institutionId)
        .in("status", ["requested", "received", "rejected", "expired"]),
    ),
    countRows("bulletin_versions", (query) =>
      query
        .eq("institution_id", institutionId)
        .eq("academic_year_id", academicYearId)
        .in("status", ["generated", "pending_validation", "validated"]),
    ),
    client
      .from("enrollments")
      .select(
        "id,status,updated_at,student:students!inner(id,first_name,last_name)",
      )
      .eq("institution_id", institutionId)
      .eq("academic_year_id", academicYearId)
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  if (confirmedEnrollmentsResult.error) throw confirmedEnrollmentsResult.error;
  if (recentEnrollmentsResult.error) throw recentEnrollmentsResult.error;

  const confirmedEnrollmentIds = (confirmedEnrollmentsResult.data ?? []).map(
    (item: { id: string }) => item.id,
  );

  let studentsWithoutClass = 0;
  if (confirmedEnrollmentIds.length) {
    const { data: assignments, error } = await client
      .from("class_assignments")
      .select("enrollment_id")
      .in("enrollment_id", confirmedEnrollmentIds)
      .is("ends_on", null);
    if (error) throw error;
    const assignedEnrollmentIds = new Set(
      (assignments ?? []).map((item: { enrollment_id: string }) =>
        item.enrollment_id,
      ),
    );
    studentsWithoutClass = confirmedEnrollmentIds.filter(
      (id: string) => !assignedEnrollmentIds.has(id),
    ).length;
  }

  const alerts: SchoolingOverviewAlert[] = [];

  if (studentsWithoutClass > 0) {
    alerts.push({
      id: "students-without-class",
      severity: "blocking",
      domain: "Scolarité",
      title: "Élèves sans classe",
      description: "Des inscriptions confirmées doivent encore être affectées.",
      count: studentsWithoutClass,
      route: "/scolarite/eleves?controle=sans-classe",
    });
  }

  if (documentsToReview > 0) {
    alerts.push({
      id: "documents-to-review",
      severity: "warning",
      domain: "Documents",
      title: "Documents à contrôler",
      description: "Des pièces demandées, reçues ou rejetées nécessitent un suivi.",
      count: documentsToReview,
      route: "/scolarite/documents",
    });
  }

  if (attendanceToReview > 0) {
    alerts.push({
      id: "attendance-to-review",
      severity: "warning",
      domain: "Assiduité",
      title: "Assiduité à traiter",
      description: "Des absences ou retards attendent une justification.",
      count: attendanceToReview,
      route: "/scolarite/assiduite",
    });
  }

  if (unpublishedBulletins > 0) {
    alerts.push({
      id: "unpublished-bulletins",
      severity: "information",
      domain: "Bulletins",
      title: "Bulletins non publiés",
      description: "Des bulletins générés ne sont pas encore publiés.",
      count: unpublishedBulletins,
      route: "/notes-bulletins/bulletins",
    });
  }

  const recentActivities: SchoolingOverviewActivity[] = (
    recentEnrollmentsResult.data ?? []
  ).map((row: any) => {
    const student = Array.isArray(row.student) ? row.student[0] : row.student;
    const fullName = student
      ? `${student.first_name} ${student.last_name}`
      : "Dossier d’inscription";
    const statusLabel: Record<string, string> = {
      draft: "Dossier enregistré en brouillon",
      pending: "Dossier soumis au contrôle",
      pre_registered: "Préinscription enregistrée",
      confirmed: "Inscription confirmée",
      rejected: "Dossier rejeté",
      withdrawn: "Démarche abandonnée",
      cancelled: "Inscription annulée",
      transferred: "Transfert enregistré",
    };

    return {
      id: row.id,
      title: fullName,
      description: statusLabel[row.status] ?? "Dossier mis à jour",
      occurredAt: row.updated_at,
      route: student?.id
        ? `/scolarite/eleves/${student.id}`
        : "/scolarite/inscriptions",
    };
  });

  return {
    kpis: {
      enrolledStudents,
      enrollmentsInProgress,
      preRegistrations,
      studentsWithoutClass,
      attendanceToReview,
      documentsToReview,
    },
    alerts,
    recentActivities,
  };
}
