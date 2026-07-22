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
import {
  listEnrollmentDocuments,
  updateEnrollmentDocumentStatus,
  type EnrollmentDocumentRow,
  type EnrollmentDocumentStatus,
} from "../services/schooling-workflows.service";

const statusOptions: Array<{ label: string; value: EnrollmentDocumentStatus }> = [
  { label: "Demandé", value: "requested" },
  { label: "Reçu", value: "received" },
  { label: "À valider", value: "received" },
  { label: "Validé", value: "verified" },
  { label: "Rejeté", value: "rejected" },
  { label: "Expiré", value: "expired" },
];

const statusLabel: Record<EnrollmentDocumentStatus, string> = {
  requested: "Manquant",
  received: "À valider",
  verified: "Validé",
  rejected: "Rejeté",
  expired: "Expiré",
};

const statusSeverity: Record<EnrollmentDocumentStatus, "success" | "info" | "warning" | "danger" | "secondary"> = {
  requested: "warning",
  received: "info",
  verified: "success",
  rejected: "danger",
  expired: "secondary",
};

export function DocumentsWorkspacePage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const [items, setItems] = useState<EnrollmentDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<EnrollmentDocumentStatus | "">("");
  const [documentName, setDocumentName] = useState("");
  const [selected, setSelected] = useState<EnrollmentDocumentRow | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      setItems(await listEnrollmentDocuments(institutionId, yearId));
    } catch {
      setFailure("Impossible de charger les documents des élèves.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => void load(), [load]);

  const documentOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.document_name))).sort().map((name) => ({ label: name, value: name })),
    [items],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return items.filter((item) => {
      const student = item.enrollment.student;
      const haystack = `${student.first_name} ${student.last_name} ${student.matricule} ${item.document_name}`.toLocaleLowerCase("fr");
      return (!query || haystack.includes(query)) && (!status || item.status === status) && (!documentName || item.document_name === documentName);
    });
  }, [documentName, items, search, status]);

  const counters = useMemo(() => ({
    all: items.length,
    missing: items.filter((item) => item.status === "requested").length,
    pending: items.filter((item) => item.status === "received").length,
    rejected: items.filter((item) => item.status === "rejected").length,
    expired: items.filter((item) => item.status === "expired").length,
  }), [items]);

  const changeStatus = async (row: EnrollmentDocumentRow, nextStatus: EnrollmentDocumentStatus, reason?: string) => {
    try {
      await updateEnrollmentDocumentStatus(row.id, nextStatus, reason);
      setSelected(null);
      setRejectionReason("");
      await load();
    } catch {
      setFailure("Le statut du document n'a pas pu être modifié.");
    }
  };

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <SchoolingPanel
      path={`Scolarité · ${year?.name ?? "Année scolaire"}`}
      title="Suivi documentaire"
      description="Retrouvez directement tous les documents réels des élèves, leurs manquants et les validations à traiter."
      alert={failure ? <Message severity="error" text={failure} /> : undefined}
    >
      <div className="mb-3 flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto">
        <span className="p-input-icon-left min-w-56 flex-1">
          <i className="pi pi-search" />
          <InputText className="w-full" value={search} placeholder="Rechercher un élève ou un document" onChange={(event) => setSearch(event.target.value)} />
        </span>
        <Dropdown className="w-44 shrink-0" value={documentName} options={documentOptions} placeholder="Tous les documents" showClear onChange={(event) => setDocumentName(event.value ?? "")} />
        <Dropdown className="w-40 shrink-0" value={status} options={statusOptions} placeholder="Tous les statuts" showClear onChange={(event) => setStatus(event.value ?? "")} />
        <Button className="shrink-0" label="Actualiser" icon="pi pi-refresh" text onClick={() => void load()} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-y border-slate-200 px-1 py-2 text-sm">
        <button className="font-semibold" onClick={() => setStatus("")}>Tous {counters.all}</button>
        <button onClick={() => setStatus("requested")}>Manquants {counters.missing}</button>
        <button onClick={() => setStatus("received")}>À valider {counters.pending}</button>
        <button onClick={() => setStatus("rejected")}>Rejetés {counters.rejected}</button>
        <button onClick={() => setStatus("expired")}>Expirés {counters.expired}</button>
      </div>

      <DataTable
        value={filtered}
        loading={loading}
        paginator
        rows={20}
        dataKey="id"
        size="small"
        emptyMessage="Aucun document ne correspond aux filtres."
        onRowDoubleClick={(event) => navigate(`/scolarite/eleves/${event.data.enrollment.student.id}`)}
      >
        <Column header="Élève" body={(row: EnrollmentDocumentRow) => <div><strong>{row.enrollment.student.first_name} {row.enrollment.student.last_name}</strong><small className="block text-slate-500">{row.enrollment.student.matricule}</small></div>} />
        <Column header="Classe" body={(row: EnrollmentDocumentRow) => row.enrollment.class_assignments.find((item) => !item.ends_on)?.class_name_snapshot || row.enrollment.level_name_snapshot || "—"} />
        <Column field="document_name" header="Document" />
        <Column header="Statut" body={(row: EnrollmentDocumentRow) => <Tag value={statusLabel[row.status]} severity={statusSeverity[row.status]} />} />
        <Column header="Mis à jour" body={(row: EnrollmentDocumentRow) => new Intl.DateTimeFormat("fr-FR").format(new Date(row.updated_at))} />
        <Column
          header="Actions"
          body={(row: EnrollmentDocumentRow) => <div className="flex justify-end gap-1">
            {row.status === "received" && <Button icon="pi pi-check" text rounded aria-label="Valider" onClick={() => void changeStatus(row, "verified")} />}
            {row.status === "received" && <Button icon="pi pi-times" severity="danger" text rounded aria-label="Rejeter" onClick={() => setSelected(row)} />}
            <Button icon="pi pi-user" text rounded aria-label="Ouvrir l'élève" onClick={() => navigate(`/scolarite/eleves/${row.enrollment.student.id}`)} />
          </div>}
        />
      </DataTable>

      <Dialog
        header="Rejeter le document"
        visible={Boolean(selected)}
        onHide={() => { setSelected(null); setRejectionReason(""); }}
        style={{ width: "min(520px, 95vw)" }}
        footer={<div className="flex justify-end gap-2"><Button label="Annuler" severity="secondary" text onClick={() => setSelected(null)} /><Button label="Rejeter" severity="danger" disabled={!rejectionReason.trim()} onClick={() => selected && void changeStatus(selected, "rejected", rejectionReason)} /></div>}
      >
        <label><span className="mb-1 block text-sm font-semibold">Motif du rejet</span><InputTextarea className="w-full" rows={3} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} /></label>
      </Dialog>
    </SchoolingPanel>
  );
}
