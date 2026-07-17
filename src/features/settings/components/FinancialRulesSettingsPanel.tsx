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
  listFinancialRuleLevels,
  listFinancialRules,
  saveFinancialRule,
  setFinancialRuleLevels,
} from "../services/annual-settings.service";
import { listAnnualAcademicLevels } from "../services/academic-structure.service";
import {
  SettingsEntityDialog,
  type EntityField,
  type EntityValue,
} from "./SettingsEntityDialog";
import { SettingsPanelShell } from "./SettingsPanelShell";
import { TableSearch } from "../../../shared/components/TableSearch";
type Rule = Database["public"]["Tables"]["financial_rules"]["Row"];
export function FinancialRulesSettingsPanel() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [items, setItems] = useState<Rule[]>([]);
  const [editing, setEditing] = useState<Rule | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [levels, setLevels] = useState<
    Awaited<ReturnType<typeof listAnnualAcademicLevels>>
  >([]);
  const [mappings, setMappings] = useState<
    Awaited<ReturnType<typeof listFinancialRuleLevels>>
  >([]);
  const editable = Boolean(
    year && !["closed", "archived"].includes(year.status),
  );
  const load = useCallback(async () => {
    if (!year) return;
    const [rules, annualLevels, ruleLevels] = await Promise.all([
      listFinancialRules(year.id),
      listAnnualAcademicLevels(year.id),
      listFinancialRuleLevels(year.id),
    ]);
    setItems(rules);
    setLevels(annualLevels);
    setMappings(ruleLevels);
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
      fee_type: editing?.fee_type ?? "enrollment",
      is_mandatory: editing?.is_mandatory ?? true,
      discount_allowed: editing?.discount_allowed ?? false,
      amount_editable: editing?.amount_editable ?? false,
      installment_count: editing?.installment_count ?? 1,
      level_ids: editing
        ? mappings
            .filter((item) => item.financial_rule_id === editing.id)
            .map((item) => item.academic_year_level_id)
        : [],
    }),
    [editing, mappings],
  );
  const submit = async (values: Record<string, EntityValue>) => {
    if (!year) return;
    setSaving(true);
    try {
      const ruleId = await saveFinancialRule(
        institutionId,
        year.id,
        {
          name: String(values.name),
          code: String(values.code).toUpperCase(),
          amount: Number(values.amount),
          frequency: String(values.frequency),
          due_day: values.due_day === null ? null : Number(values.due_day),
          is_active: Boolean(values.is_active),
          fee_type: String(values.fee_type),
          is_mandatory: Boolean(values.is_mandatory),
          discount_allowed: Boolean(values.discount_allowed),
          amount_editable: Boolean(values.amount_editable),
          installment_count: Number(values.installment_count),
        },
        editing?.id,
      );
      await setFinancialRuleLevels(
        ruleId,
        Array.isArray(values.level_ids) ? values.level_ids : [],
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
      <TableSearch value={search} onChange={setSearch} />
      <DataTable
        value={items}
        globalFilter={search}
        globalFilterFields={[
          "name",
          "code",
          "amount",
          "frequency",
          "due_day",
          "fee_type",
          "is_active",
          "is_mandatory",
        ]}
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
                disabled={!editable}
                onClick={() => setEditing(row)}
              />
              <Button
                icon="pi pi-trash"
                text
                severity="danger"
                disabled={!editable}
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
        fields={
          [
            { key: "name", label: "Libellé", required: true },
            { key: "code", label: "Code", required: true },
            {
              key: "fee_type",
              label: "Type de frais",
              type: "select",
              required: true,
              options: [
                { label: "Inscription", value: "enrollment" },
                { label: "Réinscription", value: "reenrollment" },
                { label: "Scolarité", value: "tuition" },
                { label: "Autre", value: "other" },
              ],
            },
            {
              key: "level_ids",
              label: "Niveaux concernés",
              type: "multiselect",
              required: true,
              options: levels.map((level) => ({
                label: `${level.cycle_name_snapshot} — ${level.level_name_snapshot}`,
                value: level.id,
              })),
            },
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
            {
              key: "installment_count",
              label: "Nombre d’échéances",
              type: "number",
              required: true,
            },
            { key: "due_day", label: "Jour d’échéance", type: "number" },
            {
              key: "is_mandatory",
              label: "Frais obligatoire",
              type: "boolean",
            },
            {
              key: "discount_allowed",
              label: "Remise autorisée",
              type: "boolean",
            },
            {
              key: "amount_editable",
              label: "Montant modifiable à l’encaissement",
              type: "boolean",
            },
            { key: "is_active", label: "Règle active", type: "boolean" },
          ] as EntityField[]
        }
        initial={initial}
        onHide={() => setEditing(undefined)}
        onSubmit={submit}
      />
    </SettingsPanelShell>
  );
}
