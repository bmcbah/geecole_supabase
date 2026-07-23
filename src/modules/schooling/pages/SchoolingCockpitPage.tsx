import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { SchoolingPanel } from "../components/SchoolingPanel";
import { listEnrollmentWorkflows, type EnrollmentWorkflowRow } from "../services/schooling-workflows.service";

type WorkItem = {
  id: string;
  priority: "Urgent" | "Aujourd’hui" | "À traiter" | "Préparation";
  label: string;
  count: number;
  route: string;
};

type FunctionView = {
  id: string;
  label: string;
  description: string;
  icon: string;
  count: number;
  route: string;
};

const severity = {
  Urgent: "danger",
  "Aujourd’hui": "warning",
  "À traiter": "info",
  Préparation: "secondary",
} as const;

export function SchoolingCockpitPage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const [enrollments, setEnrollments] = useState<EnrollmentWorkflowRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      setEnrollments(await listEnrollmentWorkflows(institutionId, yearId));
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
    const transferred = enrollments.filter((item) => item.status === "transferred").length;
    const cancelled = enrollments.filter((item) => item.status === "cancelled").length;
    return { confirmed, drafts, preRegistered, withoutClass, transferred, cancelled, total: enrollments.length };
  }, [enrollments]);

  const workItems = useMemo<WorkItem[]>(() => [
    { id: "without-class", priority: "Urgent", label: "Élèves inscrits sans classe", count: metrics.withoutClass, route: "/scolarite/preparation-rentree" },
    { id: "documents", priority: "Aujourd’hui", label: "Documents à contrôler", count: 0, route: "/scolarite/documents" },
    { id: "drafts", priority: "À traiter", label: "Inscriptions en brouillon", count: metrics.drafts, route: "/scolarite/inscriptions" },
    { id: "pre-registrations", priority: "Préparation", label: "Préinscriptions à examiner", count: metrics.preRegistered, route: "/scolarite/preinscriptions" },
  ], [metrics]);

  const functionViews = useMemo<FunctionView[]>(() => [
    { id: "students", label: "Élèves", description: "Rechercher, consulter et suivre les dossiers élèves.", icon: "pi-users", count: metrics.total, route: "/scolarite/eleves" },
    { id: "enrollments", label: "Inscriptions", description: "Traiter les nouveaux élèves de l’année active.", icon: "pi-user-plus", count: metrics.confirmed + metrics.drafts, route: "/scolarite/inscriptions" },
    { id: "reenrollments", label: "Réinscriptions", description: "Reprendre les élèves des années antérieures.", icon: "pi-refresh", count: 0, route: "/scolarite/reinscriptions" },
    { id: "pre", label: "Préinscriptions", description: "Préparer les candidats d’une année future.", icon: "pi-calendar-plus", count: metrics.preRegistered, route: "/scolarite/preinscriptions" },
    { id: "attendance", label: "Assiduité", description: "Saisir et suivre absences et retards.", icon: "pi-calendar-minus", count: 0, route: "/scolarite/assiduite" },
    { id: "documents", label: "Documents", description: "Contrôler les pièces administratives.", icon: "pi-folder-open", count: 0, route: "/scolarite/documents" },
  ], [metrics]);

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <SchoolingPanel
      path={`Scolarité · ${year?.name ?? "Année scolaire"}`}
      title="Vue d’ensemble"
      description="Pilotez la scolarité par indicateurs, priorités et fonctions de travail."
      alert={failure ? <Message severity="error" text={failure} /> : undefined}
      toolbar={<div className="flex justify-end"><Button label="Actualiser" icon="pi pi-refresh" size="small" outlined loading={loading} onClick={() => void load()} /></div>}
    >
      <div className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ["Élèves suivis", metrics.total, "pi-users"],
            ["Inscrits", metrics.confirmed, "pi-check-circle"],
            ["Brouillons", metrics.drafts, "pi-file-edit"],
            ["Préinscrits", metrics.preRegistered, "pi-calendar-plus"],
            ["Sans classe", metrics.withoutClass, "pi-exclamation-triangle"],
            ["Sorties", metrics.transferred + metrics.cancelled, "pi-sign-out"],
          ].map(([label, value, icon]) => (
            <article key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span><i className={`pi ${icon} text-slate-400`} /></div>
              <strong className="text-2xl font-semibold text-slate-900">{value}</strong>
            </article>
          ))}
        </section>

        <section>
          <div className="mb-3"><h2 className="m-0 text-base font-semibold">Travail à traiter</h2><p className="m-0 text-sm text-slate-500">Les dossiers qui nécessitent une action de la scolarité.</p></div>
          <DataTable value={workItems} dataKey="id" size="small" emptyMessage="Aucune tâche prioritaire.">
            <Column header="Priorité" body={(item: WorkItem) => <Tag value={item.priority} severity={severity[item.priority]} />} />
            <Column field="label" header="Travail à réaliser" />
            <Column field="count" header="Nombre" />
            <Column header="Action" body={(item: WorkItem) => <Button label="Ouvrir" icon="pi pi-arrow-right" iconPos="right" text size="small" onClick={() => void navigate(item.route)} />} />
          </DataTable>
        </section>

        <section>
          <div className="mb-3"><h2 className="m-0 text-base font-semibold">Vue par fonction</h2><p className="m-0 text-sm text-slate-500">Accédez directement à la mission métier concernée.</p></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {functionViews.map((item) => (
              <button key={item.id} type="button" className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/30" onClick={() => void navigate(item.route)}>
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><i className={`pi ${item.icon}`} /></span>
                <span className="min-w-0 flex-1"><strong className="block text-sm text-slate-900">{item.label}</strong><small className="mt-1 block text-sm leading-5 text-slate-500">{item.description}</small></span>
                <Tag value={String(item.count)} severity="secondary" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </SchoolingPanel>
  );
}
