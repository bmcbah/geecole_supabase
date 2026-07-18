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
  archiveFeeType,
  deleteFeeScheduleItem,
  listFeeScheduleItems,
  listFeeTypes,
  saveFeeScheduleItem,
  saveFeeType,
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

export function SchoolFeesSettingsPanel() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [items, setItems] = useState<FeeScheduleItem[]>([]);
  const [cycles, setCycles] = useState<
    Awaited<ReturnType<typeof listAnnualAcademicCycles>>
  >([]);
  const [levels, setLevels] = useState<
    Awaited<ReturnType<typeof listAnnualAcademicLevels>>
  >([]);
  const [search, setSearch] = useState("");
  const [typeEditing, setTypeEditing] = useState<
    FeeType | null | undefined
  >(undefined);
  const [itemEditing, setItemEditing] = useState<
    FeeScheduleItem | null | undefined
  >(undefined);
  const [saving, setSaving] = useState(false);

  const editable = Boolean(
    year && !["closed", "archived"].includes(year.status),
  );

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

  const typeInitial = useMemo<Record<string, EntityValue>>(
    () => ({
      name: typeEditing?.name ?? "",
      code: typeEditing?.code ?? "",
      description: typeEditing?.description ?? "",
      is_active: typeEditing?.is_active ?? true,
    }),
    [typeEditing],
  );

  const itemInitial = useMemo<Record<string, EntityValue>>(
    () => ({
      fee_type_id: itemEditing?.fee_type_id ?? feeTypes[0]?.id ?? "",
      scope: itemEditing?.scope ?? "institution",
      amount: itemEditing?.amount ?? 0,
      cycle_ids: itemEditing?.cycle_ids ?? [],
      level_ids: itemEditing?.level_ids ?? [],
      is_active: itemEditing?.is_active ?? true,
    }),
    [feeTypes, itemEditing],
  );

  const submitType = async (values: Record<string, EntityValue>) => {
    setSaving(true);
    try {
      await saveFeeType(
        institutionId,
        {
          name: String(values.name),
          code: String(values.code),
          description: String(values.description || "") || null,
          is_active: Boolean(values.is_active),
        },
        typeEditing?.id,
      );
      setTypeEditing(undefined);
      await load();
      notify({ severity: "success", summary: "Type de frais enregistré" });
    } catch (error) {
      notify({
        severity: "error",
        summary: "Enregistrement impossible",
        detail: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const submitItem = async (values: Record<string, EntityValue>) => {
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
          cycle_ids:
            scope === "cycle" && Array.isArray(values.cycle_ids)
              ? values.cycle_ids.map(String)
              : [],
          level_ids:
            scope === "level" && Array.isArray(values.level_ids)
              ? values.level_ids.map(String)
              : [],
          is_active: Boolean(values.is_active),
        },
        itemEditing?.id,
      );
      setItemEditing(undefined);
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
      return cycles
        .filter((cycle) => item.cycle_ids.includes(cycle.id))
        .map((cycle) => cycle.name)
        .join(", ");
    }
    return levels
      .filter((level) => item.level_ids.includes(level.id))
      .map((level) => level.level_name_snapshot)
      .join(", ");
  };

  if (!year) {
    return (
      <Message
        severity="warn"
        text="Sélectionnez une année scolaire avant de configurer les tarifs."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsTablePanel
        sectionHeader={
          <PageHeader
            title="Catalogue des frais"
            description="Créez les types de frais réutilisables d’une année scolaire à l’autre."
            meta={
              <Tag
                value={`${feeTypes.length} type${feeTypes.length > 1 ? "s" : ""}`}
                severity="secondary"
              />
            }
            headingAs="h2"
            compact
          />
        }
        toolbar={
          <Toolbar
            start={
              <span className="text-xs text-slate-500">
                Le catalogue appartient à l’établissement.
              </span>
            }
            end={
              <Button
                label="Nouveau type"
                icon="pi pi-plus"
                size="small"
                onClick={() => setTypeEditing(null)}
              />
            }
            className="min-h-0 rounded-none border-0 bg-transparent p-0"
          />
        }
        dataTable={
          <DataTable
            value={feeTypes}
            dataKey="id"
            size="small"
            stripedRows
            emptyMessage="Aucun type de frais"
          >
            <Column field="name" header="Type de frais" />
            <Column field="code" header="Code" />
            <Column
              header="Statut"
              body={(row: FeeType) => (
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
              body={(row: FeeType) => (
                <div className="flex justify-end gap-1">
                  <Button
                    icon="pi pi-pencil"
                    text
                    size="small"
                    onClick={() => setTypeEditing(row)}
                  />
                  <Button
                    icon="pi pi-archive"
                    text
                    size="small"
                    severity="danger"
                    onClick={() => void archiveFeeType(row.id).then(load)}
                  />
                </div>
              )}
            />
          </DataTable>
        }
      />

      <SettingsTablePanel
        sectionHeader={
          <PageHeader
            title={`Grille tarifaire — ${year.name}`}
            description="Définissez les montants applicables à tout l’établissement, à plusieurs cycles ou à plusieurs niveaux."
            meta={
              <Tag
                value={`${items.length} tarif${items.length > 1 ? "s" : ""}`}
                severity="secondary"
              />
            }
            headingAs="h2"
            compact
          />
        }
        alert={
          !editable ? (
            <Message
              severity="info"
              text={`${year.name} est en lecture seule.`}
            />
          ) : undefined
        }
        toolbar={
          <Toolbar
            start={
              <TableSearch
                id="fee-schedule-search"
                value={search}
                onChange={setSearch}
                placeholder="Rechercher un tarif"
              />
            }
            end={
              <Button
                label="Ajouter un tarif"
                icon="pi pi-plus"
                size="small"
                disabled={!editable || feeTypes.length === 0}
                onClick={() => setItemEditing(null)}
              />
            }
            className="min-h-0 rounded-none border-0 bg-transparent p-0"
          />
        }
        dataTable={
          <DataTable
            value={items}
            globalFilter={search}
            globalFilterFields={[
              "fee_type.name",
              "fee_type.code",
              "scope",
              "amount",
            ]}
            dataKey="id"
            size="small"
            stripedRows
            responsiveLayout="scroll"
            emptyMessage="Aucun tarif pour cette année"
          >
            <Column
              header="Frais"
              body={(row: FeeScheduleItem) => row.fee_type?.name ?? "—"}
            />
            <Column
              header="Portée"
              body={(row: FeeScheduleItem) => scopeLabels[row.scope]}
            />
            <Column header="Cible" body={targetLabel} />
            <Column
              header="Montant"
              body={(row: FeeScheduleItem) =>
                `${row.amount.toLocaleString("fr-GN")} GNF`
              }
            />
            <Column
              header="Statut"
              body={(row: FeeScheduleItem) => (
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
              body={(row: FeeScheduleItem) => (
                <div className="flex justify-end gap-1">
                  <Button
                    icon="pi pi-pencil"
                    text
                    size="small"
                    disabled={!editable}
                    onClick={() => setItemEditing(row)}
                  />
                  <Button
                    icon="pi pi-trash"
                    text
                    size="small"
                    severity="danger"
                    disabled={!editable}
                    onClick={() => void deleteFeeScheduleItem(row.id).then(load)}
                  />
                </div>
              )}
            />
          </DataTable>
        }
      />

      <SettingsEntityDialog
        header="Type de frais"
        visible={typeEditing !== undefined}
        loading={saving}
        columns={2}
        fields={
          [
            { key: "name", label: "Libellé", required: true },
            { key: "code", label: "Code", required: true },
            {
              key: "description",
              label: "Description",
              type: "textarea",
              span: 2,
            },
            {
              key: "is_active",
              label: "Type actif",
              type: "boolean",
              span: 2,
            },
          ] as EntityField[]
        }
        initial={typeInitial}
        onHide={() => setTypeEditing(undefined)}
        onSubmit={submitType}
      />

      <SettingsEntityDialog
        header="Tarif annuel"
        visible={itemEditing !== undefined}
        loading={saving}
        columns={2}
        fields={
          [
            {
              key: "fee_type_id",
              label: "Type de frais",
              type: "select",
              required: true,
              span: 2,
              options: feeTypes
                .filter((item) => item.is_active)
                .map((item) => ({ label: item.name, value: item.id })),
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
            {
              key: "amount",
              label: "Montant",
              type: "number",
              required: true,
              suffix: " GNF",
            },
            {
              key: "cycle_ids",
              label: "Cycles concernés",
              type: "multiselect",
              required: true,
              span: 2,
              visibleWhen: (values) => values.scope === "cycle",
              options: cycles.map((cycle) => ({
                label: cycle.name,
                value: cycle.id,
              })),
            },
            {
              key: "level_ids",
              label: "Niveaux concernés",
              type: "multiselect",
              required: true,
              span: 2,
              visibleWhen: (values) => values.scope === "level",
              options: levels.map((level) => ({
                label: `${level.cycle_name_snapshot} — ${level.level_name_snapshot}`,
                value: level.id,
              })),
            },
            {
              key: "is_active",
              label: "Tarif actif",
              type: "boolean",
              span: 2,
            },
          ] as EntityField[]
        }
        initial={itemInitial}
        onHide={() => setItemEditing(undefined)}
        onSubmit={submitItem}
      />
    </div>
  );
}
