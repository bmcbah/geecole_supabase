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
import { supabase } from "../../../shared/lib/supabase/client";
import { useToast } from "../../../shared/components/toast-context";
import type { AssessmentType } from "../domain/assessment-type";
import type { FormulaTemporalScope, GradingFormula, MissingGradePolicy } from "../domain/grading-formula";
import { calculateFormulaPreview, validateFormulaExpression } from "../domain/grading-formula";
import { listAssessmentTypes } from "../services/assessment-types.service";
import { deleteGradingFormula, listGradingFormulas, saveGradingFormula } from "../services/grading-formulas.service";

interface Option { label: string; value: string; parentId?: string; cycleCatalogId?: string }

export function GradingFormulasSettingsPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [items, setItems] = useState<GradingFormula[]>([]);
  const [types, setTypes] = useState<AssessmentType[]>([]);
  const [cycles, setCycles] = useState<Option[]>([]);
  const [levels, setLevels] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [periods, setPeriods] = useState<Option[]>([]);
  const [editing, setEditing] = useState<GradingFormula | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [expression, setExpression] = useState("");
  const [missingPolicy, setMissingPolicy] = useState<MissingGradePolicy>("block");
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [levelId, setLevelId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [temporalScope, setTemporalScope] = useState<FormulaTemporalScope>("year");
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [previewValues, setPreviewValues] = useState<Record<string, number | null>>({});
  const editable = Boolean(year && !["closed", "archived"].includes(year.status));

  const load = useCallback(async () => {
    if (!year) return;
    const [formulas, assessmentTypes, cyclesResult, levelsResult, subjectsResult, periodsResult] = await Promise.all([
      listGradingFormulas(year.id),
      listAssessmentTypes(year.id),
      supabase.from("academic_year_cycles").select("id,cycle_id,name").eq("academic_year_id", year.id).eq("is_active", true).order("sort_order"),
      supabase.from("academic_year_levels").select("id,academic_year_cycle_id,level_name_snapshot").eq("academic_year_id", year.id).eq("is_active", true).order("sort_order"),
      supabase.from("annual_subjects").select("id,academic_year_level_id,subject_name_snapshot").eq("academic_year_id", year.id).order("subject_name_snapshot"),
      supabase.from("academic_periods").select("id,cycle_id,name,sequence").eq("academic_year_id", year.id).order("sequence"),
    ]);
    setItems(formulas);
    setTypes(assessmentTypes.filter((type) => type.is_active));
    setCycles((cyclesResult.data ?? []).map((item) => ({ label: item.name, value: item.id, cycleCatalogId: item.cycle_id })));
    setLevels((levelsResult.data ?? []).map((item) => ({ label: item.level_name_snapshot, value: item.id, parentId: item.academic_year_cycle_id })));
    setSubjects((subjectsResult.data ?? []).map((item) => ({ label: item.subject_name_snapshot, value: item.id, parentId: item.academic_year_level_id })));
    setPeriods((periodsResult.data ?? []).map((item) => ({ label: item.name, value: item.id, parentId: item.cycle_id })));
  }, [year]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (editing === undefined) return;
    setName(editing?.name ?? "");
    setCode(editing?.code ?? "");
    setDescription(editing?.description ?? "");
    setExpression(editing?.expression ?? "");
    setMissingPolicy(editing?.definition?.missing_grade_policy ?? "block");
    setCycleId(editing?.academic_year_cycle_id ?? null);
    setLevelId(editing?.academic_year_level_id ?? null);
    setSubjectId(editing?.annual_subject_id ?? null);
    setTemporalScope(editing?.temporal_scope ?? "year");
    setPeriodId(editing?.period_id ?? null);
    setIsDefault(editing?.is_default ?? false);
    setIsActive(editing?.is_active ?? true);
    setPreviewValues(Object.fromEntries(types.map((type) => [type.code, null])));
  }, [editing, types]);

  const allowedCodes = useMemo(() => types.map((type) => type.code.toUpperCase()), [types]);
  const validation = useMemo(() => validateFormulaExpression(expression, allowedCodes), [expression, allowedCodes]);
  const preview = useMemo(() => validation.valid ? calculateFormulaPreview(expression, previewValues, missingPolicy) : null, [expression, missingPolicy, previewValues, validation.valid]);
  const selectedCycle = cycles.find((item) => item.value === cycleId);
  const visibleLevels = cycleId ? levels.filter((item) => item.parentId === cycleId) : levels;
  const visibleSubjects = levelId ? subjects.filter((item) => item.parentId === levelId) : subjects;
  const visiblePeriods = selectedCycle ? periods.filter((item) => item.parentId === selectedCycle.cycleCatalogId) : periods;
  const labelOf = (options: Option[], value: string | null) => options.find((item) => item.value === value)?.label ?? "Tous";

  const submit = async () => {
    if (!year || !name.trim() || !code.trim() || !validation.valid) {
      notify({ severity: "warn", summary: "Formule incomplète", detail: validation.error ?? "Renseignez le nom et le code." });
      return;
    }
    if (temporalScope === "period" && !periodId) {
      notify({ severity: "warn", summary: "Période obligatoire", detail: "Sélectionnez une période du calendrier académique." });
      return;
    }
    setSaving(true);
    try {
      await saveGradingFormula(institutionId, year.id, {
        name, code, expression, description: description || null,
        is_default: isDefault, is_active: isActive,
        missing_grade_policy: missingPolicy,
        academic_year_cycle_id: cycleId,
        academic_year_level_id: levelId,
        annual_subject_id: subjectId,
        temporal_scope: temporalScope,
        period_id: temporalScope === "period" ? periodId : null,
      }, allowedCodes, editing?.id);
      setEditing(undefined);
      await load();
      notify({ severity: "success", summary: "Formule enregistrée avec son périmètre" });
    } catch (error) {
      notify({ severity: "error", summary: "Enregistrement impossible", detail: error instanceof Error ? error.message : "Vérifiez la formule et son périmètre." });
    } finally { setSaving(false); }
  };

  if (!year) return <Message severity="warn" text="Sélectionnez une année scolaire avant de configurer les formules." />;

  return <>
    <SettingsTablePanel
      sectionHeader={<PageHeader title="Formules de calcul" description="La formule, sa cible pédagogique et sa période sont configurées ensemble." meta={<Tag value={`${items.length} formule${items.length > 1 ? "s" : ""}`} severity="secondary" />} headingAs="h2" compact />}
      alert={!editable ? <Message severity="info" text={`${year.name} est clôturée et reste consultable en lecture seule.`} /> : <Message severity="secondary" text="Chaque formule couvre obligatoirement toute l’année ou une période existante du calendrier." />}
      toolbar={<Toolbar start={<TableSearch id="grading-formulas-search" value={search} onChange={setSearch} placeholder="Rechercher une formule" />} end={<Button label="Nouvelle formule" icon="pi pi-plus" size="small" disabled={!editable || types.length === 0} onClick={() => setEditing(null)} />} className="min-h-0 rounded-none border-0 bg-transparent p-0" />}
      dataTable={<DataTable value={items} globalFilter={search} globalFilterFields={["name", "code", "expression", "description"]} dataKey="id" emptyMessage="Aucune formule" stripedRows responsiveLayout="scroll" size="small">
        <Column header="Formule" body={(row: GradingFormula) => <div><div className="font-medium text-slate-900">{row.name}</div><code className="text-xs text-slate-500">{row.expression}</code></div>} />
        <Column header="Cible" body={(row: GradingFormula) => [labelOf(cycles, row.academic_year_cycle_id), labelOf(levels, row.academic_year_level_id), labelOf(subjects, row.annual_subject_id)].join(" · ")} />
        <Column header="Période" body={(row: GradingFormula) => row.temporal_scope === "year" ? <Tag value="Toute l’année" severity="info" /> : <Tag value={labelOf(periods, row.period_id)} severity="secondary" />} />
        <Column header="Version" body={(row: GradingFormula) => `v${row.version}`} />
        <Column header="Statut" body={(row: GradingFormula) => <div className="flex gap-1"><Tag value={row.is_active ? "Active" : "Inactive"} severity={row.is_active ? "success" : "secondary"} />{row.is_default ? <Tag value="Par défaut" severity="info" /> : null}</div>} />
        <Column header="Actions" bodyClassName="text-right" body={(row: GradingFormula) => <div className="flex justify-end gap-1"><Button icon="pi pi-pencil" text size="small" disabled={!editable} onClick={() => setEditing(row)} /><Button icon="pi pi-trash" text size="small" severity="danger" disabled={!editable} onClick={() => void deleteGradingFormula(row.id).then(load)} /></div>} />
      </DataTable>}
    />

    <Dialog header={editing?.id ? "Modifier la formule" : "Nouvelle formule"} visible={editing !== undefined} modal className="form-dialog form-dialog-wide" onHide={() => setEditing(undefined)}>
      <TabView>
        <TabPanel header="Formule et périmètre"><div className="form-grid">
          <div className="field"><label htmlFor="formula-name">Nom</label><InputText id="formula-name" value={name} onChange={(event) => setName(event.target.value)} /></div>
          <div className="field"><label htmlFor="formula-code">Code</label><CodeField id="formula-code" value={code} source={name} onChange={setCode} /></div>
          <div className="field"><label htmlFor="formula-cycle">Cycle</label><Dropdown inputId="formula-cycle" value={cycleId} options={cycles} showClear onChange={(event) => { setCycleId(event.value ?? null); setLevelId(null); setSubjectId(null); setPeriodId(null); }} /></div>
          <div className="field"><label htmlFor="formula-level">Niveau</label><Dropdown inputId="formula-level" value={levelId} options={visibleLevels} showClear onChange={(event) => { setLevelId(event.value ?? null); setSubjectId(null); }} /></div>
          <div className="field"><label htmlFor="formula-subject">Matière</label><Dropdown inputId="formula-subject" value={subjectId} options={visibleSubjects} showClear onChange={(event) => setSubjectId(event.value ?? null)} /></div>
          <div className="field"><label htmlFor="formula-temporal-scope">Application</label><Dropdown inputId="formula-temporal-scope" value={temporalScope} options={[{ label: "Toute l’année", value: "year" }, { label: "Une période", value: "period" }]} onChange={(event) => { setTemporalScope(event.value as FormulaTemporalScope); if (event.value === "year") setPeriodId(null); }} /></div>
          {temporalScope === "period" ? <div className="field"><label htmlFor="formula-period">Période</label><Dropdown inputId="formula-period" value={periodId} options={visiblePeriods} onChange={(event) => setPeriodId(event.value)} /></div> : null}
          <div className="field field-wide"><label htmlFor="formula-expression">Formule</label><InputTextarea id="formula-expression" value={expression} rows={3} placeholder="(EVAL + COMP * 2) / 3" onChange={(event) => setExpression(event.target.value.toUpperCase())} /><small className={validation.valid ? "text-emerald-600" : "p-error"}>{validation.valid ? `Formule valide · ${validation.variables.join(", ")}` : validation.error}</small></div>
          <div className="field field-wide"><label>Codes disponibles</label><div className="flex flex-wrap gap-2">{types.map((type) => <Button key={type.id} label={type.code} size="small" outlined onClick={() => setExpression((current) => `${current}${current ? " " : ""}${type.code.toUpperCase()}`)} />)}</div></div>
          <div className="field"><label htmlFor="missing-policy">Valeur manquante</label><Dropdown inputId="missing-policy" value={missingPolicy} options={[{ label: "Remplacer par 0", value: "ignore" }, { label: "Bloquer le calcul", value: "block" }]} onChange={(event) => setMissingPolicy(event.value as MissingGradePolicy)} /></div>
          <div className="field field-wide"><label htmlFor="formula-description">Description</label><InputTextarea id="formula-description" value={description} rows={2} onChange={(event) => setDescription(event.target.value)} /></div>
          <div className="flex items-end gap-4 pb-2"><div className="checkbox-field"><Checkbox inputId="formula-default" checked={isDefault} onChange={(event) => setIsDefault(Boolean(event.checked))} /><label htmlFor="formula-default">Formule par défaut du périmètre</label></div><div className="checkbox-field"><Checkbox inputId="formula-active" checked={isActive} onChange={(event) => setIsActive(Boolean(event.checked))} /><label htmlFor="formula-active">Active</label></div></div>
        </div></TabPanel>
        <TabPanel header="Tester la formule">{!validation.valid ? <Message severity="warn" text={validation.error ?? "Corrigez la formule avant de la tester."} /> : <><div className="grid gap-3 md:grid-cols-2">{validation.variables.map((variable) => <div className="field" key={variable}><label htmlFor={`preview-${variable}`}>{variable}</label><InputNumber inputId={`preview-${variable}`} value={previewValues[variable]} min={0} max={20} suffix=" /20" onValueChange={(event) => setPreviewValues((current) => ({ ...current, [variable]: event.value ?? null }))} /></div>)}</div><div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-medium uppercase tracking-wide text-slate-500">Calcul expliqué</div><code className="mt-2 block text-sm">{preview?.resolvedExpression}</code><div className="mt-2 text-2xl font-semibold text-slate-900">{preview?.blocked ? "Calcul bloqué" : preview?.result?.toFixed(2) ?? "—"}</div></div></>}</TabPanel>
      </TabView>
      <div className="dialog-actions"><Button label="Annuler" severity="secondary" outlined onClick={() => setEditing(undefined)} /><Button label="Enregistrer" icon="pi pi-check" loading={saving} disabled={!validation.valid} onClick={() => void submit()} /></div>
    </Dialog>
  </>;
}
