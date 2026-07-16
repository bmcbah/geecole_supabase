import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { useToast } from "../../../shared/components/toast-context";
import type { Database } from "../../../shared/lib/supabase/database.types";
import {
  deleteFinancialRule,
  listFinancialRules,
  saveFinancialRule,
} from "../services/annual-settings.service";
import {
  SettingsEntityDialog,
  type EntityField,
  type EntityValue,
} from "./SettingsEntityDialog";
import { SettingsPanelShell } from "./SettingsPanelShell";
type Rule = Database["public"]["Tables"]["financial_rules"]["Row"];
const fields: EntityField[] = [
  { key: "name", label: "Libellé", required: true },
  { key: "code", label: "Code", required: true },
  {
    key: "amount",
    label: "Montant",
    type: "number",
    required: true,
    suffix: " GNF",
  },
  {
    key: "frequency",
    label: "Périodicité",
    type: "select",
    required: true,
    options: [
      { label: "Une fois", value: "once" },
      { label: "Mensuelle", value: "monthly" },
      { label: "Par période", value: "termly" },
    ],
  },
  { key: "due_day", label: "Jour d’échéance", type: "number" },
  { key: "is_active", label: "Règle active", type: "boolean" },
];
export function FinancialRulesSettingsPanel() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [items, setItems] = useState<Rule[]>([]);
  const [editing, setEditing] = useState<Rule | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setItems(year ? await listFinancialRules(year.id) : []);
  }, [year]);
  useEffect(() => {
    void load();
  }, [load]);
  const initial = useMemo<Record<string, EntityValue>>(
    () => ({
      name: editing?.name ?? "",
      code: editing?.code ?? "",
      amount: editing?.amount ?? 0,
      frequency: editing?.frequency ?? "once",
      due_day: editing?.due_day ?? null,
      is_active: editing?.is_active ?? true,
    }),
    [editing],
  );
  const submit = async (values: Record<string, EntityValue>) => {
    if (!year) return;
    setSaving(true);
    try {
      await saveFinancialRule(
        institutionId,
        year.id,
        {
          name: String(values.name),
          code: String(values.code).toUpperCase(),
          amount: Number(values.amount),
          frequency: String(values.frequency),
          due_day: values.due_day === null ? null : Number(values.due_day),
          is_active: Boolean(values.is_active),
        },
        editing?.id,
      );
      setEditing(undefined);
      await load();
      notify({ severity: "success", summary: "Règle enregistrée" });
    } catch {
      notify({ severity: "error", summary: "Enregistrement impossible" });
    } finally {
      setSaving(false);
    }
  };
  const remove = async (id: string) => {
    try {
      await deleteFinancialRule(id);
      await load();
    } catch {
      notify({ severity: "error", summary: "Suppression impossible" });
    }
  };
  return (
    <SettingsPanelShell
      title="Règles financières"
      description="Frais et échéances applicables à l’année sélectionnée"
      year={year}
      addLabel="Nouvelle règle"
      onAdd={() => setEditing(null)}
    >
      <DataTable
        value={items}
        dataKey="id"
        emptyMessage="Aucune règle financière"
        stripedRows
      >
        <Column field="name" header="Frais" />
        <Column field="code" header="Code" />
        <Column
          header="Montant"
          body={(row: Rule) => `${row.amount.toLocaleString("fr-GN")} GNF`}
        />
        <Column field="frequency" header="Périodicité" />
        <Column field="due_day" header="Échéance" />
        <Column
          header="Statut"
          body={(row: Rule) => (
            <Tag
              value={row.is_active ? "Active" : "Inactive"}
              severity={row.is_active ? "success" : "secondary"}
            />
          )}
        />
        <Column
          header="Actions"
          body={(row: Rule) => (
            <div className="table-actions">
              <Button
                icon="pi pi-pencil"
                text
                disabled={year?.status !== "preparation"}
                onClick={() => setEditing(row)}
              />
              <Button
                icon="pi pi-trash"
                text
                severity="danger"
                disabled={year?.status !== "preparation"}
                onClick={() => void remove(row.id)}
              />
            </div>
          )}
        />
      </DataTable>
      <SettingsEntityDialog
        header="Règle financière"
        visible={editing !== undefined}
        loading={saving}
        fields={fields}
        initial={initial}
        onHide={() => setEditing(undefined)}
        onSubmit={submit}
      />
    </SettingsPanelShell>
  );
}
