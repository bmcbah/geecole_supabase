import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { Toolbar } from "primereact/toolbar";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import {
  deleteGradingFormula,
  listGradingFormulas,
  saveGradingFormula,
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

type Formula = Database["public"]["Tables"]["grading_formulas"]["Row"];

const fields: EntityField[] = [
  { key: "name", label: "Nom", required: true },
  { key: "code", label: "Code", required: true },
  { key: "expression", label: "Expression", type: "textarea", required: true },
  { key: "description", label: "Description", type: "textarea" },
  { key: "is_default", label: "Formule par défaut", type: "boolean" },
];

export function GradingFormulasSettingsPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [items, setItems] = useState<Formula[]>([]);
  const [editing, setEditing] = useState<Formula | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const editable = Boolean(year && !["closed", "archived"].includes(year.status));

  const load = useCallback(async () => {
    if (!year) return;
    setItems(await listGradingFormulas(year.id));
  }, [year]);

  useEffect(() => {
    void load();
  }, [load]);

  const initial = useMemo<Record<string, EntityValue>>(
    () => ({
      name: editing?.name ?? "",
      code: editing?.code ?? "",
      expression: editing?.expression ?? "(moyenne_notes * poids) / somme_poids",
      description: editing?.description ?? "",
      is_default: editing?.is_default ?? false,
    }),
    [editing],
  );

  const submit = async (values: Record<string, EntityValue>) => {
    if (!year) return;
    setSaving(true);
    try {
      await saveGradingFormula(
        institutionId,
        year.id,
        {
          name: String(values.name),
          code: String(values.code).toUpperCase(),
          expression: String(values.expression),
          description: String(values.description) || null,
          is_default: Boolean(values.is_default),
        },
        editing?.id,
      );
      setEditing(undefined);
      await load();
      notify({ severity: "success", summary: "Formule enregistrée" });
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
      await deleteGradingFormula(id);
      await load();
    } catch {
      notify({ severity: "error", summary: "Suppression impossible" });
    }
  };

  if (!year) {
    return (
      <Message
        severity="warn"
        text="Créez ou sélectionnez une année scolaire avant de configurer les formules."
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
            title="Formules de calcul"
            description="Configurez les règles utilisées pour calculer les moyennes."
            meta={
              <Tag
                value={`${items.length} formule${items.length > 1 ? "s" : ""}`}
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
                id="grading-formulas-search"
                value={search}
                onChange={setSearch}
                placeholder="Rechercher une formule"
              />
            }
            end={
              <Button
                label="Nouvelle formule"
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
            globalFilterFields={["name", "code", "expression", "description", "is_default"]}
            dataKey="id"
            emptyMessage="Aucune formule"
            stripedRows
            responsiveLayout="scroll"
            size="small"
          >
            <Column field="name" header="Formule" />
            <Column field="code" header="Code" />
            <Column field="expression" header="Expression" />
            <Column
              header="Défaut"
              body={(row: Formula) =>
                row.is_default ? <Tag value="Par défaut" severity="success" /> : null
              }
            />
            <Column
              header="Actions"
              headerClassName="text-right"
              bodyClassName="text-right"
              body={(row: Formula) => (
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
        header="Formule de calcul"
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
