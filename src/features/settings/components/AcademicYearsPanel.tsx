import { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useToast } from "../../../shared/components/toast-context";
import {
  changeAcademicYearStatus,
  createAcademicYear,
  deleteAcademicYear,
  listAcademicYears,
} from "../services/settings.service";
import type { AcademicYearInput } from "../schemas/settings.schema";
import type { AcademicYear, AcademicYearStatus } from "../types/settings";
import { AcademicYearDialog } from "./AcademicYearDialog";

interface Props {
  institutionId: string;
}
const labels: Record<AcademicYearStatus, string> = {
  preparation: "Préparation",
  open: "Ouverte",
  closed: "Clôturée",
  archived: "Archivée",
};
const severities: Record<
  AcademicYearStatus,
  "info" | "success" | "warning" | "secondary"
> = {
  preparation: "info",
  open: "success",
  closed: "warning",
  archived: "secondary",
};
const nextStatus: Partial<Record<AcademicYearStatus, AcademicYearStatus>> = {
  preparation: "open",
  open: "closed",
  closed: "archived",
};
const actionLabels: Partial<Record<AcademicYearStatus, string>> = {
  preparation: "Ouvrir",
  open: "Clôturer",
  closed: "Archiver",
};

export function AcademicYearsPanel({ institutionId }: Props) {
  const notify = useToast();
  const [items, setItems] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setFailure("");
    try {
      setItems(await listAcademicYears(institutionId));
    } catch {
      setFailure("Impossible de charger les années scolaires.");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);
  useEffect(() => {
    void load();
  }, [load]);
  const create = async (input: AcademicYearInput) => {
    setSaving(true);
    try {
      await createAcademicYear(institutionId, input);
      setDialogOpen(false);
      notify({ severity: "success", summary: "Année scolaire créée" });
      await load();
    } catch {
      notify({
        severity: "error",
        summary: "Création impossible",
        detail: "Vérifiez le libellé et les dates.",
      });
    } finally {
      setSaving(false);
    }
  };
  const transition = (year: AcademicYear) => {
    const target = nextStatus[year.status];
    if (!target) return;
    confirmDialog({
      header: `${actionLabels[year.status]} l’année`,
      message: `Confirmer le passage de ${year.name} au statut « ${labels[target]} » ? Cette transition ne peut pas être annulée.`,
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Confirmer",
      rejectLabel: "Annuler",
      accept: () =>
        void (async () => {
          try {
            await changeAcademicYearStatus(year.id, target);
            notify({
              severity: "success",
              summary: `Année ${labels[target].toLowerCase()}`,
            });
            await load();
          } catch {
            notify({
              severity: "error",
              summary: "Transition impossible",
              detail:
                target === "open"
                  ? "Configurez au moins un niveau pour cette année et vérifiez qu’aucune autre année n’est ouverte."
                  : undefined,
            });
          }
        })(),
    });
  };
  const remove = (year: AcademicYear) =>
    confirmDialog({
      header: "Supprimer l’année en préparation",
      message: `Supprimer ${year.name} ?`,
      icon: "pi pi-trash",
      acceptClassName: "p-button-danger",
      acceptLabel: "Supprimer",
      rejectLabel: "Annuler",
      accept: () =>
        void (async () => {
          try {
            await deleteAcademicYear(year.id);
            await load();
          } catch {
            notify({ severity: "error", summary: "Suppression impossible" });
          }
        })(),
    });
  const actions = (year: AcademicYear) => (
    <div className="table-actions">
      {nextStatus[year.status] && (
        <Button
          label={actionLabels[year.status]}
          size="small"
          outlined
          onClick={() => transition(year)}
        />
      )}{" "}
      {year.status === "preparation" && (
        <Button
          icon="pi pi-trash"
          aria-label={`Supprimer ${year.name}`}
          size="small"
          severity="danger"
          text
          onClick={() => remove(year)}
        />
      )}
    </div>
  );
  return (
    <Card
      title="Années scolaires"
      subTitle="Une seule année peut être ouverte à la fois"
    >
      <ConfirmDialog />
      <div className="panel-toolbar">
        <p>
          Préparez l’année, ouvrez-la pour les opérations courantes, puis
          clôturez-la.
        </p>
        <Button
          label="Nouvelle année"
          icon="pi pi-plus"
          onClick={() => setDialogOpen(true)}
        />
      </div>
      {failure ? (
        <Message severity="error" text={failure} />
      ) : (
        <DataTable
          value={items}
          loading={loading}
          dataKey="id"
          emptyMessage="Aucune année scolaire"
          stripedRows
          responsiveLayout="scroll"
        >
          <Column field="name" header="Année" />
          <Column
            field="starts_on"
            header="Début"
            body={(row: AcademicYear) =>
              new Date(`${row.starts_on}T00:00:00`).toLocaleDateString("fr-GN")
            }
          />
          <Column
            field="ends_on"
            header="Fin"
            body={(row: AcademicYear) =>
              new Date(`${row.ends_on}T00:00:00`).toLocaleDateString("fr-GN")
            }
          />
          <Column
            field="status"
            header="Statut"
            body={(row: AcademicYear) => (
              <Tag
                value={labels[row.status]}
                severity={severities[row.status]}
              />
            )}
          />
          <Column header="Actions" body={actions} />
        </DataTable>
      )}
      <AcademicYearDialog
        visible={dialogOpen}
        loading={saving}
        years={items}
        onHide={() => setDialogOpen(false)}
        onSubmit={create}
      />
    </Card>
  );
}
