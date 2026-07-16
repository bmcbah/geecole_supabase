import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { TabPanel, TabView } from "primereact/tabview";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { useToast } from "../../../shared/components/toast-context";
import type { Database } from "../../../shared/lib/supabase/database.types";
import { listAnnualAcademicLevels } from "../services/academic-structure.service";
import {
  deleteAnnualSubject,
  deleteSubject,
  listAnnualSubjects,
  listSubjects,
  saveAnnualSubject,
  saveSubject,
} from "../services/annual-settings.service";
import { SettingsEntityDialog, type EntityValue } from "./SettingsEntityDialog";
import { SettingsPanelShell } from "./SettingsPanelShell";

type Subject = Database["public"]["Tables"]["subjects"]["Row"];
type AnnualSubject = Database["public"]["Tables"]["annual_subjects"]["Row"];
type DialogState =
  | { kind: "catalog"; item?: Subject }
  | { kind: "annual"; item?: AnnualSubject }
  | null;

export function SubjectsSettingsPanel() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [annual, setAnnual] = useState<AnnualSubject[]>([]);
  const [levels, setLevels] = useState<
    Awaited<ReturnType<typeof listAnnualAcademicLevels>>
  >([]);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    if (!institutionId) return;
    const [catalog, annualItems, annualLevels] = await Promise.all([
      listSubjects(institutionId),
      year ? listAnnualSubjects(year.id) : Promise.resolve([]),
      year ? listAnnualAcademicLevels(year.id) : Promise.resolve([]),
    ]);
    setSubjects(catalog);
    setAnnual(annualItems);
    setLevels(annualLevels);
  }, [institutionId, year]);
  useEffect(() => {
    void load();
  }, [load]);
  const fields =
    dialog?.kind === "annual"
      ? [
          {
            key: "academic_year_level_id",
            label: "Niveau",
            type: "select" as const,
            required: true,
            options: levels.map((item) => ({
              label: `${item.cycle_name_snapshot} — ${item.level_name_snapshot}`,
              value: item.id,
            })),
          },
          {
            key: "subject_id",
            label: "Matière",
            type: "select" as const,
            required: true,
            options: subjects
              .filter((item) => item.is_active)
              .map((item) => ({ label: item.name, value: item.id })),
          },
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
            academic_year_level_id: dialog.item?.academic_year_level_id ?? "",
            subject_id: dialog.item?.subject_id ?? "",
            coefficient: dialog.item?.coefficient ?? 1,
            weekly_hours: dialog.item?.weekly_hours ?? 0,
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
            academic_year_level_id: String(values.academic_year_level_id),
            subject_id: String(values.subject_id),
            coefficient: Number(values.coefficient),
            weekly_hours: Number(values.weekly_hours),
          },
          dialog.item?.id,
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
  const remove = async (kind: "catalog" | "annual", id: string) => {
    try {
      await (kind === "catalog" ? deleteSubject(id) : deleteAnnualSubject(id));
      await load();
    } catch {
      notify({
        severity: "error",
        summary: "Suppression impossible",
        detail: "Cet élément est peut-être déjà utilisé.",
      });
    }
  };
  const actions = (
    kind: "catalog" | "annual",
    item: Subject | AnnualSubject,
  ) => (
    <div className="table-actions">
      <Button
        icon="pi pi-pencil"
        text
        disabled={kind === "annual" && year?.status !== "preparation"}
        onClick={() =>
          setDialog(
            kind === "catalog"
              ? { kind, item: item as Subject }
              : { kind, item: item as AnnualSubject },
          )
        }
      />
      <Button
        icon="pi pi-trash"
        text
        severity="danger"
        disabled={kind === "annual" && year?.status !== "preparation"}
        onClick={() => void remove(kind, item.id)}
      />
    </div>
  );
  const levelName = (row: AnnualSubject) =>
    levels.find((item) => item.id === row.academic_year_level_id)
      ?.level_name_snapshot ?? "Niveau retiré";
  return (
    <SettingsPanelShell
      title="Matières"
      description="Catalogue permanent et matières proposées par niveau"
      year={year}
    >
      <TabView>
        <TabPanel header="Catalogue de l’école">
          <div className="panel-toolbar panel-toolbar-end">
            <span />
            <Button
              label="Nouvelle matière"
              icon="pi pi-plus"
              onClick={() => setDialog({ kind: "catalog" })}
            />
          </div>
          <DataTable
            value={subjects}
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
              body={(row: Subject) => actions("catalog", row)}
            />
          </DataTable>
        </TabPanel>
        <TabPanel header={`Configuration ${year?.name ?? "annuelle"}`}>
          <div className="panel-toolbar panel-toolbar-end">
            <span />
            <Button
              label="Affecter une matière"
              icon="pi pi-plus"
              disabled={year?.status !== "preparation" || levels.length === 0}
              onClick={() => setDialog({ kind: "annual" })}
            />
          </div>
          <DataTable
            value={annual}
            dataKey="id"
            emptyMessage="Aucune matière affectée"
            stripedRows
          >
            <Column header="Niveau" body={levelName} />
            <Column field="subject_name_snapshot" header="Matière" />
            <Column field="coefficient" header="Coefficient" />
            <Column field="weekly_hours" header="Heures/semaine" />
            <Column
              header="Actions"
              body={(row: AnnualSubject) => actions("annual", row)}
            />
          </DataTable>
        </TabPanel>
      </TabView>
      <SettingsEntityDialog
        header={
          dialog?.kind === "annual"
            ? "Affectation annuelle"
            : "Matière du catalogue"
        }
        visible={Boolean(dialog)}
        loading={saving}
        fields={fields}
        initial={initial}
        onHide={() => setDialog(null)}
        onSubmit={submit}
      />
    </SettingsPanelShell>
  );
}
