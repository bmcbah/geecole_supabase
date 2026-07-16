import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useToast } from "../../../shared/components/toast-context";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import {
  listAcademicStructure,
  listAnnualAcademicLevels,
  setAnnualCycleLevels,
} from "../services/academic-structure.service";
import type { AcademicCycle, GradeLevel } from "../types/academic-structure";
interface Props {
  institutionId: string;
}
export function AcademicStructurePanel({ institutionId }: Props) {
  const notify = useToast();
  const { year } = useAcademicSession();
  const [cycles, setCycles] = useState<AcademicCycle[]>([]);
  const [levels, setLevels] = useState<GradeLevel[]>([]);
  const [annualIds, setAnnualIds] = useState<string[]>([]);
  const [cycle, setCycle] = useState<AcademicCycle | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");
  const load = useCallback(async () => {
    if (!year) return;
    try {
      const [structure, annual] = await Promise.all([
        listAcademicStructure(institutionId),
        listAnnualAcademicLevels(year.id),
      ]);
      const ids = annual.map((item) => item.level_id);
      const activeCycleIds = new Set(annual.map((item) => item.cycle_id));
      const availableCycles =
        year.status === "preparation" && editing
          ? structure.cycles.filter((item) => item.is_active)
          : structure.cycles.filter((item) => activeCycleIds.has(item.id));
      setCycles(availableCycles);
      setLevels(structure.levels);
      setAnnualIds(ids);
      setCycle(
        (current) =>
          availableCycles.find((item) => item.id === current?.id) ??
          availableCycles[0] ??
          null,
      );
    } catch {
      setFailure("Impossible de charger les cycles et niveaux de l’année.");
    }
  }, [editing, institutionId, year]);
  useEffect(() => {
    void load();
  }, [load]);
  const cycleLevels = useMemo(
    () =>
      levels.filter((item) => item.cycle_id === cycle?.id && item.is_active),
    [cycle, levels],
  );
  const activeLevels = cycleLevels.filter((item) =>
    annualIds.includes(item.id),
  );
  const displayed = editing ? cycleLevels : activeLevels;
  const locked = year?.status !== "preparation";
  const save = async () => {
    if (!year || !cycle) return;
    setSaving(true);
    try {
      await setAnnualCycleLevels(
        year.id,
        cycle.id,
        activeLevels.map((item) => item.id),
      );
      setEditing(false);
      await load();
      notify({ severity: "success", summary: "Niveaux actifs enregistrés" });
    } catch {
      notify({ severity: "error", summary: "Enregistrement impossible" });
    } finally {
      setSaving(false);
    }
  };
  if (failure) return <Message severity="error" text={failure} />;
  return (
    <Card
      title={`Cycles et niveaux — ${year?.name ?? ""}`}
      subTitle="Seuls les éléments actifs pour l’année sélectionnée sont affichés"
    >
      <div className="structure-filters">
        <div className="field structure-cycle-field">
          <label htmlFor="active-cycle">Cycle actif</label>
          <Dropdown
            inputId="active-cycle"
            value={cycle?.id}
            options={cycles}
            optionLabel="name"
            optionValue="id"
            placeholder="Aucun cycle actif"
            onChange={(event) => {
              const value = event.value as unknown;
              if (typeof value === "string")
                setCycle(cycles.find((item) => item.id === value) ?? null);
            }}
          />
        </div>
        <Tag
          value={locked ? "Lecture seule" : "Année en préparation"}
          severity={locked ? "secondary" : "info"}
        />
        <Button
          label={editing ? "Annuler" : "Modifier les niveaux actifs"}
          icon={editing ? "pi pi-times" : "pi pi-pencil"}
          outlined
          disabled={locked}
          onClick={() => setEditing((value) => !value)}
        />
      </div>
      {editing && (
        <Message
          severity="info"
          text="Sélectionnez les niveaux proposés pour ce cycle pendant l’année choisie."
        />
      )}
      <DataTable
        value={displayed}
        dataKey="id"
        selectionMode="multiple"
        selection={activeLevels}
        isDataSelectable={() => editing}
        onSelectionChange={(event) => {
          const selected = event.value;
          const other = annualIds.filter(
            (id) => !cycleLevels.some((item) => item.id === id),
          );
          setAnnualIds([...other, ...selected.map((item) => item.id)]);
        }}
        emptyMessage="Aucun niveau actif pour ce cycle"
        stripedRows
      >
        {editing && (
          <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
        )}
        <Column field="sort_order" header="Ordre" />
        <Column field="name" header="Niveau" />
        <Column field="code" header="Code" />
      </DataTable>
      {editing && (
        <div className="form-actions structure-save">
          <Button
            label="Enregistrer"
            icon="pi pi-check"
            loading={saving}
            onClick={() => void save()}
          />
        </div>
      )}
    </Card>
  );
}
