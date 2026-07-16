import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { TabPanel, TabView } from "primereact/tabview";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { useToast } from "../../../shared/components/toast-context";
import type { Database } from "../../../shared/lib/supabase/database.types";
import {
  deleteAssessmentType,
  deleteGradingFormula,
  listAssessmentTypes,
  listGradingFormulas,
  saveAssessmentType,
  saveGradingFormula,
} from "../services/annual-settings.service";
import {
  SettingsEntityDialog,
  type EntityField,
  type EntityValue,
} from "./SettingsEntityDialog";
import { SettingsPanelShell } from "./SettingsPanelShell";
type Assessment = Database["public"]["Tables"]["assessment_types"]["Row"];
type Formula = Database["public"]["Tables"]["grading_formulas"]["Row"];
type DialogState =
  | { kind: "assessment"; item?: Assessment }
  | { kind: "formula"; item?: Formula }
  | null;
const assessmentFields: EntityField[] = [
  { key: "name", label: "Nom", required: true },
  { key: "code", label: "Code", required: true },
  { key: "weight", label: "Poids", type: "number", required: true },
  { key: "scale", label: "Barème", type: "number", required: true },
  { key: "is_active", label: "Type actif", type: "boolean" },
];
const formulaFields: EntityField[] = [
  { key: "name", label: "Nom", required: true },
  { key: "expression", label: "Expression", type: "textarea", required: true },
  { key: "description", label: "Description", type: "textarea" },
  { key: "is_default", label: "Formule par défaut", type: "boolean" },
];
export function EvaluationSettingsPanel() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    if (!year) return;
    const [a, f] = await Promise.all([
      listAssessmentTypes(year.id),
      listGradingFormulas(year.id),
    ]);
    setAssessments(a);
    setFormulas(f);
  }, [year]);
  useEffect(() => {
    void load();
  }, [load]);
  const initial = useMemo<Record<string, EntityValue>>(
    () =>
      dialog?.kind === "formula"
        ? {
            name: dialog.item?.name ?? "",
            expression:
              dialog.item?.expression ??
              "(moyenne_notes * poids) / somme_poids",
            description: dialog.item?.description ?? "",
            is_default: dialog.item?.is_default ?? false,
          }
        : {
            name: dialog?.item?.name ?? "",
            code: dialog?.item?.code ?? "",
            weight: dialog?.item?.weight ?? 1,
            scale: dialog?.item?.scale ?? 20,
            is_active: dialog?.item?.is_active ?? true,
          },
    [dialog],
  );
  const submit = async (values: Record<string, EntityValue>) => {
    if (!dialog || !year) return;
    setSaving(true);
    try {
      if (dialog.kind === "assessment")
        await saveAssessmentType(
          institutionId,
          year.id,
          {
            name: String(values.name),
            code: String(values.code).toUpperCase(),
            weight: Number(values.weight),
            scale: Number(values.scale),
            is_active: Boolean(values.is_active),
          },
          dialog.item?.id,
        );
      else
        await saveGradingFormula(
          institutionId,
          year.id,
          {
            name: String(values.name),
            expression: String(values.expression),
            description: String(values.description) || null,
            is_default: Boolean(values.is_default),
          },
          dialog.item?.id,
        );
      setDialog(null);
      await load();
      notify({ severity: "success", summary: "Paramètre enregistré" });
    } catch {
      notify({
        severity: "error",
        summary: "Enregistrement impossible",
        detail: "Vérifiez les valeurs et l’unicité du nom.",
      });
    } finally {
      setSaving(false);
    }
  };
  const remove = async (kind: "assessment" | "formula", id: string) => {
    try {
      await (kind === "assessment"
        ? deleteAssessmentType(id)
        : deleteGradingFormula(id));
      await load();
    } catch {
      notify({ severity: "error", summary: "Suppression impossible" });
    }
  };
  const actions = (
    kind: "assessment" | "formula",
    item: Assessment | Formula,
  ) => (
    <div className="table-actions">
      <Button
        icon="pi pi-pencil"
        text
        disabled={year?.status !== "preparation"}
        onClick={() =>
          setDialog(
            kind === "assessment"
              ? { kind, item: item as Assessment }
              : { kind, item: item as Formula },
          )
        }
      />
      <Button
        icon="pi pi-trash"
        text
        severity="danger"
        disabled={year?.status !== "preparation"}
        onClick={() => void remove(kind, item.id)}
      />
    </div>
  );
  return (
    <SettingsPanelShell
      title="Évaluations et formules"
      description="Règles de notation propres à l’année sélectionnée"
      year={year}
    >
      <TabView>
        <TabPanel header="Types d’évaluation">
          <div className="panel-toolbar panel-toolbar-end">
            <span />
            <Button
              label="Nouveau type"
              icon="pi pi-plus"
              disabled={year?.status !== "preparation"}
              onClick={() => setDialog({ kind: "assessment" })}
            />
          </div>
          <DataTable
            value={assessments}
            dataKey="id"
            emptyMessage="Aucun type d’évaluation"
            stripedRows
          >
            <Column field="name" header="Type" />
            <Column field="code" header="Code" />
            <Column field="weight" header="Poids" />
            <Column field="scale" header="Barème" />
            <Column
              header="Statut"
              body={(row: Assessment) => (
                <Tag
                  value={row.is_active ? "Actif" : "Inactif"}
                  severity={row.is_active ? "success" : "secondary"}
                />
              )}
            />
            <Column
              header="Actions"
              body={(row: Assessment) => actions("assessment", row)}
            />
          </DataTable>
        </TabPanel>
        <TabPanel header="Formules de calcul">
          <div className="panel-toolbar panel-toolbar-end">
            <span />
            <Button
              label="Nouvelle formule"
              icon="pi pi-plus"
              disabled={year?.status !== "preparation"}
              onClick={() => setDialog({ kind: "formula" })}
            />
          </div>
          <DataTable
            value={formulas}
            dataKey="id"
            emptyMessage="Aucune formule"
            stripedRows
          >
            <Column field="name" header="Formule" />
            <Column field="expression" header="Expression" />
            <Column
              header="Défaut"
              body={(row: Formula) =>
                row.is_default ? (
                  <Tag value="Par défaut" severity="success" />
                ) : null
              }
            />
            <Column
              header="Actions"
              body={(row: Formula) => actions("formula", row)}
            />
          </DataTable>
        </TabPanel>
      </TabView>
      <SettingsEntityDialog
        header={
          dialog?.kind === "formula" ? "Formule de calcul" : "Type d’évaluation"
        }
        visible={Boolean(dialog)}
        loading={saving}
        fields={dialog?.kind === "formula" ? formulaFields : assessmentFields}
        initial={initial}
        onHide={() => setDialog(null)}
        onSubmit={submit}
      />
    </SettingsPanelShell>
  );
}
