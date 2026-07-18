import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { Toolbar } from "primereact/toolbar";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import {
  listAnnualAcademicCycles,
  listAnnualAcademicLevels,
} from "../services/academic-structure.service";
import {
  deleteFeeScheduleItem,
  listFeeScheduleItems,
  listFeeTypes,
  saveFeeScheduleItem,
  type FeeScheduleItem,
  type FeeScope,
  type FeeType,
} from "../services/school-fees.service";
import {
  SettingsEntityDialog,
  type EntityField,
  type EntityValue,
} from "./SettingsEntityDialog";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { TableSearch } from "../../../shared/components/TableSearch";
import { useToast } from "../../../shared/components/toast-context";

const scopeLabels: Record<FeeScope, string> = {
  institution: "Établissement",
  cycle: "Cycles",
  level: "Niveaux",
};

export function FeeScheduleSettingsPanel() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [items, setItems] = useState<FeeScheduleItem[]>([]);
  const [cycles, setCycles] = useState<Awaited<ReturnType<typeof listAnnualAcademicCycles>>>([]);
  const [levels, setLevels] = useState<Awaited<ReturnType<typeof listAnnualAcademicLevels>>>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<FeeScheduleItem | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const editable = Boolean(year && !["closed", "archived"].includes(year.status));

  const load = useCallback(async () => {
    if (!year) return;
    const [nextTypes, nextItems, nextCycles, nextLevels] = await Promise.all([
      listFeeTypes(institutionId),
      listFeeScheduleItems(institutionId, year.id),
      listAnnualAcademicCycles(year.id),
      listAnnualAcademicLevels(year.id),
    ]);
    setFeeTypes(nextTypes);
    setItems(nextItems);
    setCycles(nextCycles);
    setLevels(nextLevels);
  }, [institutionId, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const initial = useMemo<Record<string, EntityValue>>(
    () => ({
      fee_type_id: editing?.fee_type_id ?? feeTypes[0]?.id ?? "",
      scope: editing?.scope ?? "institution",
      amount: editing?.amount ?? 0,
      cycle_ids: editing?.cycle_ids ?? [],
      level_ids: editing?.level_ids ?? [],
      is_active: editing?.is_active ?? true,
    }),
    [editing, feeTypes],
  );

  const submit = async (values: Record<string, EntityValue>) => {
    if (!year) return;
    const scope = String(values.scope) as FeeScope;
    setSaving(true);
    try {
      await saveFeeScheduleItem(
        institutionId,
        year.id,
        {
          fee_type_id: String(values.fee_type_id),
          scope,
          amount: Number(values.amount),
          cycle_ids: scope === "cycle" && Array.isArray(values.cycle_ids) ? values.cycle_ids.map(String) : [],
          level_ids: scope === "level" && Array.isArray(values.level_ids) ? values.level_ids.map(String) : [],
          is_active: Boolean(values.is_active),
        },
        editing?.id,
      );
      setEditing(undefined);
      await load();
      notify({ severity: "success", summary: "Tarif enregistré" });
    } catch (error) {
      notify({
        severity: "error",
        summary: "Tarif impossible à enregistrer",
        detail: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const targetLabel = (item: FeeScheduleItem) => {
    if (item.scope === "institution") return "Tout l’établissement";
    if (item.scope === "cycle") {
      return cycles.filter((cycle) => item.cycle_ids.includes(cycle.id)).map((cycle) => cycle.name).join(", ");
    }
    return levels.filter((level) => item.level_ids.includes(level.id)).map((level) => level.level_name_snapshot).join(", ");
  };

  if (!year) {
    return <Message severity="warn" text="Sélectionnez une année scolaire avant de configurer les tarifs." />;
  }

  return (
    <>
      <SettingsTablePanel
        sectionHeader={
          <PageHeader
            title={`Grille tarifaire — ${year.name}`}
            description="Définissez les montants applicables à l’établissement, aux cycles ou aux niveaux."
            meta={<Tag value={`${items.length} tarif${items.length > 1 ? "s" : ""}`} severity="secondary" />}
            headingAs="h2"
            compact
          />
        }
        alert={!editable ? <Message severity="info" text={`${year.name} est en lecture seule.`} /> : undefined}
        toolbar={
          <Toolbar
            start={<TableSearch id="fee-schedule-search" value={search} onChange={setSearch} placeholder="Rechercher un tarif" />}
            end={<Button label="Ajouter un tarif" icon="pi pi-plus" size="small" disabled={!editable || feeTypes.length === 0} onClick={() => setEditing(null)} />}
            className="min-h-0 rounded-none border-0 bg-transparent p-0"
          />
        }
        dataTable={
          <DataTable
            value={items}
            globalFilter={search}
            globalFilterFields={["fee_type.name", "fee_type.code", "scope", "amount"]}
            dataKey="id"
            size="small"
            stripedRows
            responsiveLayout="scroll"
            emptyMessage="Aucun tarif pour cette année"
          >
            <Column header="Frais" body={(row: FeeScheduleItem) => row.fee_type?.name ?? "—"} />
            <Column header="Portée" body={(row: FeeScheduleItem) => scopeLabels[row.scope]} />
            <Column header="Cible" body={targetLabel} />
            <Column header="Montant" body={(row: FeeScheduleItem) => `${row.amount.toLocaleString("fr-GN")} GNF`} />
            <Column header="Statut" body={(row: FeeScheduleItem) => <Tag value={row.is_active ? "Actif" : "Inactif"} severity={row.is_active ? "success" : "secondary"} />} />
            <Column
              header="Actions"
              headerClassName="text-right"
              bodyClassName="text-right"
              body={(row: FeeScheduleItem) => (
                <div className="flex justify-end gap-1">
                  <Button icon="pi pi-pencil" text size="small" disabled={!editable} onClick={() => setEditing(row)} />
                  <Button icon="pi pi-trash" text size="small" severity="danger" disabled={!editable} onClick={() => void deleteFeeScheduleItem(row.id).then(load)} />
                </div>
              )}
            />
          </DataTable>
        }
      />

      <SettingsEntityDialog
        header="Tarif annuel"
        visible={editing !== undefined}
        loading={saving}
        columns={2}
        fields={[
          {
            key: "fee_type_id",
            label: "Catégorie de frais",
            type: "select",
            required: true,
            span: 2,
            options: feeTypes.filter((item) => item.is_active).map((item) => ({ label: item.name, value: item.id })),
          },
          {
            key: "scope",
            label: "Portée",
            type: "select",
            required: true,
            resetOnChange: ["cycle_ids", "level_ids"],
            options: [
              { label: "Tout l’établissement", value: "institution" },
              { label: "Un ou plusieurs cycles", value: "cycle" },
              { label: "Un ou plusieurs niveaux", value: "level" },
            ],
          },
          { key: "amount", label: "Montant", type: "number", required: true, suffix: " GNF" },
          {
            key: "cycle_ids",
            label: "Cycles concernés",
            type: "multiselect",
            required: true,
            span: 2,
            visibleWhen: (values) => values.scope === "cycle",
            options: cycles.map((cycle) => ({ label: cycle.name, value: cycle.id })),
          },
          {
            key: "level_ids",
            label: "Niveaux concernés",
            type: "multiselect",
            required: true,
            span: 2,
            visibleWhen: (values) => values.scope === "level",
            options: levels.map((level) => ({ label: `${level.cycle_name_snapshot} — ${level.level_name_snapshot}`, value: level.id })),
          },
          { key: "is_active", label: "Tarif actif", type: "boolean", span: 2 },
        ] as EntityField[]}
        initial={initial}
        onHide={() => setEditing(undefined)}
        onSubmit={submit}
      />
    </>
  );
}
