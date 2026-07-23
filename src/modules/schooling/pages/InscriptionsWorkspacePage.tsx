import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { SchoolingPanel } from "../components/SchoolingPanel";
import { changeEnrollmentStatus, listEnrollmentWorkflows, type EnrollmentWorkflowRow, type EnrollmentWorkflowStatus } from "../services/schooling-workflows.service";

const statuses: Array<{ label: string; value: EnrollmentWorkflowStatus | "" }> = [
  { label: "Tous les statuts", value: "" },
  { label: "Brouillons", value: "draft" },
  { label: "Confirmées", value: "confirmed" },
  { label: "Annulées", value: "cancelled" },
  { label: "Transférées", value: "transferred" },
];

const labels: Partial<Record<EnrollmentWorkflowStatus, string>> = {
  draft: "Brouillon",
  confirmed: "Confirmée",
  cancelled: "Annulée",
  transferred: "Transférée",
};

export function InscriptionsWorkspacePage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const [items, setItems] = useState<EnrollmentWorkflowRow[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<EnrollmentWorkflowStatus | "">("");
  const [selected, setSelected] = useState<EnrollmentWorkflowRow | null>(null);
  const [target, setTarget] = useState<EnrollmentWorkflowStatus>("confirmed");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    try {
      const rows = await listEnrollmentWorkflows(institutionId, yearId);
      setItems(rows.filter((item) => item.status !== "pre_registered" && item.status !== "rejected" && item.status !== "withdrawn"));
    } catch {
      setFailure("Impossible de charger les inscriptions de l’année active.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => void load(), [load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return items.filter((item) => {
      const searchable = `${item.student.first_name} ${item.student.last_name} ${item.student.matricule} ${item.level_name_snapshot}`.toLocaleLowerCase("fr");
      return (!normalized || searchable.includes(normalized)) && (!status || item.status === status);
    });
  }, [items, query, status]);

  const apply = async () => {
    if (!selected) return;
    await changeEnrollmentStatus(selected.id, target, reason);
    setSelected(null);
    setReason("");
    await load();
  };

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <SchoolingPanel
      path={`Scolarité · ${year?.name ?? "Année active"}`}
      title="Inscriptions"
      description="Inscrivez les nouveaux élèves dans l’année active et suivez les dossiers jusqu’à leur confirmation."
      alert={failure ? <Message severity="error" text={failure} /> : undefined}
      toolbar={<div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3"><span className="p-input-icon-left min-w-64 flex-1"><i className="pi pi-search" /><InputText className="w-full" value={query} placeholder="Nom, matricule ou niveau" onChange={(event) => setQuery(event.target.value)} /></span><Dropdown value={status} options={statuses} onChange={(event) => setStatus(event.value)} /><Button label="Nouvelle inscription" icon="pi pi-plus" size="small" onClick={() => void navigate("/scolarite/inscriptions/nouvelle")} /></div>}
    >
      <DataTable value={filtered} loading={loading} paginator rows={15} dataKey="id" size="small" emptyMessage="Aucune inscription trouvée.">
        <Column header="Élève" body={(row: EnrollmentWorkflowRow) => <div><strong>{row.student.first_name} {row.student.last_name}</strong><small className="block text-slate-500">{row.student.matricule}</small></div>} />
        <Column field="cycle_name_snapshot" header="Cycle" />
        <Column field="level_name_snapshot" header="Niveau" />
        <Column header="Classe" body={(row: EnrollmentWorkflowRow) => row.assignment[0]?.class_name ?? "Non affectée"} />
        <Column header="Statut" body={(row: EnrollmentWorkflowRow) => <Tag value={labels[row.status] ?? row.status} severity={row.status === "confirmed" ? "success" : row.status === "draft" ? "secondary" : "warning"} />} />
        <Column header="Actions" body={(row: EnrollmentWorkflowRow) => <div className="flex gap-2">{row.status === "draft" ? <Button label="Confirmer" icon="pi pi-check" size="small" onClick={() => { setSelected(row); setTarget("confirmed"); }} /> : null}{row.status === "confirmed" ? <Button label="Annuler" icon="pi pi-ban" severity="danger" text size="small" onClick={() => { setSelected(row); setTarget("cancelled"); }} /> : null}</div>} />
      </DataTable>
      <Dialog header={target === "confirmed" ? "Confirmer l’inscription" : "Annuler l’inscription"} visible={Boolean(selected)} onHide={() => setSelected(null)} style={{ width: "min(520px, 95vw)" }} footer={<div className="flex justify-end gap-2"><Button label="Fermer" text severity="secondary" onClick={() => setSelected(null)} /><Button label="Confirmer" disabled={target === "cancelled" && !reason.trim()} onClick={() => void apply()} /></div>}>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Motif {target === "cancelled" ? "obligatoire" : "facultatif"}</span><InputTextarea className="w-full" rows={4} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      </Dialog>
    </SchoolingPanel>
  );
}
