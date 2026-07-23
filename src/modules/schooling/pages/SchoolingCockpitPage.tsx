import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { SchoolingPanel } from "../components/SchoolingPanel";
import {
  listAttendance,
  listEnrollmentDocuments,
  listEnrollmentWorkflows,
  type AttendanceRow,
  type EnrollmentDocumentRow,
  type EnrollmentWorkflowRow,
} from "../services/schooling-workflows.service";

type WorkItem = { id: string; priority: "Urgent" | "Aujourd’hui" | "À traiter" | "Préparation"; label: string; count: number; route: string };
type RecentItem = { id: string; label: string; detail: string; date: string; route: string };

const severity = { Urgent: "danger", "Aujourd’hui": "warning", "À traiter": "info", Préparation: "secondary" } as const;
const profileLabels = { owner: "Propriétaire", admin: "Direction", secretary: "Secrétariat", teacher: "Enseignant", finance: "Finance", parent: "Parent", student: "Élève" } as const;

export function SchoolingCockpitPage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year, functionalProfile } = useAcademicSession();
  const [enrollments, setEnrollments] = useState<EnrollmentWorkflowRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [documents, setDocuments] = useState<EnrollmentDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      const [enrollmentRows, attendanceRows, documentRows] = await Promise.all([
        listEnrollmentWorkflows(institutionId, yearId),
        listAttendance(institutionId, yearId),
        listEnrollmentDocuments(institutionId, yearId),
      ]);
      setEnrollments(enrollmentRows);
      setAttendance(attendanceRows);
      setDocuments(documentRows);
    } catch {
      setFailure("Impossible de charger la vue d’ensemble de la scolarité.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => void load(), [load]);

  const metrics = useMemo(() => {
    const confirmed = enrollments.filter((item) => item.status === "confirmed").length;
    const drafts = enrollments.filter((item) => item.status === "draft").length;
    const preRegistered = enrollments.filter((item) => item.status === "pre_registered").length;
    const withoutClass = enrollments.filter((item) => item.status === "confirmed" && !item.assignment[0]?.class_name).length;
    const unjustified = attendance.filter((item) => item.justification_status !== "justified").length;
    const documentsToReview = documents.filter((item) => ["received", "rejected", "expired"].includes(item.status)).length;
    return { confirmed, drafts, preRegistered, withoutClass, unjustified, documentsToReview, total: enrollments.length };
  }, [attendance, documents, enrollments]);

  const profile = functionalProfile ?? "secretary";
  const kpis = useMemo(() => {
    if (["owner", "admin"].includes(profile)) return [
      ["Effectif inscrit", metrics.confirmed, "pi-users"],
      ["Dossiers en attente", metrics.drafts + metrics.preRegistered, "pi-inbox"],
      ["Sans classe", metrics.withoutClass, "pi-sitemap"],
      ["Absences à suivre", metrics.unjustified, "pi-calendar-minus"],
      ["Documents à contrôler", metrics.documentsToReview, "pi-folder-open"],
    ];
    if (profile === "teacher") return [
      ["Élèves inscrits", metrics.confirmed, "pi-users"],
      ["Absences à justifier", metrics.unjustified, "pi-calendar-minus"],
      ["Élèves sans classe", metrics.withoutClass, "pi-sitemap"],
    ];
    if (profile === "finance") return [
      ["Élèves inscrits", metrics.confirmed, "pi-users"],
      ["Préinscriptions", metrics.preRegistered, "pi-calendar-plus"],
      ["Dossiers incomplets", metrics.drafts, "pi-file-edit"],
    ];
    return [
      ["Nouveaux inscrits", metrics.confirmed, "pi-user-plus"],
      ["Brouillons", metrics.drafts, "pi-file-edit"],
      ["Préinscriptions", metrics.preRegistered, "pi-calendar-plus"],
      ["Sans classe", metrics.withoutClass, "pi-sitemap"],
      ["Documents à contrôler", metrics.documentsToReview, "pi-folder-open"],
    ];
  }, [metrics, profile]);

  const workItems = useMemo<WorkItem[]>(() => {
    const common = [
      { id: "without-class", priority: "Urgent" as const, label: "Élèves inscrits sans classe", count: metrics.withoutClass, route: "/scolarite/preparation-rentree" },
      { id: "documents", priority: "Aujourd’hui" as const, label: "Documents à contrôler", count: metrics.documentsToReview, route: "/scolarite/documents" },
      { id: "attendance", priority: "À traiter" as const, label: "Absences et retards non justifiés", count: metrics.unjustified, route: "/scolarite/assiduite" },
    ];
    if (profile === "teacher") return common.filter((item) => item.id === "attendance");
    if (profile === "finance") return [
      { id: "drafts", priority: "À traiter", label: "Dossiers non confirmés", count: metrics.drafts + metrics.preRegistered, route: "/scolarite/inscriptions" },
    ];
    return [
      ...common,
      { id: "drafts", priority: "À traiter", label: "Inscriptions en brouillon", count: metrics.drafts, route: "/scolarite/inscriptions" },
      { id: "pre", priority: "Préparation", label: "Préinscriptions à examiner", count: metrics.preRegistered, route: "/scolarite/preinscriptions" },
    ];
  }, [metrics, profile]);

  const alerts = workItems.filter((item) => item.count > 0 && ["Urgent", "Aujourd’hui"].includes(item.priority));
  const recentItems = useMemo<RecentItem[]>(() => enrollments.slice(0, 6).map((item) => ({
    id: item.id,
    label: `${item.student.first_name} ${item.student.last_name}`,
    detail: item.status === "confirmed" ? "Inscription confirmée" : item.status === "pre_registered" ? "Préinscription enregistrée" : "Dossier mis à jour",
    date: item.updated_at || item.created_at,
    route: `/scolarite/eleves/${item.student.id}`,
  })), [enrollments]);

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <SchoolingPanel
      path={`Scolarité · ${year?.name ?? "Année scolaire"}`}
      title="Vue d’ensemble"
      description={`Poste de pilotage adapté au profil ${profileLabels[profile] ?? profile}.`}
      alert={failure ? <Message severity="error" text={failure} /> : undefined}
      toolbar={<div className="flex items-center justify-between gap-3"><Tag value={profileLabels[profile] ?? profile} severity="info" /><Button label="Actualiser" icon="pi pi-refresh" size="small" outlined loading={loading} onClick={() => void load()} /></div>}
    >
      <div className="space-y-6">
        {alerts.length ? <section className="grid gap-3 md:grid-cols-2">{alerts.map((item) => <button key={item.id} type="button" className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-left" onClick={() => void navigate(item.route)}><span><strong className="block text-sm text-slate-900">{item.label}</strong><small className="text-slate-600">Une action est attendue dans ce module.</small></span><Tag value={String(item.count)} severity="warning" /></button>)}</section> : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{kpis.map(([label, value, icon]) => <article key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span><i className={`pi ${icon} text-slate-400`} /></div><strong className="text-2xl font-semibold text-slate-900">{value}</strong></article>)}</section>

        <section><div className="mb-3"><h2 className="m-0 text-base font-semibold">Cockpit</h2><p className="m-0 text-sm text-slate-500">Les tâches prioritaires correspondant à votre fonction.</p></div><DataTable value={workItems.filter((item) => item.count > 0)} dataKey="id" size="small" emptyMessage="Aucune tâche prioritaire."><Column header="Priorité" body={(item: WorkItem) => <Tag value={item.priority} severity={severity[item.priority]} />} /><Column field="label" header="Travail à réaliser" /><Column field="count" header="Nombre" /><Column header="Action" body={(item: WorkItem) => <Button label="Ouvrir" icon="pi pi-arrow-right" iconPos="right" text size="small" onClick={() => void navigate(item.route)} />} /></DataTable></section>

        <section><div className="mb-3"><h2 className="m-0 text-base font-semibold">Tâches récentes</h2><p className="m-0 text-sm text-slate-500">Dernières opérations visibles dans le périmètre de la scolarité.</p></div><DataTable value={recentItems} dataKey="id" size="small" emptyMessage="Aucune activité récente."><Column field="label" header="Dossier" /><Column field="detail" header="Action" /><Column header="Date" body={(item: RecentItem) => new Intl.DateTimeFormat("fr-GN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.date))} /><Column header="" body={(item: RecentItem) => <Button icon="pi pi-arrow-right" text rounded aria-label="Ouvrir" onClick={() => void navigate(item.route)} />} /></DataTable></section>
      </div>
    </SchoolingPanel>
  );
}
