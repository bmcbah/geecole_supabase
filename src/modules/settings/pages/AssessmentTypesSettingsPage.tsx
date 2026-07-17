import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { Toolbar } from "primereact/toolbar";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import {
  deleteAssessmentType,
  listAssessmentTypes,
  saveAssessmentType,
} from "../services/annual-settings.service";
import {
  SettingsEntityDialog,
  type EntityField,
  type EntityValue,
} from "../components/SettingsEntityDialog";
import type { Database } from "../../../shared/lib/supabase/database.types";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { TableSearch } from "../../../shared/components/TableSearch";
import { useToast } from "../../../shared/components/toast-context";

type Assessment = Database["public"]["Tables"]["assessment_types"]["Row"];

const fields: EntityField[] = [
  { key: "name", label: "Nom", required: true },
  { key: "code", label: "Code", required: true },
  { key: "weight", label: "Poids", type: "number", required: true },
  { key: "scale", label: "Barème", type: "number", required: true },
  { key: "is_active", label: "Type actif", type: "boolean" },
];

export function AssessmentTypesSettingsPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [items, setItems] = useState<Assessment[]>([]);
  const [editing, setEditing] = useState<Assessment | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const editable = Boolean(year && !["closed", "archived"].includes(year.status));

  const load = useCallback(async () => {
    if (!year) return;
    setItems(await listAssessmentTypes(year.id));
  }, [year]);

  useEffect(() => {
    void load();
  }, [load]);

  const initial = useMemo<Record<string, EntityValue>>(
    () => ({
      name: editing?.name ?? "",
      code: editing?.code ?? "",
      weight: editing?.weight ?? 1,
      scale: editing?.scale ?? 20,
      is_active: editing?.is_active ?? true,
    }),
    [editing],
  );

  const submit = async (values: Record<string, EntityValue>) => {
    if (!year) return;
    setSaving(true);
    try {
      await saveAssessmentType(
        institutionId,
        year.id,
        {
          name: String(values.name),
          code: String(values.code).toUpperCase(),
          weight: Number(values.weight),
          scale: Number(values.scale),
          is_active: Boolean(values.is_active),
        },
        editing?.id,
      );
      setEditing(undefined);
      await load();
      notify({ severity: "success", summary: "Type de note enregistré" });
    } catch {
      notify({
        severity: "error",
        summary: "Enregistrement impossible",
        detail: "Vérifiez les valeurs et l’unicité du code dans cette année.",
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteAssessmentType(id);
      await load();
    } catch {
      notify({ severity: "error", summary: "Suppression impossible" });
    }
  };

  if (!year) {
    return (
      <Message
        severity="warn"
        text="Créez ou sélectionnez une année scolaire avant de configurer les types de notes."
      />
    );
  }

  const alert = !editable ? (
    <Message
      severity="info"
      text={`${year.name} est clôturée et reste consultable en lecture seule.`}
    />
  ) : undefined;

  return (
    <>
      <SettingsTablePanel
        sectionHeader={
          <PageHeader
            title="Types de notes"
            description="Définissez les catégories de notes, leur poids et leur barème."
            meta={
              <Tag
                value={`${items.length} type${items.length > 1 ? "s" : ""}`}
                severity="secondary"
              />
            }
            headingAs="h2"
            compact
          />
        }
        alert={alert}
        toolbar={
          <Toolbar
            start={
              <TableSearch
                id="assessment-types-search"
                value={search}
                onChange={setSearch}
                placeholder="Rechercher un type"
              />
            }
            end={
              <Button
                label="Nouveau type"
                icon="pi pi-plus"
                size="small"
                disabled={!editable}
                onClick={() => setEditing(null)}
              />
            }
            className="min-h-0 rounded-none border-0 bg-transparent p-0"
          />
        }
        dataTable={
          <DataTable
            value={items}
            globalFilter={search}
            globalFilterFields={["name", "code", "weight", "scale", "is_active"]}
            dataKey="id"
            emptyMessage="Aucun type de note"
            stripedRows
            responsiveLayout="scroll"
            size="small"
          >
            <Column field="name" header="Type" />
            <Column field="code" header="Code" />
            <Column field="weight" header="Poids" />
            <Column field="scale" header="Barème" />
            <Column
              header="Statut"
              body={(row: Assessment) => (
                <Tag
                  value={row.is_active ? "Actif" : "Inactif"}
                  severity={row.is_active ? "success" : "secondary"}
                />
              )}
            />
            <Column
              header="Actions"
              headerClassName="text-right"
              bodyClassName="text-right"
              body={(row: Assessment) => (
                <div className="flex items-center justify-end gap-1">
                  <Button
                    icon="pi pi-pencil"
                    text
                    size="small"
                    disabled={!editable}
                    onClick={() => setEditing(row)}
                  />
                  <Button
                    icon="pi pi-trash"
                    text
                    size="small"
                    severity="danger"
                    disabled={!editable}
                    onClick={() => void remove(row.id)}
                  />
                </div>
              )}
            />
          </DataTable>
        }
      />

      <SettingsEntityDialog
        header="Type de note"
        visible={editing !== undefined}
        loading={saving}
        fields={fields}
        initial={initial}
        onHide={() => setEditing(undefined)}
        onSubmit={submit}
      />
    </>
  );
}
