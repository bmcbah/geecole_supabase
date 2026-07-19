import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Toolbar } from "primereact/toolbar";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useToast } from "../../../shared/components/toast-context";
import { supabase } from "../../../shared/lib/supabase/client";
import type { Assessment, AssessmentInput, GradebookRow, GradeStatus } from "../domain/gradebook";
import { gradeStatusLabel, normalizeGradeEntry, validateGradeEntry } from "../domain/gradebook";
import { listAssessments, loadGradebook, saveAssessment, saveGradebook, updateAssessmentStatus } from "../services/gradebook.service";

interface Option { label: string; value: string; meta?: Record<string, unknown> }
const statusOptions: Array<{ label: string; value: GradeStatus }> = [
  { label: "Noté", value: "graded" },
  { label: "Absent", value: "absent" },
  { label: "Dispensé", value: "exempt" },
  { label: "Non noté", value: "missing" },
];

export function GradebookPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [periods, setPeriods] = useState<Option[]>([]);
  const [types, setTypes] = useState<Option[]>([]);
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
      supabase.from("school_classes").select("id,name,academic_year_level_id").eq("academic_year_id", year.id).eq("is_active", true).order("name"),
      supabase.from("annual_subjects").select("id,subject_name_snapshot,academic_year_level_id").eq("academic_year_id", year.id).order("subject_name_snapshot"),
      supabase.from("academic_periods").select("id,name,cycle_id,starts_on,ends_on").eq("academic_year_id", year.id).order("sequence"),
      supabase.from("assessment_types").select("id,name,scale").eq("academic_year_id", year.id).eq("is_active", true).order("sort_order"),
    ]);
    setAssessments(assessmentRows);
    setClasses((classesResult.data ?? []).map((item) => ({ label: item.name, value: item.id, meta: { levelId: item.academic_year_level_id } })));
    setSubjects((subjectsResult.data ?? []).map((item) => ({ label: item.subject_name_snapshot, value: item.id, meta: { levelId: item.academic_year_level_id } })));
    setPeriods((periodsResult.data ?? []).map((item) => ({ label: item.name, value: item.id, meta: item })));
    setTypes((typesResult.data ?? []).map((item) => ({ label: item.name, value: item.id, meta: { scale: item.scale } })));
  }, [year]);

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);
  useEffect(() => {
    if (!selected) { setRows([]); return; }
    void loadGradebook(selected).then(setRows).catch((error) => notify({ severity: "error", summary: "Chargement impossible", detail: error.message }));
  }, [selected, notify]);
  useEffect(() => {
    if (editing === undefined) return;
    setTitle(editing?.title ?? "");
    setDescription(editing?.description ?? "");
    setClassId(editing?.class_id ?? "");
    setSubjectId(editing?.annual_subject_id ?? "");
    setPeriodId(editing?.academic_period_id ?? "");
    setTypeId(editing?.assessment_type_id ?? "");
    setAssessmentDate(editing?.assessment_date ?? new Date().toISOString().slice(0, 10));
    setScale(editing?.scale ?? 20);
  }, [editing]);

  const selectedClass = classes.find((item) => item.value === classId);
  const filteredSubjects = useMemo(() => subjects.filter((item) => !selectedClass || item.meta?.levelId === selectedClass.meta?.levelId), [subjects, selectedClass]);

  const submitAssessment = async () => {
    if (!year || !title.trim() || !classId || !subjectId || !periodId || !typeId || scale <= 0) {
      notify({ severity: "warn", summary: "Évaluation incomplète", detail: "Renseignez la classe, la matière, la période, le type, la date et le barème." });
      return;
    }
    setSaving(true);
    try {
      const input: AssessmentInput = {
        title, description: description || null, class_id: classId, annual_subject_id: subjectId,
        academic_period_id: periodId, assessment_type_id: typeId, assessment_date: assessmentDate,
        scale, status: editing?.status ?? "draft",
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

  const changeStatus = async (assessment: Assessment, status: Assessment["status"]) => {
    try {
      await updateAssessmentStatus(assessment.id, status);
      await loadWorkspace();
      if (selected?.id === assessment.id) setSelected({ ...assessment, status });
      notify({ severity: "success", summary: status === "locked" ? "Évaluation verrouillée" : "Statut mis à jour" });
    } catch (error) {
      notify({ severity: "error", summary: "Opération impossible", detail: error instanceof Error ? error.message : "Erreur inconnue" });
    }
  };

  if (!year) return <Message severity="warn" text="Sélectionnez une année scolaire avant d’ouvrir le cahier de notes." />;

  return <div className="space-y-4">
    <PageHeader title="Cahier de notes" description="Créez les évaluations et saisissez les notes de la classe dans une grille unique." meta={<Tag value={year.name} severity="info" />} />
    {!editable ? <Message severity="info" text="Cette année est clôturée : les évaluations restent consultables en lecture seule." /> : null}

    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <Toolbar className="rounded-none border-0 border-b border-slate-200" start={<strong>Évaluations</strong>} end={<Button label="Nouvelle évaluation" icon="pi pi-plus" disabled={!editable} onClick={() => setEditing(null)} />} />
      <DataTable value={assessments} dataKey="id" size="small" stripedRows selectionMode="single" selection={selected} onSelectionChange={(event) => setSelected(event.value as Assessment)} emptyMessage="Aucune évaluation">
        <Column field="assessment_date" header="Date" />
        <Column field="title" header="Évaluation" />
        <Column header="Barème" body={(row: Assessment) => `${row.scale} points`} />
        <Column header="Statut" body={(row: Assessment) => <Tag value={row.status} severity={row.status === "locked" ? "success" : row.status === "open" ? "info" : "secondary"} />} />
        <Column header="Actions" bodyClassName="text-right" body={(row: Assessment) => <div className="flex justify-end gap-1">
          <Button icon="pi pi-pencil" text size="small" disabled={!editable || row.status === "locked"} onClick={() => setEditing(row)} />
          {row.status !== "locked" ? <Button label="Verrouiller" icon="pi pi-lock" text size="small" disabled={!editable} onClick={() => void changeStatus(row, "locked")} /> : null}
        </div>} />
      </DataTable>
    </section>

    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <Toolbar className="rounded-none border-0 border-b border-slate-200" start={<div><strong>Saisie</strong>{selected ? <div className="text-xs text-slate-500">{selected.title} · /{selected.scale}</div> : null}</div>} end={<Button label="Enregistrer les notes" icon="pi pi-save" loading={saving} disabled={!selected || selected.status === "locked" || !editable} onClick={() => void saveRows()} />} />
      {!selected ? <div className="p-4"><Message severity="secondary" text="Sélectionnez une évaluation pour ouvrir la grille." /></div> :
      <DataTable value={rows} dataKey="enrollment_id" size="small" scrollable scrollHeight="520px" emptyMessage="Aucun élève actif dans cette classe">
        <Column field="matricule" header="Matricule" frozen />
        <Column field="full_name" header="Élève" frozen />
        <Column header="Statut" body={(row: GradebookRow) => <Dropdown value={row.status} options={statusOptions} disabled={selected.status === "locked" || !editable} onChange={(event) => setRows((current) => current.map((item) => item.enrollment_id === row.enrollment_id ? { ...item, status: event.value, score: event.value === "graded" ? item.score : null } : item))} />} />
        <Column header={`Note /${selected.scale}`} body={(row: GradebookRow) => <InputNumber value={row.score} min={0} max={selected.scale} maxFractionDigits={2} disabled={row.status !== "graded" || selected.status === "locked" || !editable} onValueChange={(event) => setRows((current) => current.map((item) => item.enrollment_id === row.enrollment_id ? { ...item, score: event.value ?? null } : item))} />} />
        <Column header="Commentaire" body={(row: GradebookRow) => <InputText value={row.comment ?? ""} disabled={selected.status === "locked" || !editable} placeholder={gradeStatusLabel(row.status)} onChange={(event) => setRows((current) => current.map((item) => item.enrollment_id === row.enrollment_id ? { ...item, comment: event.target.value } : item))} />} />
      </DataTable>}
    </section>

    <Dialog header={editing?.id ? "Modifier l’évaluation" : "Nouvelle évaluation"} visible={editing !== undefined} modal className="form-dialog form-dialog-wide" onHide={() => setEditing(undefined)}>
      <div className="form-grid">
        <div className="field field-wide"><label htmlFor="assessment-title">Titre</label><InputText id="assessment-title" value={title} onChange={(event) => setTitle(event.target.value)} /></div>
        <div className="field"><label htmlFor="assessment-class">Classe</label><Dropdown inputId="assessment-class" value={classId} options={classes} onChange={(event) => { setClassId(event.value); setSubjectId(""); }} /></div>
        <div className="field"><label htmlFor="assessment-subject">Matière</label><Dropdown inputId="assessment-subject" value={subjectId} options={filteredSubjects} disabled={!classId} onChange={(event) => setSubjectId(event.value)} /></div>
        <div className="field"><label htmlFor="assessment-period">Période</label><Dropdown inputId="assessment-period" value={periodId} options={periods} onChange={(event) => setPeriodId(event.value)} /></div>
        <div className="field"><label htmlFor="assessment-type">Type</label><Dropdown inputId="assessment-type" value={typeId} options={types} onChange={(event) => { setTypeId(event.value); const option = types.find((item) => item.value === event.value); setScale(Number(option?.meta?.scale ?? 20)); }} /></div>
        <div className="field"><label htmlFor="assessment-date">Date</label><InputText id="assessment-date" type="date" value={assessmentDate} onChange={(event) => setAssessmentDate(event.target.value)} /></div>
        <div className="field"><label htmlFor="assessment-scale">Barème</label><InputNumber inputId="assessment-scale" value={scale} min={1} max={1000} onValueChange={(event) => setScale(event.value ?? 20)} /></div>
        <div className="field field-wide"><label htmlFor="assessment-description">Description</label><InputTextarea id="assessment-description" value={description} rows={3} onChange={(event) => setDescription(event.target.value)} /></div>
      </div>
      <div className="dialog-actions"><Button label="Annuler" severity="secondary" outlined onClick={() => setEditing(undefined)} /><Button label="Enregistrer" icon="pi pi-check" loading={saving} onClick={() => void submitAssessment()} /></div>
    </Dialog>
  </div>;
}
