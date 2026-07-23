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

const controlClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white text-sm shadow-sm";
const buttonReset =
  "appearance-none border-0 bg-transparent p-0 font-inherit text-inherit shadow-none outline-none";

const statusOptions: Array<{
  label: string;
  value: EnrollmentDocumentStatus | "";
}> = [
  { label: "Tous les statuts", value: "" },
  { label: "Manquant", value: "requested" },
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

const statusSeverity: Record<
  EnrollmentDocumentStatus,
  "success" | "info" | "warning" | "danger" | "secondary"
> = {
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
    () => [
      { label: "Tous les documents", value: "" },
      ...Array.from(new Set(items.map((item) => item.document_name)))
        .sort((left, right) => left.localeCompare(right, "fr"))
        .map((name) => ({ label: name, value: name })),
    ],
    [items],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return items.filter((item) => {
      const student = item.enrollment.student;
      const haystack =
        `${student.first_name} ${student.last_name} ${student.matricule} ${item.document_name}`.toLocaleLowerCase(
          "fr",
        );
      return (
        (!query || haystack.includes(query)) &&
        (!status || item.status === status) &&
        (!documentName || item.document_name === documentName)
      );
    });
  }, [documentName, items, search, status]);

  const counters = useMemo(
    () => ({
      all: items.length,
      requested: items.filter((item) => item.status === "requested").length,
      received: items.filter((item) => item.status === "received").length,
      verified: items.filter((item) => item.status === "verified").length,
      rejected: items.filter((item) => item.status === "rejected").length,
      expired: items.filter((item) => item.status === "expired").length,
    }),
    [items],
  );

  const statusTabs: Array<{
    label: string;
    value: EnrollmentDocumentStatus | "";
    count: number;
  }> = [
    { label: "Tous", value: "", count: counters.all },
    { label: "Manquants", value: "requested", count: counters.requested },
    { label: "À valider", value: "received", count: counters.received },
    { label: "Validés", value: "verified", count: counters.verified },
    { label: "Rejetés", value: "rejected", count: counters.rejected },
    { label: "Expirés", value: "expired", count: counters.expired },
  ];

  const changeStatus = async (
    row: EnrollmentDocumentRow,
    nextStatus: EnrollmentDocumentStatus,
    reason?: string,
  ) => {
    try {
      await updateEnrollmentDocumentStatus(row.id, nextStatus, reason);
      setSelected(null);
      setRejectionReason("");
      await load();
    } catch {
      setFailure("Le statut du document n’a pas pu être modifié.");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setDocumentName("");
  };

  const activeFilterCount = [search, status, documentName].filter(
    Boolean,
  ).length;

  if (!yearId)
    return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <SchoolingPanel
      path={`Scolarité · ${year?.name ?? "Année scolaire"}`}
      title="Suivi documentaire"
      description="Contrôlez les pièces administratives des inscriptions depuis une file unique et cohérente."
      meta={
        <span className="text-sm text-slate-500">
          <strong className="text-slate-900">{filtered.length}</strong>{" "}
          document(s)
        </span>
      }
      actions={
        <Button
          label="Actualiser"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          loading={loading}
          onClick={() => void load()}
        />
      }
      alert={failure ? <Message severity="error" text={failure} /> : undefined}
      toolbar={
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[minmax(320px,1fr)_240px_220px_auto] xl:items-end">
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              Rechercher
            </span>
            <span className="p-input-icon-left block w-full">
              <i className="pi pi-search" />
              <InputText
                className={`${controlClass} pl-9`}
                value={search}
                placeholder="Élève, matricule ou document"
                onChange={(event) => setSearch(event.target.value)}
              />
            </span>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              Document
            </span>
            <Dropdown
              className={controlClass}
              value={documentName}
              options={documentOptions}
              onChange={(event) => setDocumentName(String(event.value ?? ""))}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              Statut
            </span>
            <Dropdown
              className={controlClass}
              value={status}
              options={statusOptions}
              onChange={(event) =>
                setStatus((event.value ?? "") as EnrollmentDocumentStatus | "")
              }
            />
          </label>
          <Button
            label="Réinitialiser"
            icon="pi pi-filter-slash"
            severity="secondary"
            text
            disabled={!activeFilterCount}
            onClick={resetFilters}
          />
        </div>
      }
    >
      <nav
        className="overflow-x-auto border-b border-slate-200 bg-white"
        aria-label="États des documents"
      >
        <div className="flex min-w-max items-center gap-6 px-1">
          {statusTabs.map((tab) => {
            const active = status === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                className={`${buttonReset} relative flex h-11 items-center gap-2 px-1 text-sm font-medium transition ${
                  active
                    ? "text-emerald-700"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                onClick={() => setStatus(tab.value)}
              >
                {tab.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {tab.count}
                </span>
                {active ? (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-600" />
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <DataTable
          value={filtered}
          loading={loading}
          paginator
          rows={20}
          rowsPerPageOptions={[20, 40, 60]}
          dataKey="id"
          size="small"
          emptyMessage="Aucun document ne correspond aux filtres."
          onRowDoubleClick={(event) =>
            navigate(`/scolarite/eleves/${event.data.enrollment.student.id}`)
          }
          tableStyle={{ minWidth: "1040px" }}
        >
          <Column
            header="Élève"
            body={(row: EnrollmentDocumentRow) => (
              <div>
                <strong className="block text-sm font-semibold text-slate-900">
                  {row.enrollment.student.first_name}{" "}
                  {row.enrollment.student.last_name}
                </strong>
                <small className="block text-xs text-slate-500">
                  {row.enrollment.student.matricule}
                </small>
              </div>
            )}
          />
          <Column
            header="Niveau / classe"
            body={(row: EnrollmentDocumentRow) =>
              row.enrollment.class_assignments.find((item) => !item.ends_on)
                ?.class_name_snapshot ||
              row.enrollment.level_name_snapshot ||
              "—"
            }
          />
          <Column field="document_name" header="Document" sortable />
          <Column
            header="Statut"
            body={(row: EnrollmentDocumentRow) => (
              <Tag
                value={statusLabel[row.status]}
                severity={statusSeverity[row.status]}
              />
            )}
          />
          <Column
            header="Mis à jour"
            sortable
            sortField="updated_at"
            body={(row: EnrollmentDocumentRow) =>
              new Intl.DateTimeFormat("fr-FR").format(new Date(row.updated_at))
            }
          />
          <Column
            header="Actions"
            bodyClassName="w-44"
            body={(row: EnrollmentDocumentRow) => (
              <div className="flex items-center justify-end gap-1">
                {row.status === "received" ? (
                  <Button
                    label="Valider"
                    icon="pi pi-check"
                    severity="success"
                    text
                    size="small"
                    onClick={() => void changeStatus(row, "verified")}
                  />
                ) : null}
                {row.status === "received" ? (
                  <Button
                    label="Rejeter"
                    icon="pi pi-times"
                    severity="danger"
                    text
                    size="small"
                    onClick={() => setSelected(row)}
                  />
                ) : null}
                <Button
                  icon="pi pi-chevron-right"
                  severity="secondary"
                  text
                  size="small"
                  aria-label="Ouvrir la fiche élève"
                  onClick={() =>
                    navigate(`/scolarite/eleves/${row.enrollment.student.id}`)
                  }
                />
              </div>
            )}
          />
        </DataTable>
      </div>

      <Dialog
        header="Rejeter le document"
        visible={Boolean(selected)}
        onHide={() => {
          setSelected(null);
          setRejectionReason("");
        }}
        style={{ width: "min(560px, 95vw)" }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Annuler"
              severity="secondary"
              outlined
              onClick={() => setSelected(null)}
            />
            <Button
              label="Rejeter"
              icon="pi pi-times"
              severity="danger"
              disabled={!rejectionReason.trim()}
              onClick={() =>
                selected &&
                void changeStatus(selected, "rejected", rejectionReason)
              }
            />
          </div>
        }
      >
        <label>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Motif du rejet
          </span>
          <InputTextarea
            className="w-full rounded-md"
            rows={4}
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
          />
        </label>
      </Dialog>
    </SchoolingPanel>
  );
}
