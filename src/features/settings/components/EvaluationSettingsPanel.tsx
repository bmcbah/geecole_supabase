import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Message } from "primereact/message";
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
import { TableSearch } from "../../../shared/components/TableSearch";
import { Panel } from "../../../shared/components/layout/Panel";

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
  { key: "code", label: "Code", required: true },
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
  const [assessmentSearch, setAssessmentSearch] = useState("");
  const [formulaSearch, setFormulaSearch] = useState("");
  const editable = Boolean(
    year && !["closed", "archived"].includes(year.status),
  );

  const load = useCallback(async () => {
    if (!year) return;
    const [assessmentItems, formulaItems] = await Promise.all([
      listAssessmentTypes(year.id),
      listGradingFormulas(year.id),
    ]);
    setAssessments(assessmentItems);
    setFormulas(formulaItems);
  }, [year]);

  useEffect(() => {
    void load();
  }, [load]);

  const initial = useMemo<Record<string, EntityValue>>(
    () =>
      dialog?.kind === "formula"
        ? {
            name: dialog.item?.name ?? "",
            code: dialog.item?.code ?? "",
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
      if (dialog.kind === "assessment") {
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
      } else {
        await saveGradingFormula(
          institutionId,
          year.id,
          {
            name: String(values.name),
            code: String(values.code).toUpperCase(),
            expression: String(values.expression),
            description: String(values.description) || null,
            is_default: Boolean(values.is_default),
          },
          dialog.item?.id,
        );
      }
      setDialog(null);
      await load();
      notify({ severity: "success", summary: "Paramètre enregistré" });
    } catch {
      notify({
        severity: "error",
        summary: "Enregistrement impossible",
        detail: "Vérifiez les valeurs et l’unicité du code dans cette année.",
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
        size="small"
        disabled={!editable}
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
        size="small"
        severity="danger"
        disabled={!editable}
        onClick={() => void remove(kind, item.id)}
      />
    </div>
  );

  if (!year) {
    return (
      <Message
        severity="warn"
        text="Créez ou sélectionnez une année scolaire avant de configurer les évaluations."
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
    <div className="space-y-3">
      <Panel
        title="Types de notes"
        description="Définissez les catégories de notes, leur poids et leur barème."
        meta={<Tag value={`${assessments.length} type${assessments.length > 1 ? "s" : ""}`} severity="info" />}
        search={
          <TableSearch
            value={assessmentSearch}
            onChange={setAssessmentSearch}
            placeholder="Rechercher un type"
          />
        }
        actions={
          <Button
            label="Nouveau type"
            icon="pi pi-plus"
            size="small"
            disabled={!editable}
            onClick={() => setDialog({ kind: "assessment" })}
          />
        }
        alerts={readOnlyAlert}
      >
        <DataTable
          value={assessments}
          globalFilter={assessmentSearch}
          globalFilterFields={["name", "code", "weight", "scale", "is_active"]}
          dataKey="id"
          emptyMessage="Aucun type de note"
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
          <Column header="Actions" body={(row: Assessment) => actions("assessment", row)} />
        </DataTable>
      </Panel>

      <Panel
        title="Formules de calcul"
        description="Configurez séparément les règles utilisées pour calculer les moyennes."
        meta={<Tag value={`${formulas.length} formule${formulas.length > 1 ? "s" : ""}`} severity="info" />}
        search={
          <TableSearch
            value={formulaSearch}
            onChange={setFormulaSearch}
            placeholder="Rechercher une formule"
          />
        }
        actions={
          <Button
            label="Nouvelle formule"
            icon="pi pi-plus"
            size="small"
            disabled={!editable}
            onClick={() => setDialog({ kind: "formula" })}
          />
        }
        alerts={readOnlyAlert}
      >
        <DataTable
          value={formulas}
          globalFilter={formulaSearch}
          globalFilterFields={["name", "code", "expression", "description", "is_default"]}
          dataKey="id"
          emptyMessage="Aucune formule"
          stripedRows
        >
          <Column field="name" header="Formule" />
          <Column field="code" header="Code" />
          <Column field="expression" header="Expression" />
          <Column
            header="Défaut"
            body={(row: Formula) =>
              row.is_default ? <Tag value="Par défaut" severity="success" /> : null
            }
          />
          <Column header="Actions" body={(row: Formula) => actions("formula", row)} />
        </DataTable>
      </Panel>

      <SettingsEntityDialog
        header={dialog?.kind === "formula" ? "Formule de calcul" : "Type de note"}
        visible={Boolean(dialog)}
        loading={saving}
        fields={dialog?.kind === "formula" ? formulaFields : assessmentFields}
        initial={initial}
        onHide={() => setDialog(null)}
        onSubmit={submit}
      />
    </div>
  );
}
