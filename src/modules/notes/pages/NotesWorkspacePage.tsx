import { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { Tag } from "primereact/tag";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { MetricIcon } from "../../../shared/components/data-display/MetricIcon";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { listAcademicPeriods } from "../../settings/services/academic-structure.service";
import type { Database } from "../../../shared/lib/supabase/database.types";
import type { CourseSummary, GradebookStudent, NoteResultStatus } from "../domain/notes";
import { noteResultStatusLabels } from "../domain/notes";
import { createGradebookNote, listActiveNoteTypes, listClassStudents, listCourseAudit, listCourseNotes, listCourseSummaries, listNoteResults, publishCourseNotes, saveNoteResult } from "../services/notes.service";

type Period = Database["public"]["Tables"]["academic_periods"]["Row"];
type GradebookNote = Database["public"]["Tables"]["gradebook_notes"]["Row"];
type NoteResult = Database["public"]["Tables"]["note_results"]["Row"];
type NoteType = Database["public"]["Tables"]["assessment_types"]["Row"];
export function NotesWorkspacePage() {
  const { institutionId, yearId, year } = useAcademicSession();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseSummary>();
  const [periodId, setPeriodId] = useState<string>();
  const [students, setStudents] = useState<GradebookStudent[]>([]);
  const [notes, setNotes] = useState<GradebookNote[]>([]);
  const [results, setResults] = useState<NoteResult[]>([]);
  const [noteTypes, setNoteTypes] = useState<NoteType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [noteDialog, setNoteDialog] = useState(false);
  const [draft, setDraft] = useState({ label: "", code: "", noteTypeId: "", noteDate: new Date().toISOString().slice(0, 10) });

  const loadFoundation = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true); setError(undefined);
    try {
      const [courseData, periodData, typeData] = await Promise.all([listCourseSummaries(institutionId, yearId), listAcademicPeriods(yearId), listActiveNoteTypes(institutionId, yearId)]);
      setCourses(courseData); setPeriods(periodData); setNoteTypes(typeData);
      setSelectedCourse((current) => current ?? courseData[0]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Impossible de charger le module Notes."); }
    finally { setLoading(false); }
  }, [institutionId, yearId]);

  const loadGradebook = useCallback(async () => {
    if (!selectedCourse || !periodId || !yearId) { setStudents([]); setNotes([]); setResults([]); return; }
    try {
      const [studentData, noteData] = await Promise.all([listClassStudents(selectedCourse.classId), listCourseNotes(yearId, periodId, selectedCourse)]);
      setStudents(studentData); setNotes(noteData); setResults(await listNoteResults(noteData.map((note) => note.id)));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Impossible de charger le cahier."); }
  }, [periodId, selectedCourse, yearId]);

  useEffect(() => { void loadFoundation(); }, [loadFoundation]);
  useEffect(() => { void loadGradebook(); }, [loadGradebook]);
  useEffect(() => {
    if (!selectedCourse) { setPeriodId(undefined); return; }
    const cyclePeriods = periods.filter((period) => period.cycle_id === selectedCourse.cycleId && (!selectedCourse.allowedPeriodIds.length || selectedCourse.allowedPeriodIds.includes(period.id)));
    setPeriodId(cyclePeriods.find((period) => period.status === "open")?.id ?? cyclePeriods[0]?.id);
  }, [periods, selectedCourse]);

  const postponed = results.filter((result) => result.status === "postponed").length;
  const filled = results.length;
  const expected = students.length * notes.length;
  const completion = expected ? Math.round((filled / expected) * 100) : 0;
  const resultFor = (noteId: string, studentId: string) => results.find((result) => result.note_id === noteId && result.student_id === studentId);

  async function handleCreateNote() {
    if (!institutionId || !yearId || !periodId || !selectedCourse || !draft.noteTypeId) return;
    try {
      await createGradebookNote({ institutionId, yearId, periodId, course: selectedCourse, noteTypeId: draft.noteTypeId, label: draft.label, code: draft.code, noteDate: draft.noteDate });
      setNoteDialog(false); setDraft({ label: "", code: "", noteTypeId: "", noteDate: new Date().toISOString().slice(0, 10) });
      await loadGradebook();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Création impossible."); }
  }

  async function updateResult(noteId: string, studentId: string, raw: string) {
    if (!institutionId || !raw.trim()) return;
    const status = raw.startsWith("status:") ? raw.replace("status:", "") as NoteResultStatus : null;
    const value = status ? null : Number(raw.replace(",", "."));
    if (!status && !Number.isFinite(value)) return;
    try { await saveNoteResult({ institutionId, noteId, studentId, value, status }); await loadGradebook(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Saisie impossible."); }
  }

  if (!year) return <Message severity="warn" text="Sélectionnez une année scolaire pour ouvrir Notes & Bulletins." />;
  if (loading) return <div className="grid min-h-[50vh] place-items-center"><ProgressSpinner aria-label="Chargement du module Notes" /></div>;

  return <div className="space-y-4 pb-8">
    <PageHeader eyebrow="Notes & Bulletins" title="Cahiers de notes" description={`Saisissez et publiez les résultats par cours · ${year.name}`} meta={<Tag value={periods.find((period) => period.id === periodId)?.name ?? "Aucune période"} severity="info" />} />
    {error ? <Message severity="error" text={error} /> : null}
    <Gradebook courses={courses} selectedCourse={selectedCourse} onCourse={setSelectedCourse} period={periods.find((item) => item.id === periodId)} students={students} notes={notes} results={results} resultFor={resultFor} completion={completion} postponed={postponed} onAdd={() => setNoteDialog(true)} onResult={(noteId, studentId, value) => { void updateResult(noteId, studentId, value); }} onReload={loadGradebook} institutionId={institutionId} />

    <Dialog header="Ajouter une note" visible={noteDialog} modal className="w-[min(94vw,34rem)]" onHide={() => setNoteDialog(false)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field sm:col-span-2"><span>Libellé</span><InputText value={draft.label} onChange={(event) => setDraft((value) => ({ ...value, label: event.target.value }))} placeholder="Devoir surveillé 1" /></label>
        <label className="field"><span>Code unique</span><InputText value={draft.code} onChange={(event) => setDraft((value) => ({ ...value, code: event.target.value }))} placeholder="DS1" /></label>
        <label className="field"><span>Date</span><InputText type="date" value={draft.noteDate} onChange={(event) => setDraft((value) => ({ ...value, noteDate: event.target.value }))} /></label>
        <label className="field sm:col-span-2"><span>Type de note</span><Dropdown value={draft.noteTypeId} options={noteTypes.map((type) => ({ label: `${type.name} · /${type.scale}`, value: type.id }))} onChange={(event) => { const selected: unknown = event.value; if (typeof selected === "string") setDraft((value) => ({ ...value, noteTypeId: selected })); }} placeholder="Choisir un type" className="w-full" /></label>
      </div>
      <div className="mt-5 flex justify-end gap-2"><Button label="Annuler" severity="secondary" outlined onClick={() => setNoteDialog(false)} /><Button label="Créer la note" icon="pi pi-plus" disabled={!draft.label.trim() || !draft.code.trim() || !draft.noteTypeId} onClick={() => void handleCreateNote()} /></div>
    </Dialog>
  </div>;
}

function Gradebook(props: { courses: CourseSummary[]; selectedCourse?: CourseSummary; onCourse: (course: CourseSummary) => void; period?: Period; students: GradebookStudent[]; notes: GradebookNote[]; results: NoteResult[]; resultFor: (noteId: string, studentId: string) => NoteResult | undefined; completion: number; postponed: number; onAdd: () => void; onResult: (noteId: string, studentId: string, value: string) => void; onReload: () => Promise<void>; institutionId: string }) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkNoteId, setBulkNoteId] = useState("");
  const [bulkStatus, setBulkStatus] = useState<NoteResultStatus>("absent");
  const [auditOpen, setAuditOpen] = useState(false);
  const [audit, setAudit] = useState<Database["public"]["Tables"]["notes_audit_log"]["Row"][]>([]);
  const allSelected = props.students.length > 0 && selectedStudents.length === props.students.length;
  async function applyBulkStatus() {
    if (!bulkNoteId) return;
    await Promise.all(selectedStudents.map((studentId) => saveNoteResult({ institutionId: props.institutionId, noteId: bulkNoteId, studentId, status: bulkStatus })));
    setBulkOpen(false); setSelectedStudents([]); await props.onReload();
  }
  async function publish() { await publishCourseNotes(props.notes.map((note) => note.id)); await props.onReload(); }
  async function openAudit() { setAudit(await listCourseAudit(props.notes.map((note) => note.id))); setAuditOpen(true); }
  return <section className="grid min-h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:grid-cols-[270px_minmax(0,1fr)]">
    <aside className="border-b border-slate-200 bg-slate-50/70 p-3 xl:border-b-0 xl:border-r"><div className="mb-3 rounded-lg border border-slate-200 bg-white p-2.5"><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Période du cycle</span><strong className="mt-1 block text-sm text-slate-800">{props.period?.name ?? "Aucune période disponible"}</strong></div><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cours</span><div className="mt-2 space-y-1">{props.courses.map((course) => <button type="button" key={course.assignmentId} onClick={() => props.onCourse(course)} className={`w-full rounded-lg border p-2.5 text-left ${props.selectedCourse?.assignmentId === course.assignmentId ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-transparent text-slate-700 hover:bg-white"}`}><strong className="block text-sm">{course.subjectName}</strong><span className="text-xs text-slate-500">{course.className} · {course.teacherName}</span></button>)}</div></aside>
    <div className="min-w-0"><header className="border-b border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="m-0 text-lg font-semibold text-slate-950">{props.selectedCourse ? `${props.selectedCourse.subjectName} · ${props.selectedCourse.className}` : "Sélectionnez un cours"}</h2>{props.selectedCourse ? <p className="mt-1 text-sm text-slate-500">{props.period?.name} · {props.selectedCourse.teacherName} · Coefficient {props.selectedCourse.coefficient} · {props.completion}% complété</p> : null}</div>{props.postponed ? <Tag value={`${props.postponed} reporté(s)`} severity="warning" /> : null}</div><div className="mt-3 flex flex-wrap gap-2"><Button label="Ajouter une note" icon="pi pi-plus" size="small" disabled={!props.selectedCourse || !props.period} onClick={props.onAdd} /><Button label="Saisir les résultats" icon="pi pi-pencil" size="small" severity="secondary" outlined disabled={!props.notes.length} onClick={() => document.querySelector<HTMLInputElement>(".grade-input")?.focus()} /><Button label="Appliquer un statut" icon="pi pi-check-square" size="small" severity="secondary" outlined disabled={!selectedStudents.length || !props.notes.length} onClick={() => { setBulkNoteId(props.notes[0]?.id ?? ""); setBulkOpen(true); }} /><Button label="Publier les notes" icon="pi pi-send" size="small" severity="secondary" outlined disabled={!props.notes.length || props.notes.every((note) => note.is_published)} onClick={() => void publish()} /><Button label="Historique" icon="pi pi-history" size="small" text disabled={!props.notes.length} onClick={() => void openAudit()} /></div></header>
      {!props.selectedCourse ? <Empty title="Aucun cours sélectionné" detail="Choisissez un cours dans l’arborescence." /> : !props.period ? <Empty title="Aucune période pour ce cycle" detail="Configurez les périodes du cycle dans Paramétrage." /> : !props.students.length ? <Empty title="Aucun élève dans cette classe" detail="Les élèves confirmés et affectés à la classe apparaîtront ici." /> : <div className="overflow-auto"><table className="w-full min-w-[800px] border-collapse text-sm"><thead><tr className="bg-slate-50 text-left text-xs text-slate-500"><th className="w-12 border-b border-slate-200 p-3"><Checkbox checked={allSelected} onChange={() => setSelectedStudents(allSelected ? [] : props.students.map((student) => student.studentId))} /></th><th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 p-3">Élève</th>{props.notes.map((note) => <th key={note.id} className="min-w-32 border-b border-slate-200 p-3"><strong className="block text-slate-800">{note.label}</strong><span>{note.note_date} · /{note.scale_snapshot}</span>{note.is_published ? <Tag className="mt-1" value="Publié" severity="success" /> : null}</th>)}<th className="border-b border-slate-200 p-3">État</th></tr></thead><tbody>{props.students.map((student) => <tr key={student.studentId} className="hover:bg-slate-50/70"><td className="border-b border-slate-100 p-3"><Checkbox checked={selectedStudents.includes(student.studentId)} onChange={() => setSelectedStudents((current) => current.includes(student.studentId) ? current.filter((id) => id !== student.studentId) : [...current, student.studentId])} /></td><td className="sticky left-0 border-b border-r border-slate-100 bg-white p-3"><strong className="block text-slate-900">{student.name}</strong><span className="text-xs text-slate-400">{student.matricule}</span></td>{props.notes.map((note) => { const result = props.resultFor(note.id, student.studentId); const shown = result?.status ? noteResultStatusLabels[result.status] : result?.value?.toString() ?? ""; return <td key={note.id} className="border-b border-slate-100 p-2"><InputText className="grade-input w-28" defaultValue={shown} disabled={note.is_locked} placeholder={`0–${note.scale_snapshot}`} onBlur={(event) => { if (event.target.value !== shown) props.onResult(note.id, student.studentId, event.target.value); }} /></td>; })}<td className="border-b border-slate-100 p-3"><Tag value={props.notes.every((note) => props.resultFor(note.id, student.studentId)) ? "Complet" : "À compléter"} severity={props.notes.every((note) => props.resultFor(note.id, student.studentId)) ? "success" : "secondary"} /></td></tr>)}</tbody></table></div>}
    </div>
    <Dialog header="Appliquer un statut" visible={bulkOpen} modal className="w-[min(94vw,30rem)]" onHide={() => setBulkOpen(false)}><div className="space-y-4"><Message severity="info" text={`${selectedStudents.length} élève(s) sélectionné(s).`} /><label className="field"><span>Note concernée</span><Dropdown value={bulkNoteId} options={props.notes.map((note) => ({ label: note.label, value: note.id }))} onChange={(event) => { const selected: unknown = event.value; if (typeof selected === "string") setBulkNoteId(selected); }} className="w-full" /></label><label className="field"><span>Statut</span><Dropdown value={bulkStatus} options={Object.entries(noteResultStatusLabels).map(([value, label]) => ({ value, label }))} onChange={(event) => { const selected: unknown = event.value; if (selected === "absent" || selected === "exempt" || selected === "postponed") setBulkStatus(selected); }} className="w-full" /></label><div className="flex justify-end gap-2"><Button label="Annuler" severity="secondary" outlined onClick={() => setBulkOpen(false)} /><Button label="Appliquer" onClick={() => void applyBulkStatus()} /></div></div></Dialog>
    <Dialog header="Historique du cahier" visible={auditOpen} modal className="w-[min(96vw,48rem)]" onHide={() => setAuditOpen(false)}>{audit.length ? <div className="divide-y divide-slate-100">{audit.map((event) => <div key={event.id} className="py-3"><div className="flex justify-between gap-3"><strong className="text-sm text-slate-900">{event.action}</strong><span className="text-xs text-slate-400">{new Date(event.created_at).toLocaleString("fr-FR")}</span></div><span className="text-xs text-slate-500">{event.entity_type} · {event.entity_id}</span></div>)}</div> : <Empty title="Aucun événement" detail="Les modifications du cahier apparaîtront ici." />}</Dialog>
  </section>;
}

function Empty({ title, detail }: { title: string; detail: string }) { return <div className="grid min-h-48 place-items-center p-6 text-center"><div><MetricIcon icon="pi-inbox" size="md" tone="slate" className="mx-auto" /><h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3><p className="mt-1 text-sm text-slate-500">{detail}</p></div></div>; }
