import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  changeEnrollmentStatus,
  listEnrollmentWorkflows,
  type EnrollmentWorkflowRow,
  type EnrollmentWorkflowStatus,
} from "../services/schooling-workflows.service";

const statusOptions: Array<{ label: string; value: EnrollmentWorkflowStatus | "" }> = [
  { label: "Tous les statuts", value: "" },
  { label: "Brouillons", value: "draft" },
  { label: "Préinscriptions", value: "pre_registered" },
  { label: "Confirmées", value: "confirmed" },
  { label: "Refusées", value: "rejected" },
  { label: "Retirées", value: "withdrawn" },
  { label: "Annulées", value: "cancelled" },
  { label: "Transférées", value: "transferred" },
];

const labels: Record<EnrollmentWorkflowStatus, string> = {
  draft: "Brouillon",
  pre_registered: "Préinscription",
  confirmed: "Confirmée",
  rejected: "Refusée",
  withdrawn: "Retirée",
  cancelled: "Annulée",
  transferred: "Transférée",
};

const severity: Record<EnrollmentWorkflowStatus, "secondary" | "info" | "success" | "danger" | "warning"> = {
  draft: "secondary",
  pre_registered: "info",
  confirmed: "success",
  rejected: "danger",
  withdrawn: "warning",
  cancelled: "danger",
  transferred: "info",
};

export function AdmissionsWorkspacePage() {
  const { institutionId, yearId, year } = useAcademicSession();
  const [items, setItems] = useState<EnrollmentWorkflowRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<EnrollmentWorkflowStatus | "">("");
  const [failure, setFailure] = useState("");
  const [success, setSuccess] = useState("");
  const [selected, setSelected] = useState<EnrollmentWorkflowRow | null>(null);
  const [target, setTarget] = useState<EnrollmentWorkflowStatus>("confirmed");
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      setItems(await listEnrollmentWorkflows(institutionId, yearId));
    } catch {
      setFailure("Impossible de charger les dossiers d'inscription.");
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

  const openTransition = (row: EnrollmentWorkflowRow, next: EnrollmentWorkflowStatus) => {
    setSelected(row);
    setTarget(next);
    setReason("");
  };

  const apply = async () => {
    if (!selected) return;
    const reasonRequired = ["rejected", "withdrawn", "cancelled", "transferred"].includes(target);
    if (reasonRequired && !reason.trim()) return;
    setProcessing(true);
    setFailure("");
    try {
      await changeEnrollmentStatus(selected.id, target, reason);
      setSelected(null);
      setSuccess("Le statut du dossier a été mis à jour.");
      await load();
    } catch {
      setFailure("La transition demandée n'est pas autorisée ou n'a pas pu être enregistrée.");
    } finally {
      setProcessing(false);
    }
  };

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <SchoolingPanel
      path={`Scolarité · ${year?.name ?? "Année scolaire"}`}
      title="Admissions et inscriptions"
      description="Traitez les brouillons, préinscriptions, confirmations, refus, retraits et transferts sans supprimer l'historique."
      alert={failure ? <Message severity="error" text={failure} /> : success ? <Message severity="success" text={success} /> : undefined}
      toolbar={
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(280px,1fr)_240px]">
          <span className="p-input-icon-left w-full">
            <i className="pi pi-search" />
            <InputText className="w-full" value={query} placeholder="Nom, matricule ou niveau" onChange={(event) => setQuery(event.target.value)} />
          </span>
          <Dropdown className="w-full" value={status} options={statusOptions} onChange={(event) => setStatus(event.value)} />
        </div>
      }
    >
      <DataTable value={filtered} loading={loading} paginator rows={15} rowsPerPageOptions={[15, 30, 50]} dataKey="id" emptyMessage="Aucun dossier trouvé.">
        <Column header="Élève" body={(row: EnrollmentWorkflowRow) => <div><strong>{row.student.first_name} {row.student.last_name}</strong><small className="block text-slate-500">{row.student.matricule}</small></div>} />
        <Column field="cycle_name_snapshot" header="Cycle" />
        <Column field="level_name_snapshot" header="Niveau" />
        <Column header="Classe" body={(row: EnrollmentWorkflowRow) => row.assignment[0]?.class_name ?? "Non affectée"} />
        <Column header="Statut" body={(row: EnrollmentWorkflowRow) => <Tag value={labels[row.status]} severity={severity[row.status]} />} />
        <Column header="Actions" body={(row: EnrollmentWorkflowRow) => <div className="flex flex-wrap gap-2">
          {row.status !== "confirmed" && row.status !== "cancelled" && row.status !== "transferred" ? <Button label="Confirmer" icon="pi pi-check" size="small" onClick={() => openTransition(row, "confirmed")} /> : null}
          {row.status === "draft" ? <Button label="Préinscrire" icon="pi pi-send" severity="secondary" outlined size="small" onClick={() => openTransition(row, "pre_registered")} /> : null}
          {row.status !== "confirmed" && row.status !== "rejected" ? <Button label="Refuser" icon="pi pi-times" severity="danger" text size="small" onClick={() => openTransition(row, "rejected")} /> : null}
          {row.status === "confirmed" ? <Button label="Transférer" icon="pi pi-arrow-right-arrow-left" severity="secondary" outlined size="small" onClick={() => openTransition(row, "transferred")} /> : null}
          {row.status === "confirmed" ? <Button label="Annuler" icon="pi pi-ban" severity="danger" text size="small" onClick={() => openTransition(row, "cancelled")} /> : null}
        </div>} />
      </DataTable>

      <Dialog header={`Passer le dossier à « ${labels[target]} »`} visible={Boolean(selected)} onHide={() => setSelected(null)} style={{ width: "min(520px, 95vw)" }} footer={<div className="flex justify-end gap-2"><Button label="Fermer" severity="secondary" text onClick={() => setSelected(null)} /><Button label="Confirmer" loading={processing} disabled={["rejected", "withdrawn", "cancelled", "transferred"].includes(target) && !reason.trim()} onClick={() => void apply()} /></div>}>
        <p className="mb-4 text-sm text-slate-600">{selected ? `${selected.student.first_name} ${selected.student.last_name} · ${selected.student.matricule}` : ""}</p>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Motif {["rejected", "withdrawn", "cancelled", "transferred"].includes(target) ? "obligatoire" : "facultatif"}</span><InputTextarea className="w-full" rows={4} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      </Dialog>
    </SchoolingPanel>
  );
}
