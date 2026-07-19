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
import type { GradingFormula, MissingGradePolicy } from "../domain/grading-formula";
import { calculateFormulaPreview, validateFormulaExpression } from "../domain/grading-formula";
import { listAssessmentTypes } from "../services/assessment-types.service";
import { deleteGradingFormula, listGradingFormulas, saveGradingFormula } from "../services/grading-formulas.service";

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
  const [expression, setExpression] = useState("");
  const [missingPolicy, setMissingPolicy] = useState<MissingGradePolicy>("ignore");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [previewValues, setPreviewValues] = useState<Record<string, number | null>>({});
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

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (editing === undefined) return;
    setName(editing?.name ?? "");
    setCode(editing?.code ?? "");
    setDescription(editing?.description ?? "");
    setExpression(editing?.expression ?? "");
    setMissingPolicy(editing?.definition?.missing_grade_policy ?? "ignore");
    setIsDefault(editing?.is_default ?? false);
    setIsActive(editing?.is_active ?? true);
    setPreviewValues(Object.fromEntries(types.map((type) => [type.code, null])));
  }, [editing, types]);

  const allowedCodes = useMemo(() => types.map((type) => type.code.toUpperCase()), [types]);
  const validation = useMemo(() => validateFormulaExpression(expression, allowedCodes), [expression, allowedCodes]);
  const preview = useMemo(
    () => validation.valid ? calculateFormulaPreview(expression, previewValues, missingPolicy) : null,
    [expression, missingPolicy, previewValues, validation.valid],
  );

  const submit = async () => {
    if (!year || !name.trim() || !code.trim() || !validation.valid) {
      notify({ severity: "warn", summary: "Formule incomplète", detail: validation.error ?? "Renseignez le nom et le code." });
      return;
    }
    setSaving(true);
    try {
      await saveGradingFormula(institutionId, year.id, {
        name,
        code,
        expression,
        description: description || null,
        is_default: isDefault,
        is_active: isActive,
        missing_grade_policy: missingPolicy,
      }, allowedCodes, editing?.id);
      setEditing(undefined);
      await load();
      notify({ severity: "success", summary: "Formule enregistrée" });
    } catch (error) {
      notify({ severity: "error", summary: "Enregistrement impossible", detail: error instanceof Error ? error.message : "Vérifiez la formule." });
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
      notify({ severity: "error", summary: "Suppression impossible", detail: "La formule est peut-être déjà affectée." });
    }
  };

  if (!year) return <Message severity="warn" text="Sélectionnez une année scolaire avant de configurer les formules." />;

  return (
    <>
      <SettingsTablePanel
        sectionHeader={<PageHeader title="Formules de calcul" description="Écrivez directement la règle de l’établissement avec les codes des types d’évaluation." meta={<Tag value={`${items.length} formule${items.length > 1 ? "s" : ""}`} severity="secondary" />} headingAs="h2" compact />}
        alert={!editable ? <Message severity="info" text={`${year.name} est clôturée et reste consultable en lecture seule.`} /> : <Message severity="secondary" text="Exemple : (EVAL + COMP * 2) / 3. Les codes disponibles viennent du catalogue des types d’évaluation." />}
        toolbar={<Toolbar start={<TableSearch id="grading-formulas-search" value={search} onChange={setSearch} placeholder="Rechercher une formule" />} end={<Button label="Nouvelle formule" icon="pi pi-plus" size="small" disabled={!editable || types.length === 0} onClick={() => setEditing(null)} />} className="min-h-0 rounded-none border-0 bg-transparent p-0" />}
        dataTable={<DataTable value={items} globalFilter={search} globalFilterFields={["name", "code", "expression", "description"]} dataKey="id" emptyMessage="Aucune formule" stripedRows responsiveLayout="scroll" size="small">
          <Column header="Formule" body={(row: GradingFormula) => <div><div className="font-medium text-slate-900">{row.name}</div><div className="text-xs text-slate-500">{row.description || "Aucune description"}</div></div>} />
          <Column field="code" header="Code" />
          <Column field="expression" header="Expression" body={(row: GradingFormula) => <code className="rounded bg-slate-100 px-2 py-1 text-xs">{row.expression}</code>} />
          <Column header="Variables" body={(row: GradingFormula) => <div className="flex flex-wrap gap-1">{row.definition?.variables?.map((variable) => <Tag key={variable} value={variable} severity="secondary" />)}</div>} />
          <Column header="Version" body={(row: GradingFormula) => `v${row.version}`} />
          <Column header="Statut" body={(row: GradingFormula) => <div className="flex gap-1"><Tag value={row.is_active ? "Active" : "Inactive"} severity={row.is_active ? "success" : "secondary"} />{row.is_default ? <Tag value="Par défaut" severity="info" /> : null}</div>} />
          <Column header="Actions" headerClassName="text-right" bodyClassName="text-right" body={(row: GradingFormula) => <div className="flex items-center justify-end gap-1"><Button icon="pi pi-pencil" text size="small" disabled={!editable} onClick={() => setEditing(row)} /><Button icon="pi pi-trash" text size="small" severity="danger" disabled={!editable} onClick={() => void remove(row.id)} /></div>} />
        </DataTable>}
      />

      <Dialog header={editing?.id ? "Modifier la formule" : "Nouvelle formule"} visible={editing !== undefined} modal className="form-dialog form-dialog-wide" onHide={() => setEditing(undefined)}>
        <TabView>
          <TabPanel header="Configuration">
            <div className="form-grid">
              <div className="field"><label htmlFor="formula-name">Nom</label><InputText id="formula-name" value={name} onChange={(event) => setName(event.target.value)} /></div>
              <div className="field"><label htmlFor="formula-code">Code</label><CodeField id="formula-code" value={code} source={name} onChange={setCode} /></div>
              <div className="field field-wide"><label htmlFor="formula-description">Description</label><InputTextarea id="formula-description" value={description} rows={2} onChange={(event) => setDescription(event.target.value)} /></div>
              <div className="field field-wide"><label htmlFor="formula-expression">Formule</label><InputTextarea id="formula-expression" value={expression} rows={3} placeholder="(EVAL + COMP * 2) / 3" onChange={(event) => setExpression(event.target.value.toUpperCase())} /><small className={validation.valid ? "text-emerald-600" : "p-error"}>{validation.valid ? `Formule valide · ${validation.variables.join(", ")}` : validation.error}</small></div>
              <div className="field field-wide"><label>Codes disponibles</label><div className="flex flex-wrap gap-2">{types.map((type) => <Button key={type.id} label={type.code} size="small" outlined onClick={() => setExpression((current) => `${current}${current ? " " : ""}${type.code.toUpperCase()}`)} />)}</div></div>
              <div className="field"><label htmlFor="missing-policy">Valeur manquante</label><Dropdown inputId="missing-policy" value={missingPolicy} options={[{ label: "Remplacer par 0", value: "ignore" }, { label: "Bloquer le calcul", value: "block" }]} onChange={(event) => setMissingPolicy(event.value as MissingGradePolicy)} /></div>
              <div className="flex items-end gap-4 pb-2"><div className="checkbox-field"><Checkbox inputId="formula-default" checked={isDefault} onChange={(event) => setIsDefault(Boolean(event.checked))} /><label htmlFor="formula-default">Formule par défaut</label></div><div className="checkbox-field"><Checkbox inputId="formula-active" checked={isActive} onChange={(event) => setIsActive(Boolean(event.checked))} /><label htmlFor="formula-active">Active</label></div></div>
            </div>
          </TabPanel>
          <TabPanel header="Tester la formule">
            {!validation.valid ? <Message severity="warn" text={validation.error ?? "Corrigez la formule avant de la tester."} /> : <>
              <div className="grid gap-3 md:grid-cols-2">{validation.variables.map((variable) => <div className="field" key={variable}><label htmlFor={`preview-${variable}`}>{variable}</label><InputNumber inputId={`preview-${variable}`} value={previewValues[variable]} min={0} max={20} suffix=" /20" onValueChange={(event) => setPreviewValues((current) => ({ ...current, [variable]: event.value ?? null }))} /></div>)}</div>
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-medium uppercase tracking-wide text-slate-500">Calcul expliqué</div><code className="mt-2 block text-sm">{preview?.resolvedExpression}</code><div className="mt-2 text-2xl font-semibold text-slate-900">{preview?.blocked ? "Calcul bloqué" : preview?.result?.toFixed(2) ?? "—"}</div>{preview?.missing.length ? <small className="text-amber-700">Valeurs manquantes : {preview.missing.join(", ")}</small> : null}</div>
            </>}
          </TabPanel>
        </TabView>
        <div className="dialog-actions"><Button label="Annuler" severity="secondary" outlined onClick={() => setEditing(undefined)} /><Button label="Enregistrer" icon="pi pi-check" loading={saving} disabled={!validation.valid} onClick={() => void submit()} /></div>
      </Dialog>
    </>
  );
}
