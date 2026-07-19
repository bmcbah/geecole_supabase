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
} from "../services/assessment-types.service";
import {
  SettingsEntityDialog,
  type EntityField,
  type EntityValue,
} from "./SettingsEntityDialog";
import type { AssessmentType } from "../domain/assessment-type";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { TableSearch } from "../../../shared/components/TableSearch";
import { useToast } from "../../../shared/components/toast-context";

const iconOptions = [
  { label: "Document", value: "pi pi-file-edit" },
  { label: "Écrit", value: "pi pi-pencil" },
  { label: "Oral", value: "pi pi-microphone" },
  { label: "Projet", value: "pi pi-folder" },
  { label: "Présentation", value: "pi pi-desktop" },
  { label: "Examen", value: "pi pi-verified" },
];

const fields: EntityField[] = [
  { key: "name", label: "Nom", required: true },
  { key: "code", label: "Code", required: true },
  {
    key: "description",
    label: "Description",
    type: "textarea",
    span: 2,
  },
  {
    key: "icon",
    label: "Icône",
    type: "select",
    options: iconOptions,
    required: true,
  },
  { key: "color", label: "Couleur (hex)", required: true },
  { key: "scale", label: "Barème par défaut", type: "number", required: true },
  { key: "sort_order", label: "Ordre d’affichage", type: "number", required: true },
  { key: "is_active", label: "Type actif", type: "boolean", span: 2 },
];

export function AssessmentTypesSettingsPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [items, setItems] = useState<AssessmentType[]>([]);
  const [editing, setEditing] = useState<AssessmentType | null | undefined>(
    undefined,
  );
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
      description: editing?.description ?? "",
      icon: editing?.icon ?? "pi pi-file-edit",
      color: editing?.color ?? "#64748b",
      scale: editing?.scale ?? 20,
      sort_order: editing?.sort_order ?? items.length,
      is_active: editing?.is_active ?? true,
    }),
    [editing, items.length],
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
          code: String(values.code),
          description: String(values.description ?? "") || null,
          icon: String(values.icon),
          color: String(values.color),
          scale: Number(values.scale),
          sort_order: Number(values.sort_order),
          is_active: Boolean(values.is_active),
        },
        editing?.id,
      );
      setEditing(undefined);
      await load();
      notify({ severity: "success", summary: "Type d’évaluation enregistré" });
    } catch {
      notify({
        severity: "error",
        summary: "Enregistrement impossible",
        detail:
          "Vérifiez les valeurs et l’unicité du code pour l’année scolaire active.",
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteAssessmentType(id);
      await load();
      notify({ severity: "success", summary: "Type d’évaluation supprimé" });
    } catch {
      notify({
        severity: "error",
        summary: "Suppression impossible",
        detail:
          "Ce type est peut-être déjà utilisé par une formule ou une évaluation.",
      });
    }
  };

  if (!year) {
    return (
      <Message
        severity="warn"
        text="Créez ou sélectionnez une année scolaire avant de configurer les types d’évaluation."
      />
    );
  }

  const alert = !editable ? (
    <Message
      severity="info"
      text={`${year.name} est clôturée et reste consultable en lecture seule.`}
    />
  ) : (
    <Message
      severity="secondary"
      text="Les pondérations ne sont pas définies ici. Elles seront configurées dans les formules de calcul de l’établissement."
    />
  );

  return (
    <>
      <SettingsTablePanel
        sectionHeader={
          <PageHeader
            title="Types d’évaluation"
            description="Créez le catalogue utilisé par les enseignants lors de la saisie des notes."
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
                placeholder="Rechercher par nom ou code"
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
            globalFilterFields={["name", "code", "description", "is_active"]}
            dataKey="id"
            emptyMessage="Aucun type d’évaluation"
            stripedRows
            responsiveLayout="scroll"
            size="small"
          >
            <Column
              header="Type"
              body={(row: AssessmentType) => (
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${row.color}1a`, color: row.color }}
                  >
                    <i className={row.icon} />
                  </span>
                  <div>
                    <div className="font-medium text-slate-900">{row.name}</div>
                    {row.description ? (
                      <div className="max-w-md truncate text-xs text-slate-500">
                        {row.description}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            />
            <Column field="code" header="Code" />
            <Column field="scale" header="Barème" body={(row: AssessmentType) => `/${row.scale}`} />
            <Column field="sort_order" header="Ordre" />
            <Column
              header="Statut"
              body={(row: AssessmentType) => (
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
              body={(row: AssessmentType) => (
                <div className="flex items-center justify-end gap-1">
                  <Button
                    icon="pi pi-pencil"
                    text
                    size="small"
                    aria-label={`Modifier ${row.name}`}
                    disabled={!editable}
                    onClick={() => setEditing(row)}
                  />
                  <Button
                    icon="pi pi-trash"
                    text
                    size="small"
                    severity="danger"
                    aria-label={`Supprimer ${row.name}`}
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
        header={editing?.id ? "Modifier le type d’évaluation" : "Nouveau type d’évaluation"}
        visible={editing !== undefined}
        loading={saving}
        fields={fields}
        initial={initial}
        columns={2}
        onHide={() => setEditing(undefined)}
        onSubmit={submit}
      />
    </>
  );
}
