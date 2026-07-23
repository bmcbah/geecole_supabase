import { supabase } from "../../../shared/lib/supabase/client";
import { getFinancialDashboard, type FinancialDashboard } from "./financial-pilotage.service";

const db = supabase as any;

export type FinancialDashboardRole = "owner" | "admin" | "secretary" | "teacher" | "finance";

export type FinancialDashboardAlert = {
  key: string;
  severity: "danger" | "warning" | "info";
  title: string;
  detail: string;
  actionLabel: string;
  actionPath: string;
};

export type FinancialRecentActivity = {
  key: string;
  icon: string;
  title: string;
  detail: string;
  occurredAt: string;
};

export type ProfileFinancialDashboard = {
  role: FinancialDashboardRole;
  profileName: string;
  dashboard: FinancialDashboard;
  missingFinancialResponsibles: number;
  confirmedEnrollmentsWithoutAccount: number;
  recentActivities: FinancialRecentActivity[];
  alerts: FinancialDashboardAlert[];
};

const roleFallback: FinancialDashboardRole = "teacher";

export async function getProfileFinancialDashboard(
  institutionId: string,
  academicYearId: string,
): Promise<ProfileFinancialDashboard> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;

  const [dashboard, membershipResult, profileResult, missingAccountsResult, accountRowsResult, linksResult, paymentsResult, reportsResult] = await Promise.all([
    getFinancialDashboard(institutionId, academicYearId),
    userId
      ? db.from("memberships").select("role").eq("institution_id", institutionId).eq("user_id", userId).eq("status", "active").maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    userId
      ? db.from("profiles").select("full_name").eq("id", userId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    db.from("enrollments").select("id", { count: "exact", head: true }).eq("institution_id", institutionId).eq("academic_year_id", academicYearId).eq("status", "confirmed").is("financial_account.id", null),
    db.from("student_financial_accounts").select("student_id").eq("institution_id", institutionId).eq("academic_year_id", academicYearId),
    db.from("student_guardians").select("student_id,is_financial_responsible").eq("is_financial_responsible", true),
    db.from("financial_payments").select("id,amount,payment_date,created_at,method").eq("institution_id", institutionId).eq("academic_year_id", academicYearId).eq("status", "posted").order("created_at", { ascending: false }).limit(6),
    db.from("financial_generation_reports").select("id,status,generated,regenerated,failed,created_at").eq("institution_id", institutionId).eq("academic_year_id", academicYearId).order("created_at", { ascending: false }).limit(4),
  ]);

  const errors = [membershipResult.error, profileResult.error, missingAccountsResult.error, accountRowsResult.error, linksResult.error, paymentsResult.error, reportsResult.error].filter(Boolean);
  if (errors.length) throw errors[0];

  const role = (membershipResult.data?.role ?? roleFallback) as FinancialDashboardRole;
  const profileName = profileResult.data?.full_name ?? authData.user?.email ?? "Utilisateur";
  const responsibleStudentIds = new Set((linksResult.data ?? []).map((row: any) => row.student_id));
  const missingFinancialResponsibles = new Set((accountRowsResult.data ?? []).map((row: any) => row.student_id).filter((studentId: string) => !responsibleStudentIds.has(studentId))).size;
  const confirmedEnrollmentsWithoutAccount = Number(missingAccountsResult.count ?? 0);

  const paymentActivities: FinancialRecentActivity[] = (paymentsResult.data ?? []).map((row: any) => ({
    key: `payment:${row.id}`,
    icon: "pi pi-wallet",
    title: "Paiement encaissé",
    detail: `${Number(row.amount ?? 0).toLocaleString("fr-FR")} GNF · ${String(row.method ?? "Mode non renseigné")}`,
    occurredAt: row.created_at ?? row.payment_date,
  }));
  const reportActivities: FinancialRecentActivity[] = (reportsResult.data ?? []).map((row: any) => ({
    key: `report:${row.id}`,
    icon: "pi pi-file-check",
    title: "Génération des dossiers",
    detail: `${Number(row.generated ?? 0)} créé(s), ${Number(row.regenerated ?? 0)} régénéré(s), ${Number(row.failed ?? 0)} erreur(s)`,
    occurredAt: row.created_at,
  }));
  const recentActivities = [...paymentActivities, ...reportActivities]
    .sort((left, right) => String(right.occurredAt).localeCompare(String(left.occurredAt)))
    .slice(0, 8);

  const alerts: FinancialDashboardAlert[] = [];
  if (dashboard.overdueCount > 0) alerts.push({ key: "overdue", severity: "danger", title: `${dashboard.overdueStudentCount} élève(s) en retard`, detail: `${dashboard.overdueAmount.toLocaleString("fr-FR")} GNF restent à recouvrer sur ${dashboard.overdueCount} échéance(s).`, actionLabel: "Traiter les retards", actionPath: "/gestion-financiere/echeances" });
  if (confirmedEnrollmentsWithoutAccount > 0) alerts.push({ key: "missing-accounts", severity: "warning", title: `${confirmedEnrollmentsWithoutAccount} dossier(s) à générer`, detail: "Des inscriptions confirmées ne possèdent pas encore de dossier financier.", actionLabel: "Ouvrir les dossiers", actionPath: "/gestion-financiere/dossiers" });
  if (missingFinancialResponsibles > 0) alerts.push({ key: "missing-responsibles", severity: "warning", title: `${missingFinancialResponsibles} responsable(s) financier(s) manquant(s)`, detail: "Le suivi et les relances seront incomplets tant que ces responsables ne sont pas renseignés.", actionLabel: "Vérifier les dossiers", actionPath: "/gestion-financiere/dossiers" });
  if (dashboard.dueTodayCount > 0) alerts.push({ key: "due-today", severity: "info", title: `${dashboard.dueTodayCount} échéance(s) aujourd’hui`, detail: `${dashboard.dueTodayAmount.toLocaleString("fr-FR")} GNF sont attendus aujourd’hui.`, actionLabel: "Voir les échéances", actionPath: "/gestion-financiere/echeances" });

  return { role, profileName, dashboard, missingFinancialResponsibles, confirmedEnrollmentsWithoutAccount, recentActivities, alerts };
}
