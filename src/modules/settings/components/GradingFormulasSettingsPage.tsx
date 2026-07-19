import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { TabPanel, TabView } from "primereact/tabview";
import { Tag } from "primereact/tag";
import { Toolbar } from "primereact/toolbar";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { TableSearch } from "../../../shared/components/TableSearch";
import { CodeField } from "../../../shared/components/forms/CodeField";
import { useToast } from "../../../shared/components/toast-context";
import type { AssessmentType } from "../domain/assessment-type";
import type {
  GradingFormula,
  GradingFormulaDefinition,
} from "../domain/grading-formula";
import { calculateFormulaPreview } from "../domain/grading-formula";
import { listAssessmentTypes } from "../services/assessment-types.service";
import {
  deleteGradingFormula,
  listGradingFormulas,
  saveGradingFormula,
} from "../services/grading-formulas.service";

const emptyDefinition = (types: AssessmentType[]): GradingFormulaDefinition => ({
  method: "weighted_average",
  missing_grade_policy: "ignore",
  components: types.map((type) => ({ assessment_type_id: type.id, weight: 0 })),
});

export function GradingFormulasSettingsPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [items, setItems] = useState<GradingFormula[]>([]);
  const [types, setTypes] = useState<AssessmentType[]>([]);
  const [editing, setEditing] = useState<GradingFormula | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [definition, setDefinition] = useState<GradingFormulaDefinition>(emptyDefinition([]));
  const [previewScores, setPreviewScores] = useState<Record<string, number | null>>({});
  const editable = Boolean(year && !["closed", "archived"].includes(year.status));

  const load = useCallback(async () => {
    if (!year) return;
    const [formulas, assessmentTypes] = await Promise.all([
      listGradingFormulas(year.id),
      listAssessmentTypes(year.id),
    ]);
    setItems(formulas);
    setTypes(assessmentTypes.filter((type) => type.is_active));
  }, [year]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (editing === undefined) return;
    setName(editing?.name ?? "");
    setCode(editing?.code ?? "");
    setDescription(editing?.description ?? "");
    setIsDefault(editing?.is_default ?? false);
    setIsActive(editing?.is_active ?? true);
    const source = editing?.definition ?? emptyDefinition(types);
    setDefinition({
      ...source,
      components: types.map((type) =>
        source.components.find((component) => component.assessment_type_id === type.id) ?? {
          assessment_type_id: type.id,
          weight: 0,
        },
      ),
    });
    setPreviewScores(Object.fromEntries(types.map((type) => [type.id, null])));
  }, [editing, types]);

  const activeComponents = useMemo(
    () => definition.components.filter((component) => component.weight > 0),
    [definition],
  );

  const preview = useMemo(
    () =>
      calculateFormulaPreview(
        definition,
        types.map((type) => ({
          assessment_type_id: type.id,
          score: previewScores[type.id] ?? null,
          scale: type.scale,
        })),
      ),
    [definition, previewScores, types],
  );

  const updateWeight = (typeId: string, weight: number) => {
    setDefinition((current) => ({
      ...current,
      components: current.components.map((component) =>
        component.assessment_type_id === typeId ? { ...component, weight } : component,
      ),
    }));
  };

  const submit = async () => {
    if (!year || !name.trim() || !code.trim() || activeComponents.length === 0) {
      notify({
        severity: "warn",
        summary: "Formule incomplète",
        detail: "Renseignez un nom, un code et au moins un type d’évaluation avec un poids supérieur à zéro.",
      });
      return;
    }

    setSaving(true);
    try {
      await saveGradingFormula(
        institutionId,
        year.id,
        {
          name,
          code,
          description: description || null,
          is_default: isDefault,
          is_active: isActive,
          definition: { ...definition, components: activeComponents },
        },
        editing?.id,
      );
      setEditing(undefined);
      await load();
      notify({ severity: "success", summary: "Formule enregistrée" });
    } catch {
      notify({
        severity: "error",
        summary: "Enregistrement impossible",
        detail: "Vérifiez l’unicité du code et qu’une seule formule active est définie par défaut.",
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteGradingFormula(id);
      await load();
      notify({ severity: "success", summary: "Formule supprimée" });
    } catch {
      notify({
        severity: "error",
        summary: "Suppression impossible",
        detail: "La formule est peut-être déjà associée à un niveau, une matière ou un bulletin.",
      });
    }
  };

  if (!year) {
    return <Message severity="warn" text="Sélectionnez une année scolaire avant de configurer les formules." />;
  }

  const typeName = (id: string) => types.find((type) => type.id === id)?.name ?? "Type supprimé";

  return (
    <>
      <SettingsTablePanel
        sectionHeader={
          <PageHeader
            title="Formules de calcul"
            description="L’établissement définit ici les pondérations utilisées pour calculer les moyennes de matière."
            meta={<Tag value={`${items.length} formule${items.length > 1 ? "s" : ""}`} severity="secondary" />}
            headingAs="h2"
            compact
          />
        }
        alert={
          !editable ? (
            <Message severity="info" text={`${year.name} est clôturée et reste consultable en lecture seule.`} />
          ) : (
            <Message severity="secondary" text="GeeCole n’impose aucun poids : chaque école compose ses propres règles de calcul." />
          )
        }
        toolbar={
          <Toolbar
            start={<TableSearch id="grading-formulas-search" value={search} onChange={setSearch} placeholder="Rechercher une formule" />}
            end={<Button label="Nouvelle formule" icon="pi pi-plus" size="small" disabled={!editable || types.length === 0} onClick={() => setEditing(null)} />}
            className="min-h-0 rounded-none border-0 bg-transparent p-0"
          />
        }
        dataTable={
          <DataTable value={items} globalFilter={search} globalFilterFields={["name", "code", "description"]} dataKey="id" emptyMessage="Aucune formule" stripedRows responsiveLayout="scroll" size="small">
            <Column
              header="Formule"
              body={(row: GradingFormula) => (
                <div>
                  <div className="font-medium text-slate-900">{row.name}</div>
                  <div className="text-xs text-slate-500">{row.description || "Aucune description"}</div>
                </div>
              )}
            />
            <Column field="code" header="Code" />
            <Column
              header="Composition"
              body={(row: GradingFormula) => (
                <div className="flex flex-wrap gap-1">
                  {row.definition.components.map((component) => (
                    <Tag key={component.assessment_type_id} value={`${typeName(component.assessment_type_id)} × ${component.weight}`} severity="secondary" />
                  ))}
                </div>
              )}
            />
            <Column header="Version" body={(row: GradingFormula) => `v${row.version}`} />
            <Column
              header="Statut"
              body={(row: GradingFormula) => (
                <div className="flex gap-1">
                  <Tag value={row.is_active ? "Active" : "Inactive"} severity={row.is_active ? "success" : "secondary"} />
                  {row.is_default ? <Tag value="Par défaut" severity="info" /> : null}
                </div>
              )}
            />
            <Column
              header="Actions"
              headerClassName="text-right"
              bodyClassName="text-right"
              body={(row: GradingFormula) => (
                <div className="flex items-center justify-end gap-1">
                  <Button icon="pi pi-pencil" text size="small" aria-label={`Modifier ${row.name}`} disabled={!editable} onClick={() => setEditing(row)} />
                  <Button icon="pi pi-trash" text size="small" severity="danger" aria-label={`Supprimer ${row.name}`} disabled={!editable} onClick={() => void remove(row.id)} />
                </div>
              )}
            />
          </DataTable>
        }
      />

      <Dialog header={editing?.id ? "Modifier la formule" : "Nouvelle formule"} visible={editing !== undefined} modal className="form-dialog form-dialog-wide" onHide={() => setEditing(undefined)}>
        <TabView>
          <TabPanel header="Configuration">
            <div className="form-grid">
              <div className="field"><label htmlFor="formula-name">Nom</label><InputText id="formula-name" value={name} onChange={(event) => setName(event.target.value)} /></div>
              <div className="field"><label htmlFor="formula-code">Code</label><CodeField id="formula-code" value={code} source={name} onChange={setCode} /></div>
              <div className="field field-wide"><label htmlFor="formula-description">Description</label><InputTextarea id="formula-description" value={description} rows={2} onChange={(event) => setDescription(event.target.value)} /></div>
              <div className="field field-wide">
                <label>Pondérations par type d’évaluation</label>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <DataTable value={types} dataKey="id" size="small">
                    <Column field="name" header="Type" />
                    <Column field="scale" header="Barème" body={(row: AssessmentType) => `/${row.scale}`} />
                    <Column header="Poids" body={(row: AssessmentType) => <InputNumber value={definition.components.find((component) => component.assessment_type_id === row.id)?.weight ?? 0} min={0} maxFractionDigits={2} onValueChange={(event) => updateWeight(row.id, event.value ?? 0)} />} />
                  </DataTable>
                </div>
                <small className="text-slate-500">Un poids à 0 exclut le type de cette formule.</small>
              </div>
              <div className="field"><label htmlFor="missing-policy">Note manquante</label><Dropdown inputId="missing-policy" value={definition.missing_grade_policy} options={[{ label: "Ignorer dans le calcul", value: "ignore" }, { label: "Bloquer le calcul", value: "block" }]} onChange={(event) => setDefinition((current) => ({ ...current, missing_grade_policy: event.value }))} /></div>
              <div className="flex items-end gap-4 pb-2">
                <div className="checkbox-field"><Checkbox inputId="formula-default" checked={isDefault} onChange={(event) => setIsDefault(Boolean(event.checked))} /><label htmlFor="formula-default">Formule par défaut</label></div>
                <div className="checkbox-field"><Checkbox inputId="formula-active" checked={isActive} onChange={(event) => setIsActive(Boolean(event.checked))} /><label htmlFor="formula-active">Active</label></div>
              </div>
            </div>
          </TabPanel>
          <TabPanel header="Tester la formule">
            <Message severity="info" text="Saisissez des notes fictives. Elles sont normalisées sur 20 avant application des poids." />
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
              <DataTable value={types.filter((type) => activeComponents.some((component) => component.assessment_type_id === type.id))} dataKey="id" size="small">
                <Column field="name" header="Type" />
                <Column header="Poids" body={(row: AssessmentType) => activeComponents.find((component) => component.assessment_type_id === row.id)?.weight ?? 0} />
                <Column header="Note test" body={(row: AssessmentType) => <InputNumber value={previewScores[row.id]} min={0} max={row.scale} suffix={` /${row.scale}`} onValueChange={(event) => setPreviewScores((current) => ({ ...current, [row.id]: event.value ?? null }))} />} />
              </DataTable>
            </div>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Résultat simulé</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{preview.blocked ? "Calcul bloqué" : preview.result === null ? "—" : `${preview.result.toFixed(2)} /20`}</div>
              {preview.missing.length > 0 ? <div className="mt-1 text-xs text-slate-500">Notes manquantes : {preview.missing.map(typeName).join(", ")}</div> : null}
            </div>
          </TabPanel>
        </TabView>
        <div className="dialog-actions mt-3">
          <Button label="Annuler" severity="secondary" outlined onClick={() => setEditing(undefined)} />
          <Button label="Enregistrer" icon="pi pi-check" loading={saving} onClick={() => void submit()} />
        </div>
      </Dialog>
    </>
  );
}
