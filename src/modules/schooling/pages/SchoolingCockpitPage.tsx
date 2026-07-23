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
      setFailure("Impossible de charger le cockpit de la scolarité.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => void load(), [load]);

  const workItems = useMemo<WorkItem[]>(() => {
    const withoutClass = enrollments.filter((item) => item.status === "confirmed" && !item.assignment[0]?.class_name).length;
    const drafts = enrollments.filter((item) => item.status === "draft").length;
    const preRegistered = enrollments.filter((item) => item.status === "pre_registered").length;
    return [
      { id: "without-class", priority: "Urgent", label: "Élèves inscrits sans classe", count: withoutClass, route: "/scolarite/preparation-rentree" },
      { id: "documents", priority: "Aujourd’hui", label: "Documents à contrôler", count: 0, route: "/scolarite/documents" },
      { id: "drafts", priority: "À traiter", label: "Inscriptions en brouillon", count: drafts, route: "/scolarite/inscriptions" },
      { id: "pre-registrations", priority: "Préparation", label: "Préinscriptions à examiner", count: preRegistered, route: "/scolarite/preinscriptions" },
    ];
  }, [enrollments]);

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <SchoolingPanel
      path={`Scolarité · ${year?.name ?? "Année scolaire"}`}
      title="Cockpit de la scolarité"
      description="Traitez les dossiers prioritaires et ouvrez directement le workspace concerné."
      alert={failure ? <Message severity="error" text={failure} /> : undefined}
      toolbar={<div className="flex justify-end"><Button label="Actualiser" icon="pi pi-refresh" size="small" outlined loading={loading} onClick={() => void load()} /></div>}
    >
      <DataTable value={workItems} dataKey="id" size="small" emptyMessage="Aucune tâche prioritaire.">
        <Column header="Priorité" body={(item: WorkItem) => <Tag value={item.priority} severity={severity[item.priority]} />} />
        <Column field="label" header="Travail à réaliser" />
        <Column field="count" header="Nombre" />
        <Column header="Action" body={(item: WorkItem) => <Button label="Ouvrir" icon="pi pi-arrow-right" iconPos="right" text size="small" onClick={() => void navigate(item.route)} />} />
      </DataTable>
    </SchoolingPanel>
  );
}
