import { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { Toolbar } from "primereact/toolbar";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useToast } from "../../../shared/components/toast-context";
import { supabase } from "../../../shared/lib/supabase/client";
import type { GradingFormula } from "../../settings/domain/grading-formula";
import { calculateResolvedFormula, type EvaluationScore } from "../../settings/domain/grading-formula-resolution";
import { upsertPeriodSubjectResults } from "../services/notes-module.service";

type Option = { label: string; value: string; levelId?: string; cycleId?: string };
type ResultRow = { enrollment_id: string; matricule: string; full_name: string; result: number | null; variables: Record<string, number | null>; formula: GradingFormula | null; blocked: boolean; error?: string; comment: string };

export function PeriodResultsPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [periods, setPeriods] = useState<Option[]>([]);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!year) return;
    void Promise.all([
      supabase.from("school_classes").select("id,name,academic_year_level_id,academic_year_levels(cycle_id)").eq("academic_year_id", year.id).eq("is_active", true).order("name"),
      supabase.from("annual_subjects").select("id,subject_name_snapshot,academic_year_level_id").eq("academic_year_id", year.id).order("subject_name_snapshot"),
      supabase.from("academic_periods").select("id,name,cycle_id").eq("academic_year_id", year.id).order("sequence"),
    ]).then(([classResult, subjectResult, periodResult]) => {
      setClasses((classResult.data ?? []).map((item: any) => ({ label: item.name, value: item.id, levelId: item.academic_year_level_id, cycleId: item.academic_year_levels?.cycle_id })));
      setSubjects((subjectResult.data ?? []).map((item) => ({ label: item.subject_name_snapshot, value: item.id, levelId: item.academic_year_level_id })));
      setPeriods((periodResult.data ?? []).map((item) => ({ label: item.name, value: item.id, cycleId: item.cycle_id })));
    });
  }, [year]);

  const selectedClass = classes.find((item) => item.value === classId);
  const availableSubjects = subjects.filter((item) => !selectedClass || item.levelId === selectedClass.levelId);
  const availablePeriods = periods.filter((item) => !selectedClass || item.cycleId === selectedClass.cycleId);

  const calculate = useCallback(async () => {
    if (!year || !selectedClass || !subjectId || !periodId) { setRows([]); return; }
    const [{ data: assignments, error: assignmentError }, { data: formulas, error: formulaError }, { data: assessments, error: assessmentError }] = await Promise.all([
      supabase.from("class_assignments").select("enrollment_id,enrollments!inner(students!inner(matricule,first_name,last_name))").eq("class_id", classId).is("ends_on", null),
      supabase.from("grading_formulas").select("*").eq("academic_year_id", year.id).eq("is_active", true),
      supabase.from("assessments").select("id,scale,assessment_types(code)").eq("class_id", classId).eq("annual_subject_id", subjectId).eq("academic_period_id", periodId).in("status", ["open", "locked"]),
    ]);
    if (assignmentError || formulaError || assessmentError) throw assignmentError ?? formulaError ?? assessmentError;
    const assessmentIds = (assessments ?? []).map((item) => item.id);
    const { data: grades, error: gradeError } = assessmentIds.length
      ? await supabase.from("student_grades").select("assessment_id,enrollment_id,status,score").in("assessment_id", assessmentIds)
      : { data: [], error: null };
    if (gradeError) throw gradeError;
    const assessmentById = new Map((assessments ?? []).map((item: any) => [item.id, item]));
    const scoresByEnrollment = new Map<string, EvaluationScore[]>();
    for (const grade of grades ?? []) {
      const assessment: any = assessmentById.get(grade.assessment_id);
      scoresByEnrollment.set(grade.enrollment_id, [...(scoresByEnrollment.get(grade.enrollment_id) ?? []), { assessment_type_code: assessment?.assessment_types?.code ?? "", score: grade.score === null ? null : Number(grade.score), scale: Number(assessment?.scale ?? 20), status: grade.status }]);
    }
    setRows((assignments ?? []).map((assignment: any) => {
      const calculation = calculateResolvedFormula(formulas as unknown as GradingFormula[], { academic_year_id: year.id, academic_year_cycle_id: selectedClass.cycleId ?? null, academic_year_level_id: selectedClass.levelId ?? null, annual_subject_id: subjectId, period_id: periodId }, scoresByEnrollment.get(assignment.enrollment_id) ?? []);
      const student = assignment.enrollments.students;
      return { enrollment_id: assignment.enrollment_id, matricule: student.matricule, full_name: `${student.last_name} ${student.first_name}`.trim(), result: calculation.result, variables: calculation.variables, formula: calculation.formula, blocked: calculation.blocked, error: calculation.error, comment: "" };
    }));
  }, [classId, periodId, selectedClass, subjectId, year]);

  useEffect(() => { void calculate(); }, [calculate]);

  const save = async (status: "calculated" | "validated") => {
    if (!year || !selectedClass || !subjectId || !periodId) return;
    const blocked = rows.find((row) => row.blocked || row.result === null || !row.formula);
    if (blocked) { notify({ severity: "warn", summary: "Calcul incomplet", detail: `${blocked.full_name} : ${blocked.error ?? "résultat indisponible"}` }); return; }
    setSaving(true);
    try {
      await upsertPeriodSubjectResults(rows.map((row) => ({ institution_id: institutionId, academic_year_id: year.id, academic_period_id: periodId, class_id: classId, annual_subject_id: subjectId, enrollment_id: row.enrollment_id, grading_formula_id: row.formula!.id, grading_formula_version: row.formula!.version, variables: row.variables, result: row.result, status, teacher_comment: row.comment || null })));
      notify({ severity: "success", summary: status === "validated" ? "Résultats validés" : "Calculs enregistrés" });
    } catch (error) { notify({ severity: "error", summary: "Enregistrement impossible", detail: error instanceof Error ? error.message : "Erreur inconnue" }); }
    finally { setSaving(false); }
  };

  if (!year) return <Message severity="warn" text="Sélectionnez une année scolaire." />;
  return <div className="space-y-4">
    <PageHeader title="Résultats de période" description="Transformez les notes du cahier en moyennes matière grâce aux formules configurées par l’établissement." meta={<Tag value={year.name} severity="info" />} />
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <Toolbar className="rounded-none border-0 border-b border-slate-200" start={<div className="flex flex-wrap gap-2"><Dropdown value={classId} options={classes} placeholder="Classe" onChange={(event) => { setClassId(event.value); setSubjectId(""); setPeriodId(""); }} /><Dropdown value={subjectId} options={availableSubjects} placeholder="Matière" disabled={!classId} onChange={(event) => setSubjectId(event.value)} /><Dropdown value={periodId} options={availablePeriods} placeholder="Période" disabled={!classId} onChange={(event) => setPeriodId(event.value)} /></div>} end={<div className="flex gap-2"><Button label="Recalculer" icon="pi pi-refresh" outlined disabled={!classId || !subjectId || !periodId} onClick={() => void calculate()} /><Button label="Valider" icon="pi pi-check" loading={saving} disabled={!rows.length} onClick={() => void save("validated")} /></div>} />
      {!classId || !subjectId || !periodId ? <div className="p-4"><Message severity="secondary" text="Choisissez la classe, la matière et la période." /></div> : <DataTable value={rows} dataKey="enrollment_id" size="small" scrollable scrollHeight="560px" emptyMessage="Aucun élève">
        <Column field="matricule" header="Matricule" frozen />
        <Column field="full_name" header="Élève" frozen />
        <Column header="Variables" body={(row: ResultRow) => Object.entries(row.variables).map(([code, value]) => `${code}: ${value === null ? "—" : value.toFixed(2)}`).join(" · ")} />
        <Column header="Formule" body={(row: ResultRow) => row.formula ? `${row.formula.name} v${row.formula.version}` : <Tag value="Formule absente" severity="danger" />} />
        <Column header="Résultat /20" body={(row: ResultRow) => row.result === null ? <Tag value="Bloqué" severity="warning" /> : row.result.toFixed(2)} />
        <Column header="Appréciation" body={(row: ResultRow) => <InputText value={row.comment} onChange={(event) => setRows((current) => current.map((item) => item.enrollment_id === row.enrollment_id ? { ...item, comment: event.target.value } : item))} />} />
      </DataTable>}
    </section>
  </div>;
}
