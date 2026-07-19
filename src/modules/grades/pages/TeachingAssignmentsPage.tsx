import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { Toolbar } from "primereact/toolbar";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useToast } from "../../../shared/components/toast-context";
import { supabase } from "../../../shared/lib/supabase/client";
import { deleteTeachingAssignment, listTeachers, listTeachingAssignments, saveTeachingAssignment, type TeachingAssignment } from "../services/notes-module.service";

type Option = { label: string; value: string; levelId?: string };

export function TeachingAssignmentsPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [items, setItems] = useState<TeachingAssignment[]>([]);
  const [teachers, setTeachers] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [editing, setEditing] = useState<TeachingAssignment | null | undefined>(undefined);
  const [teacherId, setTeacherId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!year) return;
    const [assignments, teacherRows, classesResult, subjectsResult] = await Promise.all([
      listTeachingAssignments(year.id),
      listTeachers(institutionId, year.id),
      supabase.from("school_classes").select("id,name,academic_year_level_id").eq("academic_year_id", year.id).eq("is_active", true).order("name"),
      supabase.from("annual_subjects").select("id,subject_name_snapshot,academic_year_level_id").eq("academic_year_id", year.id).order("subject_name_snapshot"),
    ]);
    setItems(assignments);
    setTeachers(teacherRows.map((teacher) => ({ label: `${teacher.first_name} ${teacher.last_name}${teacher.specialty ? ` · ${teacher.specialty}` : ""}`, value: teacher.teacher_user_id })));
    setClasses((classesResult.data ?? []).map((item) => ({ label: item.name, value: item.id, levelId: item.academic_year_level_id })));
    setSubjects((subjectsResult.data ?? []).map((item) => ({ label: item.subject_name_snapshot, value: item.id, levelId: item.academic_year_level_id })));
  }, [institutionId, year]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (editing === undefined) return;
    setTeacherId(editing?.teacher_user_id ?? "");
    setClassId(editing?.class_id ?? "");
    setSubjectId(editing?.annual_subject_id ?? "");
    setStartsOn(editing?.starts_on ?? "");
    setEndsOn(editing?.ends_on ?? "");
  }, [editing]);

  const selectedClass = classes.find((item) => item.value === classId);
  const filteredSubjects = useMemo(() => subjects.filter((item) => !selectedClass || item.levelId === selectedClass.levelId), [selectedClass, subjects]);
  const labelOf = (options: Option[], value: string) => options.find((item) => item.value === value)?.label ?? value;

  const submit = async () => {
    if (!year || !teacherId || !classId || !subjectId) {
      notify({ severity: "warn", summary: "Affectation incomplète", detail: "Choisissez un enseignant, une classe et une matière." });
      return;
    }
    setSaving(true);
    try {
      await saveTeachingAssignment(institutionId, year.id, {
        teacher_user_id: teacherId,
        class_id: classId,
        annual_subject_id: subjectId,
        starts_on: startsOn || null,
        ends_on: endsOn || null,
        is_active: editing?.is_active ?? true,
      }, editing?.id);
      setEditing(undefined);
      await load();
      notify({ severity: "success", summary: "Affectation enregistrée" });
    } catch (error) {
      notify({ severity: "error", summary: "Enregistrement impossible", detail: error instanceof Error ? error.message : "Erreur inconnue" });
    } finally { setSaving(false); }
  };

  if (!year) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return <div className="space-y-4">
    <PageHeader title="Affectations pédagogiques" description="Affectez uniquement les enseignants disposant d’un profil annuel actif." meta={<Tag value={year.name} severity="info" />} />
    {teachers.length === 0 ? <Message severity="warn" text="Créez d’abord au moins un profil dans Notes et bulletins → Enseignants." /> : null}
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <Toolbar className="rounded-none border-0 border-b border-slate-200" start={<strong>{items.length} affectation(s)</strong>} end={<Button label="Nouvelle affectation" icon="pi pi-plus" disabled={teachers.length === 0} onClick={() => setEditing(null)} />} />
      <DataTable value={items} dataKey="id" size="small" stripedRows emptyMessage="Aucune affectation pédagogique">
        <Column header="Enseignant" body={(row: TeachingAssignment) => labelOf(teachers, row.teacher_user_id)} />
        <Column header="Classe" body={(row: TeachingAssignment) => labelOf(classes, row.class_id)} />
        <Column header="Matière" body={(row: TeachingAssignment) => labelOf(subjects, row.annual_subject_id)} />
        <Column header="Période d’activité" body={(row: TeachingAssignment) => `${row.starts_on ?? "Début d’année"} → ${row.ends_on ?? "Fin d’année"}`} />
        <Column header="Statut" body={(row: TeachingAssignment) => <Tag value={row.is_active ? "Active" : "Inactive"} severity={row.is_active ? "success" : "secondary"} />} />
        <Column header="Actions" bodyClassName="text-right" body={(row: TeachingAssignment) => <div className="flex justify-end gap-1"><Button icon="pi pi-pencil" text onClick={() => setEditing(row)} /><Button icon="pi pi-trash" text severity="danger" onClick={() => void deleteTeachingAssignment(row.id).then(load)} /></div>} />
      </DataTable>
    </section>
    <Dialog header={editing?.id ? "Modifier l’affectation" : "Nouvelle affectation"} visible={editing !== undefined} modal className="form-dialog" onHide={() => setEditing(undefined)}>
      <div className="form-grid">
        <div className="field field-wide"><label htmlFor="teacher">Enseignant</label><Dropdown inputId="teacher" value={teacherId} options={teachers} filter onChange={(event) => setTeacherId(event.value)} /></div>
        <div className="field"><label htmlFor="class">Classe</label><Dropdown inputId="class" value={classId} options={classes} onChange={(event) => { setClassId(event.value); setSubjectId(""); }} /></div>
        <div className="field"><label htmlFor="subject">Matière</label><Dropdown inputId="subject" value={subjectId} options={filteredSubjects} disabled={!classId} onChange={(event) => setSubjectId(event.value)} /></div>
        <div className="field"><label htmlFor="starts">Début facultatif</label><InputText id="starts" type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} /></div>
        <div className="field"><label htmlFor="ends">Fin facultative</label><InputText id="ends" type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} /></div>
      </div>
      <div className="dialog-actions"><Button label="Annuler" severity="secondary" outlined onClick={() => setEditing(undefined)} /><Button label="Enregistrer" icon="pi pi-check" loading={saving} onClick={() => void submit()} /></div>
    </Dialog>
  </div>;
}
