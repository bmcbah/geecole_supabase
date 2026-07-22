import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { Message } from "primereact/message";
import { PickList, type PickListChangeEvent } from "primereact/picklist";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { useToast } from "../../../shared/components/toast-context";
import type { Database } from "../../../shared/lib/supabase/database.types";
import {
  listAcademicPeriods,
  listAnnualAcademicLevels,
} from "../services/academic-structure.service";
import {
  deleteSubject,
  installSubjectCatalog,
  listAnnualSubjects,
  listSubjects,
  saveAnnualSubject,
  saveSubject,
  setAnnualLevelSubjects,
} from "../services/annual-settings.service";
import { SettingsEntityDialog, type EntityValue } from "./SettingsEntityDialog";
import { TableSearch } from "../../../shared/components/TableSearch";

type Subject = Database["public"]["Tables"]["subjects"]["Row"];
type AnnualSubject = Database["public"]["Tables"]["annual_subjects"]["Row"];
type DialogState =
  | { kind: "catalog"; item?: Subject }
  | { kind: "annual"; item: AnnualSubject }
  | null;

export function SubjectsSettingsPanel() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [annual, setAnnual] = useState<AnnualSubject[]>([]);
  const [levels, setLevels] = useState<
    Awaited<ReturnType<typeof listAnnualAcademicLevels>>
  >([]);
  const [levelId, setLevelId] = useState("");
  const [source, setSource] = useState<Subject[]>([]);
  const [target, setTarget] = useState<Subject[]>([]);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [periods, setPeriods] = useState<
    Awaited<ReturnType<typeof listAcademicPeriods>>
  >([]);

  const editable = Boolean(
    year && !["closed", "archived"].includes(year.status),
  );

  const load = useCallback(async () => {
    if (!institutionId) return;
    const [catalog, annualItems, annualLevels, yearPeriods] = await Promise.all(
      [
        listSubjects(institutionId),
        year ? listAnnualSubjects(year.id) : Promise.resolve([]),
        year ? listAnnualAcademicLevels(year.id) : Promise.resolve([]),
        year ? listAcademicPeriods(year.id) : Promise.resolve([]),
      ],
    );
    setSubjects(catalog);
    setAnnual(annualItems);
    setLevels(annualLevels);
    setPeriods(yearPeriods);
    setLevelId((current) =>
      annualLevels.some((item) => item.id === current)
        ? current
        : (annualLevels[0]?.id ?? ""),
    );
  }, [institutionId, year]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const assignedIds = new Set(
      annual
        .filter((item) => item.academic_year_level_id === levelId)
        .map((item) => item.subject_id),
    );
    setTarget(subjects.filter((item) => assignedIds.has(item.id)));
    setSource(
      subjects.filter((item) => item.is_active && !assignedIds.has(item.id)),
    );
  }, [annual, levelId, subjects]);

  const fields =
    dialog?.kind === "annual"
      ? [
          {
            key: "coefficient",
            label: "Coefficient",
            type: "number" as const,
            required: true,
          },
          {
            key: "weekly_hours",
            label: "Volume horaire hebdomadaire",
            type: "number" as const,
            required: true,
            suffix: " h",
          },
          {
            key: "applies_all_periods",
            label: "Enseignée pendant toutes les périodes",
            type: "boolean" as const,
          },
          {
            key: "period_ids",
            label: "Périodes concernées",
            type: "multiselect" as const,
            options: periods.map((period) => ({
              label: period.name,
              value: period.id,
            })),
          },
        ]
      : [
          { key: "name", label: "Nom de la matière", required: true },
          { key: "code", label: "Code", required: true },
          {
            key: "is_active",
            label: "Matière active",
            type: "boolean" as const,
          },
        ];

  const initial = useMemo<Record<string, EntityValue>>(
    () =>
      dialog?.kind === "annual"
        ? {
            coefficient: dialog.item.coefficient,
            weekly_hours: dialog.item.weekly_hours,
            applies_all_periods: dialog.item.applies_all_periods,
            period_ids: dialog.item.period_ids,
          }
        : {
            name: dialog?.item?.name ?? "",
            code: dialog?.item?.code ?? "",
            is_active: dialog?.item?.is_active ?? true,
          },
    [dialog],
  );

  const submit = async (values: Record<string, EntityValue>) => {
    if (!dialog || !year) return;
    setSaving(true);
    try {
      if (dialog.kind === "catalog")
        await saveSubject(
          institutionId,
          {
            name: String(values.name),
            code: String(values.code).toUpperCase(),
            is_active: Boolean(values.is_active),
          },
          dialog.item?.id,
        );
      else
        await saveAnnualSubject(
          institutionId,
          year.id,
          {
            academic_year_level_id: dialog.item.academic_year_level_id,
            subject_id: dialog.item.subject_id,
            coefficient: Number(values.coefficient),
            weekly_hours: Number(values.weekly_hours),
            applies_all_periods: Boolean(values.applies_all_periods),
            period_ids: Array.isArray(values.period_ids)
              ? values.period_ids
              : [],
          },
          dialog.item.id,
        );
      setDialog(null);
      await load();
      notify({ severity: "success", summary: "Matière enregistrée" });
    } catch {
      notify({ severity: "error", summary: "Enregistrement impossible" });
    } finally {
      setSaving(false);
    }
  };

  const saveSelection = async () => {
    if (!levelId) return;
    setSaving(true);
    try {
      await setAnnualLevelSubjects(
        levelId,
        target.map((item) => item.id),
      );
      await load();
      notify({
        severity: "success",
        summary: "Matières du niveau enregistrées",
      });
    } catch {
      notify({ severity: "error", summary: "Affectation impossible" });
    } finally {
      setSaving(false);
    }
  };

  const installCatalog = async () => {
    setSaving(true);
    try {
      const installed = await installSubjectCatalog(institutionId);
      await load();
      notify({
        severity: "success",
        summary: "Catalogue GeEcole chargé",
        detail:
          Number(installed) > 0
            ? `${installed} matière(s) ajoutée(s).`
            : "Le catalogue est déjà à jour.",
      });
    } catch {
      notify({
        severity: "error",
        summary: "Chargement du catalogue impossible",
      });
    } finally {
      setSaving(false);
    }
  };

  const onTransfer = (event: PickListChangeEvent) => {
    if (!editable) return;
    setSource(event.source as Subject[]);
    setTarget(event.target as Subject[]);
  };

  const assignedRows = annual.filter(
    (item) =>
      item.academic_year_level_id === levelId &&
      target.some((subject) => subject.id === item.subject_id),
  );

  const levelOptions = levels.map((item) => ({
    label: `${item.cycle_name_snapshot} — ${item.level_name_snapshot}`,
    value: item.id,
  }));

  const itemTemplate = (item: Subject) => (
    <div className="subject-pick-item">
      <strong>{item.name}</strong>
      <small>{item.code}</small>
    </div>
  );

  return (
    <div className="space-y-3">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Affectation par niveau
              </h2>
              <Tag
                value={editable ? "Modifiable" : "Lecture seule"}
                severity={editable ? "success" : "secondary"}
              />
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Choisissez un niveau puis organisez les matières enseignées.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="field min-w-64">
              <label htmlFor="subject-level">Cycle et niveau</label>
              <Dropdown
                inputId="subject-level"
                value={levelId}
                options={levelOptions}
                optionLabel="label"
                optionValue="value"
                placeholder="Choisir un niveau"
                onChange={(event) => {
                  const value = event.value as unknown;
                  if (typeof value === "string") setLevelId(value);
                }}
              />
            </div>
            <Button
              label="Nouvelle matière"
              icon="pi pi-plus"
              size="small"
              outlined
              onClick={() => setDialog({ kind: "catalog" })}
            />
          </div>
        </div>

        {levelId ? (
          <div className="space-y-3 p-3">
            <PickList
              dataKey="id"
              source={source}
              target={target}
              onChange={onTransfer}
              itemTemplate={itemTemplate}
              sourceHeader="Disponibles"
              targetHeader="Enseignées dans ce niveau"
              sourceStyle={{ height: "18rem" }}
              targetStyle={{ height: "18rem" }}
              filter
              filterBy="name,code"
              sourceFilterPlaceholder="Rechercher"
              targetFilterPlaceholder="Rechercher"
              className={!editable ? "picklist-disabled" : undefined}
            />
            <div className="flex justify-end">
              <Button
                label="Enregistrer l’affectation"
                icon="pi pi-check"
                size="small"
                loading={saving}
                disabled={!editable}
                onClick={() => void saveSelection()}
              />
            </div>
          </div>
        ) : (
          <div className="p-3">
            <Message
              severity="info"
              text="Activez d’abord un cycle et un niveau."
            />
          </div>
        )}
      </section>

      {assignedRows.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Coefficients et volumes horaires
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Paramètres spécifiques au niveau sélectionné.
              </p>
            </div>
            <TableSearch value={search} onChange={setSearch} />
          </div>
          <DataTable
            value={assignedRows}
            globalFilter={search}
            globalFilterFields={[
              "subject_name_snapshot",
              "subject_code_snapshot",
              "coefficient",
              "weekly_hours",
            ]}
            dataKey="id"
            stripedRows
          >
            <Column field="subject_name_snapshot" header="Matière" />
            <Column field="coefficient" header="Coefficient" />
            <Column field="weekly_hours" header="Heures/semaine" />
            <Column
              header="Actions"
              body={(row: AnnualSubject) => (
                <Button
                  icon="pi pi-sliders-h"
                  label="Configurer"
                  size="small"
                  text
                  disabled={!editable}
                  onClick={() => setDialog({ kind: "annual", item: row })}
                />
              )}
            />
          </DataTable>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Catalogue de l’établissement
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Référentiel commun disponible pour tous les niveaux.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TableSearch value={search} onChange={setSearch} />
            <Button
              label="Catalogue GeEcole"
              icon="pi pi-download"
              severity="secondary"
              outlined
              size="small"
              loading={saving}
              onClick={() => void installCatalog()}
            />
            <Button
              label="Nouvelle matière"
              icon="pi pi-plus"
              size="small"
              onClick={() => setDialog({ kind: "catalog" })}
            />
          </div>
        </div>
        <DataTable
          value={subjects}
          globalFilter={search}
          globalFilterFields={["name", "code", "is_active"]}
          dataKey="id"
          emptyMessage="Aucune matière"
          stripedRows
        >
          <Column field="name" header="Matière" />
          <Column field="code" header="Code" />
          <Column
            header="Statut"
            body={(row: Subject) => (
              <Tag
                value={row.is_active ? "Active" : "Inactive"}
                severity={row.is_active ? "success" : "secondary"}
              />
            )}
          />
          <Column
            header="Actions"
            body={(row: Subject) => (
              <div className="table-actions">
                <Button
                  icon="pi pi-pencil"
                  size="small"
                  text
                  onClick={() => setDialog({ kind: "catalog", item: row })}
                />
                <Button
                  icon="pi pi-trash"
                  size="small"
                  text
                  severity="danger"
                  onClick={() => void deleteSubject(row.id).then(load)}
                />
              </div>
            )}
          />
        </DataTable>
      </section>

      <SettingsEntityDialog
        header={
          dialog?.kind === "annual"
            ? "Configurer la matière"
            : "Matière de l’établissement"
        }
        visible={Boolean(dialog)}
        loading={saving}
        fields={fields}
        initial={initial}
        onHide={() => setDialog(null)}
        onSubmit={submit}
      />
    </div>
  );
}
