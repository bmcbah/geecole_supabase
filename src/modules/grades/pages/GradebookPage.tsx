import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useToast } from "../../../shared/components/toast-context";
import { supabase } from "../../../shared/lib/supabase/client";
import type { Assessment, AssessmentInput, GradebookRow, GradeStatus } from "../domain/gradebook";
import { gradeStatusLabel, normalizeGradeEntry, validateGradeEntry } from "../domain/gradebook";
import { listAssessments, loadGradebook, saveAssessment, saveGradebook, updateAssessmentStatus } from "../services/gradebook.service";

type Option = { label: string; value: string; levelId?: string; cycleId?: string; scale?: number };
const statusOptions: Array<{ label: string; value: GradeStatus }> = [
  { label: "Noté", value: "graded" },
  { label: "Absent", value: "absent" },
  { label: "Dispensé", value: "exempt" },
  { label: "Non noté", value: "missing" },
];

export function GradebookPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [periods, setPeriods] = useState<Option[]>([]);
  const [types, setTypes] = useState<Option[]>([]);
  const [workspaceClassId, setWorkspaceClassId] = useState(searchParams.get("class") ?? "");
  const [workspaceSubjectId, setWorkspaceSubjectId] = useState(searchParams.get("subject") ?? "");
  const [workspacePeriodId, setWorkspacePeriodId] = useState(searchParams.get("period") ?? "");
  const [selected, setSelected] = useState<Assessment | null>(null);
  const [rows, setRows] = useState<GradebookRow[]>([]);
  const [editing, setEditing] = useState<Assessment | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [scale, setScale] = useState(20);
  const editable = Boolean(year && !["closed", "archived"].includes(year.status));

  const loadWorkspace = useCallback(async () => {
    if (!year) return;
    const [assessmentRows, classesResult, subjectsResult, periodsResult, typesResult] = await Promise.all([
      listAssessments(year.id),
      supabase.from("school_classes").select("id,name,academic_year_level_id,academic_year_levels(cycle_id)").eq("academic_year_id", year.id).eq("is_active", true).order("name"),
      supabase.from("annual_subjects").select("id,subject_name_snapshot,academic_year_level_id").eq("academic_year_id", year.id).order("subject_name_snapshot"),
      supabase.from("academic_periods").select("id,name,cycle_id").eq("academic_year_id", year.id).order("sequence"),
      supabase.from("assessment_types").select("id,name,scale").eq("academic_year_id", year.id).eq("is_active", true).order("sort_order"),
    ]);
    setAllAssessments(assessmentRows);
    setClasses((classesResult.data ?? []).map((item: any) => ({ label: item.name, value: item.id, levelId: item.academic_year_level_id, cycleId: item.academic_year_levels?.cycle_id })));
    setSubjects((subjectsResult.data ?? []).map((item) => ({ label: item.subject_name_snapshot, value: item.id, levelId: item.academic_year_level_id })));
    setPeriods((periodsResult.data ?? []).map((item) => ({ label: item.name, value: item.id, cycleId: item.cycle_id })));
    setTypes((typesResult.data ?? []).map((item) => ({ label: item.name, value: item.id, scale: Number(item.scale) })));
  }, [year]);

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);

  const selectedClass = classes.find((item) => item.value === workspaceClassId);
  const filteredSubjects = subjects.filter((item) => !selectedClass || item.levelId === selectedClass.levelId);
  const filteredPeriods = periods.filter((item) => !selectedClass || item.cycleId === selectedClass.cycleId);
  const assessments = useMemo(() => allAssessments.filter((item) => item.class_id === workspaceClassId && item.annual_subject_id === workspaceSubjectId && item.academic_period_id === workspacePeriodId), [allAssessments, workspaceClassId, workspacePeriodId, workspaceSubjectId]);
  const contextReady = Boolean(workspaceClassId && workspaceSubjectId && workspacePeriodId);

  useEffect(() => {
    setSearchParams((current) => {
      workspaceClassId ? current.set("class", workspaceClassId) : current.delete("class");
      workspaceSubjectId ? current.set("subject", workspaceSubjectId) : current.delete("subject");
      workspacePeriodId ? current.set("period", workspacePeriodId) : current.delete("period");
      return current;
    }, { replace: true });
    setSelected(null);
  }, [setSearchParams, workspaceClassId, workspacePeriodId, workspaceSubjectId]);

  useEffect(() => {
    if (!selected) { setRows([]); return; }
    void loadGradebook(selected).then(setRows).catch((error) => notify({ severity: "error", summary: "Chargement impossible", detail: error.message }));
  }, [notify, selected]);

  useEffect(() => {
    if (editing === undefined) return;
    setTitle(editing?.title ?? "");
    setDescription(editing?.description ?? "");
    setClassId(editing?.class_id ?? workspaceClassId);
    setSubjectId(editing?.annual_subject_id ?? workspaceSubjectId);
    setPeriodId(editing?.academic_period_id ?? workspacePeriodId);
    setTypeId(editing?.assessment_type_id ?? "");
    setAssessmentDate(editing?.assessment_date ?? new Date().toISOString().slice(0, 10));
    setScale(editing?.scale ?? 20);
  }, [editing, workspaceClassId, workspacePeriodId, workspaceSubjectId]);

  const submitAssessment = async () => {
    if (!year || !title.trim() || !classId || !subjectId || !periodId || !typeId || scale <= 0) {
      notify({ severity: "warn", summary: "Évaluation incomplète", detail: "Renseignez tous les champs obligatoires." });
      return;
    }
    setSaving(true);
    try {
      const input: AssessmentInput = {
        title,
        description: description || null,
        class_id: classId,
        annual_subject_id: subjectId,
        academic_period_id: periodId,
        assessment_type_id: typeId,
        assessment_date: assessmentDate,
        scale,
        status: editing?.status ?? "draft",
      };
      await saveAssessment(institutionId, year.id, input, editing?.id);
      setEditing(undefined);
      await loadWorkspace();
      notify({ severity: "success", summary: "Évaluation enregistrée" });
    } catch (error) {
      notify({ severity: "error", summary: "Enregistrement impossible", detail: error instanceof Error ? error.message : "Erreur inconnue" });
    } finally { setSaving(false); }
  };

  const saveRows = async () => {
    if (!selected) return;
    const invalid = rows.find((row) => validateGradeEntry(row, selected.scale));
    if (invalid) {
      notify({ severity: "warn", summary: "Note invalide", detail: `${invalid.full_name} : ${validateGradeEntry(invalid, selected.scale)}` });
      return;
    }
    setSaving(true);
    try {
      await saveGradebook(selected.id, rows.map(normalizeGradeEntry));
      notify({ severity: "success", summary: `${rows.length} lignes enregistrées` });
    } catch (error) {
      notify({ severity: "error", summary: "Saisie impossible", detail: error instanceof Error ? error.message : "Erreur inconnue" });
    } finally { setSaving(false); }
  };

  const lockSelected = async () => {
    if (!selected) return;
    try {
      await updateAssessmentStatus(selected.id, "locked");
      setSelected({ ...selected, status: "locked" });
      await loadWorkspace();
      notify({ severity: "success", summary: "Évaluation verrouillée" });
    } catch (error) {
      notify({ severity: "error", summary: "Verrouillage impossible", detail: error instanceof Error ? error.message : "Erreur inconnue" });
    }
  };

  if (!year) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return <div className="space-y-4">
    <PageHeader title="Cahier de notes" description="Choisissez le cahier, sélectionnez une évaluation, puis saisissez directement dans la grille." meta={<Tag value={year.name} severity="info" />} />

    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-2 border-b border-slate-200 p-3 md:grid-cols-3">
        <Dropdown value={workspaceClassId} options={classes} placeholder="Classe" onChange={(event) => { setWorkspaceClassId(event.value); setWorkspaceSubjectId(""); setWorkspacePeriodId(""); }} />
        <Dropdown value={workspaceSubjectId} options={filteredSubjects} placeholder="Matière" disabled={!workspaceClassId} onChange={(event) => setWorkspaceSubjectId(event.value)} />
        <Dropdown value={workspacePeriodId} options={filteredPeriods} placeholder="Période" disabled={!workspaceClassId} onChange={(event) => setWorkspacePeriodId(event.value)} />
      </div>

      {!contextReady ? <div className="p-4"><Message severity="secondary" text="Choisissez une classe, une matière et une période pour ouvrir le cahier." /></div> : <>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
            {assessments.length === 0 ? <span className="text-sm text-slate-500">Aucune évaluation</span> : assessments.map((assessment) => (
              <Button
                key={assessment.id}
                label={`${assessment.title} · /${assessment.scale}`}
                icon={assessment.status === "locked" ? "pi pi-lock" : "pi pi-file-edit"}
                outlined={selected?.id !== assessment.id}
                size="small"
                onClick={() => setSelected(assessment)}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            <Button label="Nouvelle évaluation" icon="pi pi-plus" size="small" disabled={!editable} onClick={() => setEditing(null)} />
            <Button label="Modifier" icon="pi pi-pencil" size="small" outlined disabled={!selected || !editable || selected.status === "locked"} onClick={() => setEditing(selected)} />
            <Button label="Verrouiller" icon="pi pi-lock" size="small" outlined severity="secondary" disabled={!selected || !editable || selected.status === "locked"} onClick={() => void lockSelected()} />
            <Button label="Enregistrer" icon="pi pi-save" size="small" loading={saving} disabled={!selected || !editable || selected.status === "locked"} onClick={() => void saveRows()} />
          </div>
        </div>

        {!selected ? <div className="p-4"><Message severity="secondary" text="Créez ou sélectionnez une évaluation pour afficher les élèves." /></div> : <>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-sm">
            <strong>{selected.title}</strong>
            <Tag value={`/${selected.scale}`} severity="info" />
            <Tag value={selected.status === "locked" ? "Verrouillée" : "Saisie ouverte"} severity={selected.status === "locked" ? "success" : "warning"} />
            <span className="text-slate-500">{selected.assessment_date}</span>
          </div>
          <DataTable value={rows} dataKey="enrollment_id" size="small" scrollable scrollHeight="560px" emptyMessage="Aucun élève actif dans cette classe">
            <Column field="matricule" header="Matricule" frozen />
            <Column field="full_name" header="Élève" frozen />
            <Column header="Statut" body={(row: GradebookRow) => <Dropdown value={row.status} options={statusOptions} disabled={selected.status === "locked" || !editable} onChange={(event) => setRows((current) => current.map((item) => item.enrollment_id === row.enrollment_id ? { ...item, status: event.value, score: event.value === "graded" ? item.score : null } : item))} />} />
            <Column header={`Note /${selected.scale}`} body={(row: GradebookRow) => <InputNumber value={row.score} min={0} max={selected.scale} maxFractionDigits={2} disabled={row.status !== "graded" || selected.status === "locked" || !editable} onValueChange={(event) => setRows((current) => current.map((item) => item.enrollment_id === row.enrollment_id ? { ...item, score: event.value ?? null } : item))} />} />
            <Column header="Commentaire" body={(row: GradebookRow) => <InputText value={row.comment ?? ""} disabled={selected.status === "locked" || !editable} placeholder={gradeStatusLabel(row.status)} onChange={(event) => setRows((current) => current.map((item) => item.enrollment_id === row.enrollment_id ? { ...item, comment: event.target.value } : item))} />} />
          </DataTable>
        </>}
      </>}
    </section>

    <Dialog header={editing?.id ? "Modifier l’évaluation" : "Nouvelle évaluation"} visible={editing !== undefined} modal className="form-dialog form-dialog-wide" onHide={() => setEditing(undefined)}>
      <div className="form-grid">
        <div className="field field-wide"><label htmlFor="assessment-title">Titre</label><InputText id="assessment-title" value={title} onChange={(event) => setTitle(event.target.value)} /></div>
        <div className="field"><label>Classe</label><Dropdown value={classId} options={classes} disabled={Boolean(workspaceClassId)} onChange={(event) => setClassId(event.value)} /></div>
        <div className="field"><label>Matière</label><Dropdown value={subjectId} options={subjects.filter((item) => item.levelId === classes.find((option) => option.value === classId)?.levelId)} disabled={Boolean(workspaceSubjectId)} onChange={(event) => setSubjectId(event.value)} /></div>
        <div className="field"><label>Période</label><Dropdown value={periodId} options={periods.filter((item) => item.cycleId === classes.find((option) => option.value === classId)?.cycleId)} disabled={Boolean(workspacePeriodId)} onChange={(event) => setPeriodId(event.value)} /></div>
        <div className="field"><label>Type</label><Dropdown value={typeId} options={types} onChange={(event) => { setTypeId(event.value); setScale(types.find((item) => item.value === event.value)?.scale ?? 20); }} /></div>
        <div className="field"><label>Date</label><InputText type="date" value={assessmentDate} onChange={(event) => setAssessmentDate(event.target.value)} /></div>
        <div className="field"><label>Barème</label><InputNumber value={scale} min={1} max={1000} onValueChange={(event) => setScale(event.value ?? 20)} /></div>
        <div className="field field-wide"><label>Description</label><InputTextarea value={description} rows={3} onChange={(event) => setDescription(event.target.value)} /></div>
      </div>
      <div className="dialog-actions"><Button label="Annuler" severity="secondary" outlined onClick={() => setEditing(undefined)} /><Button label="Enregistrer" icon="pi pi-check" loading={saving} onClick={() => void submitAssessment()} /></div>
    </Dialog>
  </div>;
}
