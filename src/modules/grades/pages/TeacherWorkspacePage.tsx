import { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useNavigate } from "react-router-dom";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { supabase } from "../../../shared/lib/supabase/client";
import { listMyTeachingAssignments, type TeachingAssignment } from "../services/notes-module.service";

type AssignmentView = TeachingAssignment & { className: string; subjectName: string };

export function TeacherWorkspacePage() {
  const { year } = useAcademicSession();
  const navigate = useNavigate();
  const [items, setItems] = useState<AssignmentView[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!year) return;
    setLoading(true);
    const assignments = await listMyTeachingAssignments(year.id);
    const classIds = [...new Set(assignments.map((item) => item.class_id))];
    const subjectIds = [...new Set(assignments.map((item) => item.annual_subject_id))];
    const [classesResult, subjectsResult] = await Promise.all([
      classIds.length ? supabase.from("school_classes").select("id,name").in("id", classIds) : Promise.resolve({ data: [] }),
      subjectIds.length ? supabase.from("annual_subjects").select("id,subject_name_snapshot").in("id", subjectIds) : Promise.resolve({ data: [] }),
    ]);
    const classes = new Map((classesResult.data ?? []).map((item) => [item.id, item.name]));
    const subjects = new Map((subjectsResult.data ?? []).map((item) => [item.id, item.subject_name_snapshot]));
    setItems(assignments.map((item) => ({ ...item, className: classes.get(item.class_id) ?? "Classe", subjectName: subjects.get(item.annual_subject_id) ?? "Matière" })));
    setLoading(false);
  }, [year]);

  useEffect(() => { void load(); }, [load]);
  if (!year) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return <div className="space-y-4">
    <PageHeader title="Mes classes" description="Choisissez une classe et une matière pour ouvrir le cahier de notes correspondant." meta={<Tag value={year.name} severity="info" />} />
    {loading ? <Message severity="secondary" text="Chargement de vos affectations…" /> : items.length === 0 ? <Message severity="warn" text="Aucune affectation pédagogique active. La direction doit d’abord vous affecter à une classe et une matière." /> :
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => <section key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.className}</div><h2 className="mt-1 text-lg font-semibold text-slate-900">{item.subjectName}</h2></div><i className="pi pi-book text-xl text-slate-400" /></div>
          <p className="mt-3 text-sm text-slate-500">Évaluations, saisie des notes, commentaires et calculs de période.</p>
          <Button className="mt-4" label="Ouvrir le cahier" icon="pi pi-arrow-right" iconPos="right" onClick={() => navigate(`/notes/cahier?class=${item.class_id}&subject=${item.annual_subject_id}`)} />
        </section>)}
      </div>}
  </div>;
}
