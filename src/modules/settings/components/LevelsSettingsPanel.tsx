import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Message } from "primereact/message";
import { TabPanel, TabView } from "primereact/tabview";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../../features/academic-session/components/academic-session-context";
import type { StructureItemInput } from "../../../features/settings/schemas/academic-structure.schema";
import {
  deleteLevel,
  generateAcademicPeriods,
  listAcademicStructure,
  listAnnualAcademicLevels,
  listAnnualAcademicCycles,
  saveAnnualAcademicCycle,
  saveLevel,
  setAnnualCycleLevels,
} from "../../../features/settings/services/academic-structure.service";
import type {
  AnnualAcademicCycle,
  GradeLevel,
} from "../../../features/settings/types/academic-structure";
import { StructureItemDialog } from "../../../features/settings/components/StructureItemDialog";
import { TablePanel } from "../../../shared/components/layout/TablePanel";
import { TableSearch } from "../../../shared/components/TableSearch";
import { useToast } from "../../../shared/components/toast-context";

interface Props {
  institutionId: string;
}

type DialogState =
  | { kind: "cycle"; item?: AnnualAcademicCycle }
  | { kind: "niveau"; cycle: AnnualAcademicCycle; item?: GradeLevel }
  | null;

const toInput = (
  item?: AnnualAcademicCycle | GradeLevel,
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
        subjectsPeriodScope:
          "subjects_period_scope" in item
            ? (item.subjects_period_scope as "all" | "selectable")
            : undefined,
        gradingScale:
          "grading_scale" in item ? Number(item.grading_scale) : undefined,
        passAverage:
          "pass_average" in item ? Number(item.pass_average) : undefined,
        rankingEnabled:
          "ranking_enabled" in item ? Boolean(item.ranking_enabled) : undefined,
        absencesOnReport:
          "absences_on_report" in item
            ? Boolean(item.absences_on_report)
            : undefined,
        capacity: "capacity" in item ? Number(item.capacity) || null : undefined,
        repeatAllowed:
          "repeat_allowed" in item ? Boolean(item.repeat_allowed) : undefined,
      }
    : undefined;

const periodLabel = (cycle: AnnualAcademicCycle) =>
  cycle.period_system === "semester"
    ? `${cycle.period_count} semestres`
    : cycle.period_system === "term"
      ? `${cycle.period_count} trimestres`
      : `${cycle.period_count} périodes`;

export function LevelsSettingsPanel({ institutionId }: Props) {
  const { year } = useAcademicSession();
  const notify = useToast();
  const [cycles, setCycles] = useState<AnnualAcademicCycle[]>([]);
  const [levels, setLevels] = useState<GradeLevel[]>([]);
  const [annualIds, setAnnualIds] = useState<string[]>([]);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [failure, setFailure] = useState("");
  const editable = Boolean(
    year && !["closed", "archived"].includes(year.status),
  );

  const load = useCallback(async () => {
    if (!year) return;
    try {
      const [structure, annualCycles, annual] = await Promise.all([
        listAcademicStructure(institutionId),
        listAnnualAcademicCycles(year.id),
        listAnnualAcademicLevels(year.id),
      ]);
      setCycles(annualCycles);
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
          cycle.cycle_id,
          levels.filter(
            (level) =>
              level.cycle_id === cycle.cycle_id && annualIds.includes(level.id),
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
        const savedId = await saveAnnualAcademicCycle(
          year.id,
          input,
          dialog.item?.id,
        );
        if (
          !dialog.item ||
          dialog.item.period_system !== input.periodSystem ||
          dialog.item.period_count !== input.periodCount
        ) {
          const savedCycle = (await listAnnualAcademicCycles(year.id)).find(
            (cycle) => cycle.id === savedId,
          );
          if (!savedCycle) throw new Error("annual_cycle_not_found");
          await generateAcademicPeriods(year.id, savedCycle.cycle_id);
        }
      } else {
        const saved = await saveLevel(
          institutionId,
          dialog.cycle.cycle_id,
          input,
          dialog.item?.id,
        );
        if (!dialog.item) {
          const currentIds = levels
            .filter(
              (item) =>
                item.cycle_id === dialog.cycle.cycle_id &&
                annualIds.includes(item.id),
            )
            .map((item) => item.id);
          await setAnnualCycleLevels(year.id, dialog.cycle.cycle_id, [
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
        detail: "Le code doit être unique dans l’année sélectionnée.",
      });
    } finally {
      setSaving(false);
    }
  };

  const removeLevel = (cycle: AnnualAcademicCycle, level: GradeLevel) =>
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
          const remaining = (levelsByCycle.get(cycle.cycle_id) ?? [])
            .filter((item) => item.id !== level.id)
            .map((item) => item.id);
          await setAnnualCycleLevels(year.id, cycle.cycle_id, remaining);
          try {
            await deleteLevel(level.id);
          } catch {
            await saveLevel(
              institutionId,
              cycle.cycle_id,
              { ...toInput(level)!, isActive: false },
              level.id,
            );
          }
          await load();
        })(),
    });

  if (!year) {
    return (
      <Message
        severity="warn"
        text="Créez ou sélectionnez une année scolaire avant de configurer les niveaux."
      />
    );
  }

  if (failure) return <Message severity="error" text={failure} />;

  if (cycles.length === 0) {
    return (
      <Message
        severity="info"
        text="Aucun cycle actif. Activez d’abord un cycle dans la rubrique Cycles."
      />
    );
  }

  const readOnlyAlert = !editable ? (
    <Message
      severity="info"
      text={`${year.name} est clôturée et reste consultable en lecture seule.`}
    />
  ) : undefined;

  return (
    <section>
      <ConfirmDialog />
      <TabView>
        {cycles.map((cycle) => {
          const cycleLevels = levelsByCycle.get(cycle.cycle_id) ?? [];
          return (
            <TabPanel key={cycle.id} header={cycle.name}>
              <TablePanel
                title={`Niveaux — ${cycle.name}`}
                description={`${cycle.code} · ${periodLabel(cycle)} · ${year.name}`}
                meta={
                  <Tag
                    value={`${cycleLevels.length} niveau${cycleLevels.length > 1 ? "x" : ""}`}
                    severity="secondary"
                  />
                }
                alerts={readOnlyAlert}
                search={
                  <TableSearch
                    id={`levels-search-${cycle.id}`}
                    value={search}
                    onChange={setSearch}
                    placeholder="Rechercher un niveau"
                  />
                }
                actions={
                  <div className="flex items-center gap-2">
                    <Button
                      label="Configurer le cycle"
                      icon="pi pi-cog"
                      severity="secondary"
                      outlined
                      size="small"
                      disabled={!editable}
                      onClick={() => setDialog({ kind: "cycle", item: cycle })}
                    />
                    <Button
                      label="Ajouter un niveau"
                      icon="pi pi-plus"
                      size="small"
                      disabled={!editable}
                      onClick={() => setDialog({ kind: "niveau", cycle })}
                    />
                  </div>
                }
              >
                <DataTable
                  value={cycleLevels}
                  globalFilter={search}
                  globalFilterFields={[
                    "name",
                    "code",
                    "sort_order",
                    "capacity",
                    "is_active",
                    "repeat_allowed",
                  ]}
                  dataKey="id"
                  emptyMessage="Aucun niveau"
                  stripedRows
                  responsiveLayout="scroll"
                  size="small"
                >
                  <Column field="sort_order" header="Ordre" />
                  <Column field="name" header="Niveau" />
                  <Column field="code" header="Code" />
                  <Column
                    header="Actions"
                    headerClassName="text-right"
                    bodyClassName="text-right"
                    body={(level: GradeLevel) => (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          icon="pi pi-pencil"
                          text
                          size="small"
                          disabled={!editable}
                          onClick={() =>
                            setDialog({ kind: "niveau", cycle, item: level })
                          }
                        />
                        <Button
                          icon="pi pi-trash"
                          text
                          size="small"
                          severity="danger"
                          disabled={!editable}
                          onClick={() => removeLevel(cycle, level)}
                        />
                      </div>
                    )}
                  />
                </DataTable>
              </TablePanel>
            </TabPanel>
          );
        })}
      </TabView>

      <StructureItemDialog
        kind={dialog?.kind ?? "cycle"}
        visible={Boolean(dialog)}
        loading={saving}
        initial={toInput(dialog?.item)}
        onHide={() => setDialog(null)}
        onSubmit={submit}
      />
    </section>
  );
}
