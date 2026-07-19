import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { supabase } from "../../../shared/lib/supabase/client";
import { useToast } from "../../../shared/components/toast-context";
import type { GradingFormula } from "../domain/grading-formula";
import type { GradingFormulaAssignment } from "../domain/grading-formula-assignment";
import {
  deleteGradingFormulaAssignment,
  listGradingFormulaAssignments,
  saveGradingFormulaAssignment,
} from "../services/grading-formula-assignments.service";

interface Option { label: string; value: string }

export function GradingFormulaAssignmentsPanel({ formulas }: { formulas: GradingFormula[] }) {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [items, setItems] = useState<GradingFormulaAssignment[]>([]);
  const [cycles, setCycles] = useState<Option[]>([]);
  const [levels, setLevels] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [editing, setEditing] = useState<GradingFormulaAssignment | null | undefined>(undefined);
  const [formulaId, setFormulaId] = useState("");
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [levelId, setLevelId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [periodCode, setPeriodCode] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!year) return;
    const [assignments, cyclesResult, levelsResult, subjectsResult] = await Promise.all([
      listGradingFormulaAssignments(year.id),
      supabase.from("academic_year_cycles").select("id,name").eq("academic_year_id", year.id).eq("is_active", true).order("sort_order"),
      supabase.from("academic_year_levels").select("id,level_name_snapshot").eq("academic_year_id", year.id).eq("is_active", true).order("sort_order"),
      supabase.from("annual_subjects").select("id,subject_name_snapshot").eq("academic_year_id", year.id).order("subject_name_snapshot"),
    ]);
    setItems(assignments);
    setCycles((cyclesResult.data ?? []).map((item) => ({ label: item.name, value: item.id })));
    setLevels((levelsResult.data ?? []).map((item) => ({ label: item.level_name_snapshot, value: item.id })));
    setSubjects((subjectsResult.data ?? []).map((item) => ({ label: item.subject_name_snapshot, value: item.id })));
  }, [year]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (editing === undefined) return;
    setFormulaId(editing?.grading_formula_id ?? formulas.find((item) => item.is_default)?.id ?? formulas[0]?.id ?? "");
    setCycleId(editing?.academic_cycle_id ?? null);
    setLevelId(editing?.academic_year_level_id ?? null);
    setSubjectId(editing?.annual_subject_id ?? null);
    setPeriodCode(editing?.period_code ?? "");
  }, [editing, formulas]);

  const formulaOptions = useMemo(() => formulas.filter((item) => item.is_active).map((item) => ({ label: item.name, value: item.id })), [formulas]);
  const labelOf = (options: Option[], value: string | null) => options.find((item) => item.value === value)?.label ?? "Tous";
  const formulaName = (id: string) => formulas.find((item) => item.id === id)?.name ?? "Formule supprimée";

  const submit = async () => {
    if (!year || !formulaId || (!cycleId && !levelId && !subjectId && !periodCode.trim())) {
      notify({ severity: "warn", summary: "Affectation incomplète", detail: "Choisissez une formule et au moins un périmètre." });
      return;
    }
    setSaving(true);
    try {
      await saveGradingFormulaAssignment(institutionId, year.id, {
        grading_formula_id: formulaId,
        academic_cycle_id: cycleId,
        academic_year_level_id: levelId,
        annual_subject_id: subjectId,
        period_code: periodCode || null,
        is_active: true,
      }, editing?.id);
      setEditing(undefined);
      await load();
      notify({ severity: "success", summary: "Affectation enregistrée" });
    } catch (error) {
      notify({ severity: "error", summary: "Affectation impossible", detail: error instanceof Error ? error.message : "Ce périmètre est peut-être déjà affecté." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-3 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div><h2 className="text-sm font-semibold text-slate-900">Affectations des formules</h2><p className="text-xs text-slate-500">La règle la plus spécifique est appliquée avant la formule par défaut.</p></div>
        <Button label="Nouvelle affectation" icon="pi pi-plus" size="small" disabled={!year || formulaOptions.length === 0} onClick={() => setEditing(null)} />
      </div>
      <div className="p-3">
        {items.length === 0 ? <Message severity="secondary" text="Aucune affectation spécifique. La formule par défaut sera utilisée." /> : (
          <DataTable value={items} dataKey="id" size="small" stripedRows responsiveLayout="scroll">
            <Column header="Formule" body={(row: GradingFormulaAssignment) => <span className="font-medium">{formulaName(row.grading_formula_id)}</span>} />
            <Column header="Cycle" body={(row: GradingFormulaAssignment) => labelOf(cycles, row.academic_cycle_id)} />
            <Column header="Niveau" body={(row: GradingFormulaAssignment) => labelOf(levels, row.academic_year_level_id)} />
            <Column header="Matière" body={(row: GradingFormulaAssignment) => labelOf(subjects, row.annual_subject_id)} />
            <Column header="Période" body={(row: GradingFormulaAssignment) => row.period_code ? <Tag value={row.period_code} severity="secondary" /> : "Toutes"} />
            <Column header="Actions" bodyClassName="text-right" body={(row: GradingFormulaAssignment) => <div className="flex justify-end gap-1"><Button icon="pi pi-pencil" text size="small" onClick={() => setEditing(row)} /><Button icon="pi pi-trash" text size="small" severity="danger" onClick={() => void deleteGradingFormulaAssignment(row.id).then(load)} /></div>} />
          </DataTable>
        )}
      </div>
      <Dialog header={editing?.id ? "Modifier l’affectation" : "Nouvelle affectation"} visible={editing !== undefined} modal className="form-dialog form-dialog-wide" onHide={() => setEditing(undefined)}>
        <div className="form-grid">
          <div className="field field-wide"><label htmlFor="assignment-formula">Formule</label><Dropdown inputId="assignment-formula" value={formulaId} options={formulaOptions} onChange={(event) => setFormulaId(event.value)} /></div>
          <div className="field"><label htmlFor="assignment-cycle">Cycle</label><Dropdown inputId="assignment-cycle" value={cycleId} options={cycles} showClear onChange={(event) => setCycleId(event.value ?? null)} /></div>
          <div className="field"><label htmlFor="assignment-level">Niveau</label><Dropdown inputId="assignment-level" value={levelId} options={levels} showClear onChange={(event) => setLevelId(event.value ?? null)} /></div>
          <div className="field"><label htmlFor="assignment-subject">Matière</label><Dropdown inputId="assignment-subject" value={subjectId} options={subjects} showClear onChange={(event) => setSubjectId(event.value ?? null)} /></div>
          <div className="field"><label htmlFor="assignment-period">Code période</label><InputText id="assignment-period" value={periodCode} placeholder="T1, T2, S1…" onChange={(event) => setPeriodCode(event.target.value.toUpperCase())} /></div>
          <div className="dialog-actions field-wide"><Button label="Annuler" severity="secondary" outlined onClick={() => setEditing(undefined)} /><Button label="Enregistrer" icon="pi pi-check" loading={saving} onClick={() => void submit()} /></div>
        </div>
      </Dialog>
    </section>
  );
}
