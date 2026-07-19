import { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { Toolbar } from "primereact/toolbar";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useToast } from "../../../shared/components/toast-context";
import { supabase } from "../../../shared/lib/supabase/client";
import { saveDeliberations } from "../services/notes-module.service";

type Option = { label: string; value: string };
type Decision = "pending" | "admitted" | "repeat" | "excluded" | "conditional";
type Row = { enrollment_id: string; matricule: string; full_name: string; general_average: number | null; rank: number | null; decision: Decision; mention: string; council_comment: string };

const decisions = [
  { label: "En attente", value: "pending" },
  { label: "Admis(e)", value: "admitted" },
  { label: "Redoublement", value: "repeat" },
  { label: "Exclusion", value: "excluded" },
  { label: "Admission conditionnelle", value: "conditional" },
];

export function DeliberationsPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [classes, setClasses] = useState<Option[]>([]);
  const [periods, setPeriods] = useState<Option[]>([]);
  const [classId, setClassId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!year) return;
    void Promise.all([
      supabase.from("school_classes").select("id,name").eq("academic_year_id", year.id).eq("is_active", true).order("name"),
      supabase.from("academic_periods").select("id,name").eq("academic_year_id", year.id).order("sequence"),
    ]).then(([classResult, periodResult]) => {
      setClasses((classResult.data ?? []).map((item) => ({ label: item.name, value: item.id })));
      setPeriods((periodResult.data ?? []).map((item) => ({ label: item.name, value: item.id })));
    });
  }, [year]);

  const load = useCallback(async () => {
    if (!classId || !periodId) { setRows([]); return; }
    const [{ data: assignments, error: assignmentError }, { data: results, error: resultError }, { data: existing, error: deliberationError }] = await Promise.all([
      supabase.from("class_assignments").select("enrollment_id,enrollments!inner(students!inner(matricule,first_name,last_name))").eq("class_id", classId).is("ends_on", null),
      supabase.from("period_subject_results").select("enrollment_id,result").eq("class_id", classId).eq("academic_period_id", periodId).eq("status", "validated"),
      supabase.from("deliberations").select("*").eq("class_id", classId).eq("academic_period_id", periodId),
    ]);
    if (assignmentError || resultError || deliberationError) throw assignmentError ?? resultError ?? deliberationError;
    const byEnrollment = new Map<string, number[]>();
    for (const result of results ?? []) if (result.result !== null) byEnrollment.set(result.enrollment_id, [...(byEnrollment.get(result.enrollment_id) ?? []), Number(result.result)]);
    const existingByEnrollment = new Map((existing ?? []).map((item) => [item.enrollment_id, item]));
    const calculated = (assignments ?? []).map((assignment: any) => {
      const values = byEnrollment.get(assignment.enrollment_id) ?? [];
      const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
      const saved: any = existingByEnrollment.get(assignment.enrollment_id);
      const student = assignment.enrollments.students;
      return { enrollment_id: assignment.enrollment_id, matricule: student.matricule, full_name: `${student.last_name} ${student.first_name}`.trim(), general_average: saved?.general_average ?? average, rank: saved?.rank ?? null, decision: saved?.decision ?? "pending", mention: saved?.mention ?? "", council_comment: saved?.council_comment ?? "" } as Row;
    });
    const ranked = [...calculated].sort((a, b) => (b.general_average ?? -1) - (a.general_average ?? -1)).map((row, index) => ({ ...row, rank: row.general_average === null ? null : index + 1 }));
    setRows(ranked);
  }, [classId, periodId]);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!year || !classId || !periodId) return;
    setSaving(true);
    try {
      await saveDeliberations(rows.map((row) => ({ institution_id: institutionId, academic_year_id: year.id, academic_period_id: periodId, class_id: classId, enrollment_id: row.enrollment_id, general_average: row.general_average, rank: row.rank, decision: row.decision, mention: row.mention || null, council_comment: row.council_comment || null, decided_at: row.decision === "pending" ? null : new Date().toISOString() })) as Record<string, unknown>[]);
      notify({ severity: "success", summary: "Délibération enregistrée" });
    } catch (error) { notify({ severity: "error", summary: "Enregistrement impossible", detail: error instanceof Error ? error.message : "Erreur inconnue" }); }
    finally { setSaving(false); }
  };

  if (!year) return <Message severity="warn" text="Sélectionnez une année scolaire." />;
  return <div className="space-y-4">
    <PageHeader title="Délibérations" description="Examinez les moyennes validées, classez les élèves et consignez les décisions du conseil." meta={<Tag value={year.name} severity="info" />} />
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <Toolbar className="rounded-none border-0 border-b border-slate-200" start={<div className="flex gap-2"><Dropdown value={classId} options={classes} placeholder="Classe" onChange={(event) => setClassId(event.value)} /><Dropdown value={periodId} options={periods} placeholder="Période" onChange={(event) => setPeriodId(event.value)} /></div>} end={<Button label="Enregistrer les décisions" icon="pi pi-save" loading={saving} disabled={!classId || !periodId || !rows.length} onClick={() => void save()} />} />
      {!classId || !periodId ? <div className="p-4"><Message severity="secondary" text="Choisissez une classe et une période." /></div> : <DataTable value={rows} dataKey="enrollment_id" size="small" scrollable scrollHeight="560px" emptyMessage="Aucun élève">
        <Column field="rank" header="Rang" />
        <Column field="matricule" header="Matricule" frozen />
        <Column field="full_name" header="Élève" frozen />
        <Column header="Moyenne" body={(row: Row) => <InputNumber value={row.general_average} min={0} max={20} maxFractionDigits={2} onValueChange={(event) => setRows((current) => current.map((item) => item.enrollment_id === row.enrollment_id ? { ...item, general_average: event.value ?? null } : item))} />} />
        <Column header="Décision" body={(row: Row) => <Dropdown value={row.decision} options={decisions} onChange={(event) => setRows((current) => current.map((item) => item.enrollment_id === row.enrollment_id ? { ...item, decision: event.value } : item))} />} />
        <Column header="Mention" body={(row: Row) => <InputText value={row.mention} onChange={(event) => setRows((current) => current.map((item) => item.enrollment_id === row.enrollment_id ? { ...item, mention: event.target.value } : item))} />} />
        <Column header="Avis du conseil" body={(row: Row) => <InputText value={row.council_comment} onChange={(event) => setRows((current) => current.map((item) => item.enrollment_id === row.enrollment_id ? { ...item, council_comment: event.target.value } : item))} />} />
      </DataTable>}
    </section>
  </div>;
}
