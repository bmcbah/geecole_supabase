import { useCallback, useEffect, useMemo, useState } from "react";
import { Accordion, AccordionTab } from "primereact/accordion";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useToast } from "../../../shared/components/toast-context";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import type { StructureItemInput } from "../schemas/academic-structure.schema";
import {
  deleteCycle,
  deleteLevel,
  generateAcademicPeriods,
  listAcademicStructure,
  listAnnualAcademicLevels,
  saveCycle,
  saveLevel,
  setAnnualCycleLevels,
} from "../services/academic-structure.service";
import type { AcademicCycle, GradeLevel } from "../types/academic-structure";
import { StructureItemDialog } from "./StructureItemDialog";
interface Props {
  institutionId: string;
}
type DialogState =
  | { kind: "cycle"; item?: AcademicCycle }
  | { kind: "niveau"; cycle: AcademicCycle; item?: GradeLevel }
  | null;
const toInput = (
  item?: AcademicCycle | GradeLevel,
): StructureItemInput | undefined =>
  item
    ? {
        name: item.name,
        code: item.code,
        sortOrder: item.sort_order,
        isActive: item.is_active,
        periodSystem:
          "period_system" in item
            ? (item.period_system as "term" | "semester" | "custom")
            : undefined,
        periodCount: "period_count" in item ? item.period_count : undefined,
      }
    : undefined;
const periodLabel = (cycle: AcademicCycle) =>
  cycle.period_system === "semester"
    ? `${cycle.period_count} semestres`
    : cycle.period_system === "term"
      ? `${cycle.period_count} trimestres`
      : `${cycle.period_count} périodes`;
export function AcademicStructurePanel({ institutionId }: Props) {
  const { year } = useAcademicSession();
  const notify = useToast();
  const [cycles, setCycles] = useState<AcademicCycle[]>([]);
  const [levels, setLevels] = useState<GradeLevel[]>([]);
  const [annualIds, setAnnualIds] = useState<string[]>([]);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");
  const editable = Boolean(
    year && !["closed", "archived"].includes(year.status),
  );
  const load = useCallback(async () => {
    if (!year) return;
    try {
      const [structure, annual] = await Promise.all([
        listAcademicStructure(institutionId),
        listAnnualAcademicLevels(year.id),
      ]);
      const cycleIds = new Set(annual.map((item) => item.cycle_id));
      setCycles(structure.cycles.filter((item) => cycleIds.has(item.id)));
      setLevels(structure.levels);
      setAnnualIds(annual.map((item) => item.level_id));
      setFailure("");
    } catch {
      setFailure("Impossible de charger les cycles et niveaux.");
    }
  }, [institutionId, year]);
  useEffect(() => {
    void load();
  }, [load]);
  const levelsByCycle = useMemo(
    () =>
      new Map(
        cycles.map((cycle) => [
          cycle.id,
          levels.filter(
            (level) =>
              level.cycle_id === cycle.id && annualIds.includes(level.id),
          ),
        ]),
      ),
    [annualIds, cycles, levels],
  );
  const submit = async (input: StructureItemInput) => {
    if (!dialog || !year) return;
    setSaving(true);
    try {
      if (dialog.kind === "cycle") {
        const saved = await saveCycle(institutionId, input, dialog.item?.id);
        if (
          !dialog.item ||
          dialog.item.period_system !== input.periodSystem ||
          dialog.item.period_count !== input.periodCount
        )
          await generateAcademicPeriods(year.id, saved.id);
        if (!dialog.item) {
          setDialog({ kind: "niveau", cycle: saved });
          notify({
            severity: "info",
            summary: "Cycle créé",
            detail: "Ajoutez maintenant son premier niveau.",
          });
          return;
        }
      } else {
        const saved = await saveLevel(
          institutionId,
          dialog.cycle.id,
          input,
          dialog.item?.id,
        );
        if (!dialog.item) {
          const currentIds = levels
            .filter(
              (item) =>
                item.cycle_id === dialog.cycle.id &&
                annualIds.includes(item.id),
            )
            .map((item) => item.id);
          await setAnnualCycleLevels(year.id, dialog.cycle.id, [
            ...currentIds,
            saved.id,
          ]);
        }
      }
      setDialog(null);
      await load();
      notify({ severity: "success", summary: "Structure enregistrée" });
    } catch {
      notify({
        severity: "error",
        summary: "Enregistrement impossible",
        detail: "Le nom ou le code existe peut-être déjà.",
      });
    } finally {
      setSaving(false);
    }
  };
  const removeLevel = (cycle: AcademicCycle, level: GradeLevel) =>
    confirmDialog({
      header: "Supprimer le niveau",
      message: `Retirer ${level.name} de ${year?.name} ?`,
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Supprimer",
      rejectLabel: "Annuler",
      acceptClassName: "p-button-danger",
      accept: () =>
        void (async () => {
          if (!year) return;
          const remaining = (levelsByCycle.get(cycle.id) ?? [])
            .filter((item) => item.id !== level.id)
            .map((item) => item.id);
          await setAnnualCycleLevels(year.id, cycle.id, remaining);
          try {
            await deleteLevel(level.id);
          } catch {
            await saveLevel(
              institutionId,
              cycle.id,
              { ...toInput(level)!, isActive: false },
              level.id,
            );
          }
          await load();
        })(),
    });
  const removeCycle = (cycle: AcademicCycle) =>
    confirmDialog({
      header: "Supprimer le cycle",
      message: `Retirer ${cycle.name} et ses niveaux de ${year?.name} ? L’historique des anciennes années sera conservé.`,
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Supprimer",
      rejectLabel: "Annuler",
      acceptClassName: "p-button-danger",
      accept: () =>
        void (async () => {
          if (!year) return;
          await setAnnualCycleLevels(year.id, cycle.id, []);
          try {
            await deleteCycle(cycle.id);
          } catch {
            await saveCycle(
              institutionId,
              { ...toInput(cycle)!, isActive: false },
              cycle.id,
            );
          }
          await load();
        })(),
    });
  if (failure) return <Message severity="error" text={failure} />;
  return (
    <Card
      title={`Cycles et niveaux — ${year?.name ?? ""}`}
      subTitle="Les niveaux sont directement imbriqués dans leur cycle"
    >
      <ConfirmDialog />
      <div className="panel-toolbar">
        <div>
          <Tag
            value={editable ? "Modifiable" : "Lecture seule"}
            severity={editable ? "success" : "secondary"}
          />
        </div>
        <Button
          label="Nouveau cycle"
          icon="pi pi-plus"
          disabled={!editable}
          onClick={() => setDialog({ kind: "cycle" })}
        />
      </div>
      {cycles.length === 0 ? (
        <Message
          severity="info"
          text="Aucun cycle actif pour cette année. Créez le premier cycle et ses niveaux."
        />
      ) : (
        <Accordion multiple activeIndex={[0]}>
          {cycles.map((cycle) => (
            <AccordionTab
              key={cycle.id}
              header={
                <div className="cycle-accordion-header">
                  <div>
                    <strong>{cycle.name}</strong>
                    <span>
                      {cycle.code} · {periodLabel(cycle)}
                    </span>
                  </div>
                  <div className="table-actions">
                    <Button
                      icon="pi pi-pencil"
                      aria-label={`Modifier ${cycle.name}`}
                      text
                      disabled={!editable}
                      onClick={(event) => {
                        event.stopPropagation();
                        setDialog({ kind: "cycle", item: cycle });
                      }}
                    />
                    <Button
                      icon="pi pi-trash"
                      aria-label={`Supprimer ${cycle.name}`}
                      text
                      severity="danger"
                      disabled={!editable}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeCycle(cycle);
                      }}
                    />
                  </div>
                </div>
              }
            >
              <div className="panel-toolbar">
                <p>Niveaux actifs de ce cycle pour {year?.name}</p>
                <Button
                  label="Ajouter un niveau"
                  icon="pi pi-plus"
                  size="small"
                  disabled={!editable}
                  onClick={() => setDialog({ kind: "niveau", cycle })}
                />
              </div>
              <DataTable
                value={levelsByCycle.get(cycle.id) ?? []}
                dataKey="id"
                emptyMessage="Aucun niveau"
                stripedRows
              >
                <Column field="sort_order" header="Ordre" />
                <Column field="name" header="Niveau" />
                <Column field="code" header="Code" />
                <Column
                  header="Actions"
                  body={(level: GradeLevel) => (
                    <div className="table-actions">
                      <Button
                        icon="pi pi-pencil"
                        text
                        disabled={!editable}
                        onClick={() =>
                          setDialog({ kind: "niveau", cycle, item: level })
                        }
                      />
                      <Button
                        icon="pi pi-trash"
                        text
                        severity="danger"
                        disabled={!editable}
                        onClick={() => removeLevel(cycle, level)}
                      />
                    </div>
                  )}
                />
              </DataTable>
            </AccordionTab>
          ))}
        </Accordion>
      )}
      <StructureItemDialog
        kind={dialog?.kind ?? "cycle"}
        visible={Boolean(dialog)}
        loading={saving}
        initial={toInput(dialog?.item)}
        onHide={() => setDialog(null)}
        onSubmit={submit}
      />
    </Card>
  );
}
