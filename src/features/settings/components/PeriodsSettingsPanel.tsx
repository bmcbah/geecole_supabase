import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { useToast } from "../../../shared/components/toast-context";
import {
  configureCyclePeriods,
  generateAcademicPeriods,
  listAcademicPeriods,
  listAcademicStructure,
  listAnnualAcademicLevels,
  saveAcademicPeriod,
} from "../services/academic-structure.service";
import type { AcademicCycle } from "../types/academic-structure";
import {
  SettingsEntityDialog,
  type EntityField,
  type EntityValue,
} from "./SettingsEntityDialog";
import { SettingsPanelShell } from "./SettingsPanelShell";
type Period = Awaited<ReturnType<typeof listAcademicPeriods>>[number];
const fields: EntityField[] = [
  { key: "name", label: "Libellé", required: true },
  { key: "code", label: "Code", required: true },
  { key: "starts_on", label: "Date de début (AAAA-MM-JJ)", required: true },
  { key: "ends_on", label: "Date de fin (AAAA-MM-JJ)", required: true },
  {
    key: "status",
    label: "Statut",
    type: "select",
    required: true,
    options: [
      { label: "Planifiée", value: "planned" },
      { label: "Ouverte", value: "open" },
      { label: "Clôturée", value: "closed" },
    ],
  },
];
export function PeriodsSettingsPanel() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [cycles, setCycles] = useState<AcademicCycle[]>([]);
  const [cycle, setCycle] = useState<AcademicCycle | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [editing, setEditing] = useState<Period | null>(null);
  const [saving, setSaving] = useState(false);
  const [system, setSystem] = useState("term");
  const [count, setCount] = useState(3);
  const load = useCallback(async () => {
    if (!year) return;
    const [structure, activeLevels, periodItems] = await Promise.all([
      listAcademicStructure(institutionId),
      listAnnualAcademicLevels(year.id),
      listAcademicPeriods(year.id),
    ]);
    const activeCycleIds = new Set(activeLevels.map((item) => item.cycle_id));
    const activeCycles = structure.cycles.filter((item) =>
      activeCycleIds.has(item.id),
    );
    setCycles(activeCycles);
    setCycle(
      (current) =>
        activeCycles.find((item) => item.id === current?.id) ??
        activeCycles[0] ??
        null,
    );
    setPeriods(periodItems);
  }, [institutionId, year]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (cycle) {
      setSystem(cycle.period_system);
      setCount(cycle.period_count);
    }
  }, [cycle]);
  const visible = periods.filter((item) => item.cycle_id === cycle?.id);
  const initial = useMemo<Record<string, EntityValue>>(
    () => ({
      name: editing?.name ?? "",
      code: editing?.code ?? "",
      starts_on: editing?.starts_on ?? "",
      ends_on: editing?.ends_on ?? "",
      status: editing?.status ?? "planned",
    }),
    [editing],
  );
  const generate = async () => {
    if (!year || !cycle) return;
    setSaving(true);
    try {
      await configureCyclePeriods(cycle.id, system, count);
      await generateAcademicPeriods(year.id, cycle.id);
      await load();
      notify({ severity: "success", summary: "Périodes générées" });
    } catch {
      notify({ severity: "error", summary: "Génération impossible" });
    } finally {
      setSaving(false);
    }
  };
  const submit = async (values: Record<string, EntityValue>) => {
    if (!editing) return;
    setSaving(true);
    try {
      await saveAcademicPeriod(
        {
          name: String(values.name),
          code: String(values.code).toUpperCase(),
          starts_on: String(values.starts_on),
          ends_on: String(values.ends_on),
          status: String(values.status),
        },
        editing.id,
      );
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  };
  return (
    <SettingsPanelShell
      title="Périodes scolaires"
      description="Trimestres ou semestres configurés par cycle"
      year={year}
    >
      <div className="structure-filters period-config">
        <div className="field">
          <label htmlFor="period-cycle">Cycle</label>
          <Dropdown
            inputId="period-cycle"
            value={cycle?.id}
            options={cycles}
            optionLabel="name"
            optionValue="id"
            onChange={(event) => {
              const value = event.value as unknown;
              if (typeof value === "string")
                setCycle(cycles.find((item) => item.id === value) ?? null);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="period-system">Organisation</label>
          <Dropdown
            inputId="period-system"
            value={system}
            options={[
              { label: "Trimestres", value: "term" },
              { label: "Semestres", value: "semester" },
              { label: "Personnalisée", value: "custom" },
            ]}
            onChange={(event) => {
              const value = event.value as unknown;
              if (typeof value === "string") setSystem(value);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="period-count">Nombre de périodes</label>
          <InputNumber
            inputId="period-count"
            value={count}
            min={1}
            max={6}
            onValueChange={(event) => setCount(event.value ?? 1)}
          />
        </div>
        <Button
          label="Générer"
          icon="pi pi-refresh"
          loading={saving}
          disabled={!cycle || year?.status !== "preparation"}
          onClick={() => void generate()}
        />
      </div>
      {visible.length > 0 && (
        <Message
          severity="warn"
          text="Régénérer remplace les périodes de ce cycle. Faites-le avant de saisir des notes."
        />
      )}
      <DataTable
        value={visible}
        dataKey="id"
        emptyMessage="Aucune période générée pour ce cycle"
        stripedRows
      >
        <Column field="sequence" header="#" />
        <Column field="name" header="Période" />
        <Column field="code" header="Code" />
        <Column field="starts_on" header="Début" />
        <Column field="ends_on" header="Fin" />
        <Column
          header="Statut"
          body={(row: Period) => (
            <Tag
              value={row.status}
              severity={row.status === "open" ? "success" : "secondary"}
            />
          )}
        />
        <Column
          header="Actions"
          body={(row: Period) => (
            <Button
              icon="pi pi-pencil"
              text
              disabled={year?.status !== "preparation"}
              onClick={() => setEditing(row)}
            />
          )}
        />
      </DataTable>
      <SettingsEntityDialog
        header="Modifier la période"
        visible={Boolean(editing)}
        loading={saving}
        fields={fields}
        initial={initial}
        onHide={() => setEditing(null)}
        onSubmit={submit}
      />
    </SettingsPanelShell>
  );
}
