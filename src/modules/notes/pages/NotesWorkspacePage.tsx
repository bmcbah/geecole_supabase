import { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { Tag } from "primereact/tag";
import { useParams } from "react-router-dom";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { MetricIcon } from "../../../shared/components/data-display/MetricIcon";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { listAcademicPeriods } from "../../settings/services/academic-structure.service";
import type { Database } from "../../../shared/lib/supabase/database.types";
import type { CourseSummary, GradebookStudent, NoteResultStatus } from "../domain/notes";
import { noteResultStatusLabels } from "../domain/notes";
import { createGradebookNote, listActiveNoteTypes, listClassStudents, listCourseNotes, listCourseSummaries, listNoteResults, saveNoteResult } from "../services/notes.service";

type Period = Database["public"]["Tables"]["academic_periods"]["Row"];
type GradebookNote = Database["public"]["Tables"]["gradebook_notes"]["Row"];
type NoteResult = Database["public"]["Tables"]["note_results"]["Row"];
type NoteType = Database["public"]["Tables"]["assessment_types"]["Row"];
type WorkspaceSection = "overview" | "gradebooks" | "tracking" | "bulletins";

const sections: { value: WorkspaceSection; label: string; icon: string }[] = [
  { value: "overview", label: "Vue d’ensemble", icon: "pi-chart-pie" },
  { value: "gradebooks", label: "Cahiers de notes", icon: "pi-book" },
  { value: "tracking", label: "Suivi pédagogique", icon: "pi-chart-line" },
  { value: "bulletins", label: "Bulletins", icon: "pi-file-pdf" },
];

export function NotesWorkspacePage() {
  const { section: routeSection } = useParams();
  const { institutionId, yearId, year } = useAcademicSession();
  const [section, setSection] = useState<WorkspaceSection>("overview");
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
      setPeriodId((current) => current ?? periodData.find((item) => item.status === "open")?.id ?? periodData[0]?.id);
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
    const mapped: Record<string, WorkspaceSection> = { "vue-ensemble": "overview", cahiers: "gradebooks", suivi: "tracking", bulletins: "bulletins" };
    setSection(routeSection ? mapped[routeSection] ?? "overview" : "overview");
  }, [routeSection]);

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
    <PageHeader title="Notes & Bulletins" description={`Cahiers, suivi pédagogique et bulletins · ${year.name}`} meta={<Tag value={periods.find((period) => period.id === periodId)?.name ?? "Aucune période"} severity="info" />} />
    {error ? <Message severity="error" text={error} /> : null}
    <nav className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm" aria-label="Fonctionnalités Notes et Bulletins">
      {sections.map((item) => <Button key={item.value} label={item.label} icon={`pi ${item.icon}`} severity={section === item.value ? undefined : "secondary"} text={section !== item.value} onClick={() => setSection(item.value)} />)}
    </nav>

    {section === "overview" ? <Overview courses={courses} notes={notes} completion={completion} postponed={postponed} onOpen={(course) => { setSelectedCourse(course); setSection("gradebooks"); }} /> : null}
    {section === "gradebooks" ? <Gradebook courses={courses} selectedCourse={selectedCourse} onCourse={setSelectedCourse} periods={periods} periodId={periodId} onPeriod={setPeriodId} students={students} notes={notes} results={results} resultFor={resultFor} completion={completion} postponed={postponed} onAdd={() => setNoteDialog(true)} onResult={(noteId, studentId, value) => { void updateResult(noteId, studentId, value); }} /> : null}
    {section === "tracking" ? <Tracking courses={courses} notes={notes} completion={completion} postponed={postponed} /> : null}
    {section === "bulletins" ? <BulletinsBlocked reason="Le moteur de formules et le modèle officiel de bulletin restent à finaliser dans le backlog du référentiel." /> : null}

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

function Overview({ courses, notes, completion, postponed, onOpen }: { courses: CourseSummary[]; notes: GradebookNote[]; completion: number; postponed: number; onOpen: (course: CourseSummary) => void }) {
  const metrics = [["Cours actifs", courses.length, "pi-book"], ["Notes créées", notes.length, "pi-pencil"], ["Saisie complétée", `${completion} %`, "pi-chart-line"], ["Résultats reportés", postponed, "pi-clock"]] as const;
  return <><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, icon]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span><MetricIcon icon={icon} /></div><strong className="mt-3 block text-2xl text-slate-950">{value}</strong></article>)}</section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="m-0 text-base font-semibold text-slate-950">Mes cours</h2><div className="mt-4 grid gap-3 lg:grid-cols-2">{courses.length ? courses.map((course) => <button type="button" key={course.assignmentId} onClick={() => onOpen(course)} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50"><strong className="block text-slate-950">{course.subjectName} · {course.className}</strong><span className="mt-1 block text-sm text-slate-500">{course.teacherName} · Coefficient {course.coefficient}</span></button>) : <Empty title="Aucun cours disponible" detail="Configurez d’abord les affectations pédagogiques." />}</div></section></>;
}

function Gradebook(props: { courses: CourseSummary[]; selectedCourse?: CourseSummary; onCourse: (course: CourseSummary) => void; periods: Period[]; periodId?: string; onPeriod: (id: string) => void; students: GradebookStudent[]; notes: GradebookNote[]; results: NoteResult[]; resultFor: (noteId: string, studentId: string) => NoteResult | undefined; completion: number; postponed: number; onAdd: () => void; onResult: (noteId: string, studentId: string, value: string) => void }) {
  return <section className="grid min-h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:grid-cols-[270px_minmax(0,1fr)]"><aside className="border-b border-slate-200 bg-slate-50/70 p-3 xl:border-b-0 xl:border-r"><div className="mb-3"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Période</span><Dropdown value={props.periodId} options={props.periods.map((period) => ({ label: period.name, value: period.id }))} onChange={(event) => { if (typeof event.value === "string") props.onPeriod(event.value); }} className="mt-1.5 w-full" /></div><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cours</span><div className="mt-2 space-y-1">{props.courses.map((course) => <button type="button" key={course.assignmentId} onClick={() => props.onCourse(course)} className={`w-full rounded-lg border p-2.5 text-left ${props.selectedCourse?.assignmentId === course.assignmentId ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-transparent text-slate-700 hover:bg-white"}`}><strong className="block text-sm">{course.subjectName}</strong><span className="text-xs text-slate-500">{course.className} · {course.teacherName}</span></button>)}</div></aside><div className="min-w-0"><header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-4"><div><h2 className="m-0 text-lg font-semibold text-slate-950">{props.selectedCourse ? `${props.selectedCourse.subjectName} · ${props.selectedCourse.className}` : "Sélectionnez un cours"}</h2>{props.selectedCourse ? <p className="mt-1 text-sm text-slate-500">{props.selectedCourse.teacherName} · Coefficient {props.selectedCourse.coefficient} · {props.completion}% complété</p> : null}</div><div className="flex items-center gap-2">{props.postponed ? <Tag value={`${props.postponed} reporté(s)`} severity="warning" /> : null}<Button label="Ajouter une note" icon="pi pi-plus" disabled={!props.selectedCourse || !props.periodId} onClick={props.onAdd} /></div></header>{!props.selectedCourse ? <Empty title="Aucun cours sélectionné" detail="Choisissez un cours dans l’arborescence." /> : !props.students.length ? <Empty title="Aucun élève dans cette classe" detail="Les élèves confirmés et affectés à la classe apparaîtront ici." /> : <div className="overflow-auto"><table className="w-full min-w-[760px] border-collapse text-sm"><thead><tr className="bg-slate-50 text-left text-xs text-slate-500"><th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 p-3">Élève</th>{props.notes.map((note) => <th key={note.id} className="min-w-32 border-b border-slate-200 p-3"><strong className="block text-slate-800">{note.label}</strong><span>{note.note_date} · /{note.scale_snapshot}</span></th>)}<th className="border-b border-slate-200 p-3">État</th></tr></thead><tbody>{props.students.map((student) => <tr key={student.studentId} className="hover:bg-slate-50/70"><td className="sticky left-0 border-b border-r border-slate-100 bg-white p-3"><strong className="block text-slate-900">{student.name}</strong><span className="text-xs text-slate-400">{student.matricule}</span></td>{props.notes.map((note) => { const result = props.resultFor(note.id, student.studentId); const shown = result?.status ? noteResultStatusLabels[result.status] : result?.value?.toString() ?? ""; return <td key={note.id} className="border-b border-slate-100 p-2"><InputText className="w-28" defaultValue={shown} placeholder={`0–${note.scale_snapshot}`} onBlur={(event) => { if (event.target.value !== shown) props.onResult(note.id, student.studentId, event.target.value); }} /><div className="mt-1 flex gap-1">{(["absent","exempt","postponed"] as NoteResultStatus[]).map((status) => <button type="button" key={status} title={noteResultStatusLabels[status]} className="rounded border border-slate-200 px-1.5 text-[10px] text-slate-500 hover:bg-slate-100" onClick={() => props.onResult(note.id, student.studentId, `status:${status}`)}>{status === "absent" ? "ABS" : status === "exempt" ? "DISP" : "REP"}</button>)}</div></td>; })}<td className="border-b border-slate-100 p-3"><Tag value={props.notes.every((note) => props.resultFor(note.id, student.studentId)) ? "Complet" : "À compléter"} severity={props.notes.every((note) => props.resultFor(note.id, student.studentId)) ? "success" : "secondary"} /></td></tr>)}</tbody></table></div>}</div></section>;
}

function Tracking({ courses, notes, completion, postponed }: { courses: CourseSummary[]; notes: GradebookNote[]; completion: number; postponed: number }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="m-0 text-base font-semibold">Suivi de saisie</h2><p className="mt-1 text-sm text-slate-500">Progression du périmètre actuellement sélectionné.</p><div className="mt-5 grid gap-3 md:grid-cols-3"><TrackingCard label="Cours configurés" value={String(courses.length)} /><TrackingCard label="Taux de saisie" value={`${completion} %`} /><TrackingCard label="Blocages reportés" value={String(postponed)} danger={postponed > 0} /></div><div className="mt-5 rounded-xl border border-slate-200 p-4"><div className="flex justify-between text-sm"><span>Complétude globale</span><strong>{completion}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-emerald-500" style={{ width: `${completion}%` }} /></div><p className="mb-0 mt-3 text-xs text-slate-500">{notes.length} note(s) chargée(s). Les résultats reportés empêchent les calculs dépendants.</p></div></section>; }
function TrackingCard({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) { return <div className={`rounded-xl border p-4 ${danger ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50/60"}`}><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span><strong className="mt-2 block text-2xl text-slate-950">{value}</strong></div>; }
function BulletinsBlocked({ reason }: { reason: string }) { return <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><MetricIcon icon="pi-file-pdf" size="md" tone="slate" className="mx-auto" /><h2 className="mt-4 text-lg font-semibold text-slate-950">Bulletins — fondations prêtes</h2><p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">{reason}</p><Message className="mx-auto mt-5 max-w-2xl text-left" severity="info" text="La génération restera désactivée tant que ces règles ne seront pas validées, afin de ne pas produire de document scolaire incorrect." /></section>; }
function Empty({ title, detail }: { title: string; detail: string }) { return <div className="grid min-h-48 place-items-center p-6 text-center"><div><MetricIcon icon="pi-inbox" size="md" tone="slate" className="mx-auto" /><h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3><p className="mt-1 text-sm text-slate-500">{detail}</p></div></div>; }
