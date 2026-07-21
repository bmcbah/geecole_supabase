import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { Tag } from "primereact/tag";
import { Tree } from "primereact/tree";
import type { TreeNode } from "primereact/treenode";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { MetricIcon } from "../../../shared/components/data-display/MetricIcon";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { listAcademicPeriods } from "../../settings/services/academic-structure.service";
import type { Database } from "../../../shared/lib/supabase/database.types";
import type {
  CourseSummary,
  GradebookStudent,
  NoteResultStatus,
} from "../domain/notes";
import { noteResultStatusLabels } from "../domain/notes";
import {
  createGradebookNote,
  listActiveNoteTypes,
  listClassStudents,
  listCourseAppreciations,
  listCourseAudit,
  listCourseNotes,
  listCourseSummaries,
  listNoteResults,
  publishCourseNotes,
  saveCourseAppreciation,
  saveNoteResult,
} from "../services/notes.service";
type Period = Database["public"]["Tables"]["academic_periods"]["Row"];
type GradebookNote = Database["public"]["Tables"]["gradebook_notes"]["Row"];
type NoteResult = Database["public"]["Tables"]["note_results"]["Row"];
type NoteType = Database["public"]["Tables"]["assessment_types"]["Row"];
type Appreciation =
  Database["public"]["Tables"]["subject_appreciations"]["Row"];
export function NotesWorkspacePage() {
  const { institutionId, yearId, year } = useAcademicSession();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [course, setCourse] = useState<CourseSummary>();
  const [periodId, setPeriodId] = useState("");
  const [students, setStudents] = useState<GradebookStudent[]>([]);
  const [notes, setNotes] = useState<GradebookNote[]>([]);
  const [results, setResults] = useState<NoteResult[]>([]);
  const [appreciations, setAppreciations] = useState<Appreciation[]>([]);
  const [types, setTypes] = useState<NoteType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [draft, setDraft] = useState({
    label: "",
    code: "",
    noteTypeId: "",
    noteDate: new Date().toISOString().slice(0, 10),
    comment: "",
  });
  const loadFoundation = useCallback(async () => {
    if (!yearId) return;
    setLoading(true);
    try {
      const [courseRows, periodRows, typeRows] = await Promise.all([
        listCourseSummaries(institutionId, yearId),
        listAcademicPeriods(yearId),
        listActiveNoteTypes(institutionId, yearId),
      ]);
      setCourses(courseRows);
      setPeriods(periodRows);
      setTypes(typeRows);
      setCourse((c) => c ?? courseRows[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);
  const loadBook = useCallback(async () => {
    if (!course || !periodId || !yearId) {
      setStudents([]);
      setNotes([]);
      setResults([]);
      setAppreciations([]);
      return;
    }
    try {
      const [studentRows, noteRows, appreciationRows] = await Promise.all([
        listClassStudents(course.classId),
        listCourseNotes(yearId, periodId, course),
        listCourseAppreciations({ institutionId, yearId, periodId, course }),
      ]);
      setStudents(studentRows);
      setNotes(noteRows);
      setAppreciations(appreciationRows);
      setResults(await listNoteResults(noteRows.map((n) => n.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cahier indisponible.");
    }
  }, [course, institutionId, periodId, yearId]);
  useEffect(() => {
    void loadFoundation();
  }, [loadFoundation]);
  useEffect(() => {
    void loadBook();
  }, [loadBook]);
  useEffect(() => {
    if (!course) return;
    const available = periods.filter(
      (p) =>
        p.cycle_id === course.cycleId &&
        (!course.allowedPeriodIds.length ||
          course.allowedPeriodIds.includes(p.id)),
    );
    setPeriodId((current) =>
      available.some((p) => p.id === current)
        ? current
        : ((available.find((p) => p.status === "open") ?? available[0])?.id ??
          ""),
    );
  }, [course, periods]);
  async function addNote() {
    if (!course || !periodId || !yearId) return;
    try {
      await createGradebookNote({
        institutionId,
        yearId,
        periodId,
        course,
        noteTypeId: draft.noteTypeId,
        label: draft.label,
        code: draft.code,
        noteDate: draft.noteDate,
        comment: draft.comment,
      });
      setNoteOpen(false);
      setDraft({
        label: "",
        code: "",
        noteTypeId: "",
        noteDate: new Date().toISOString().slice(0, 10),
        comment: "",
      });
      await loadBook();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible.");
    }
  }
  if (!year)
    return <Message severity="warn" text="Sélectionnez une année scolaire." />;
  if (loading)
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <ProgressSpinner />
      </div>
    );
  const selectedPeriod = periods.find((p) => p.id === periodId);
  return (
    <div className="space-y-3 pb-6">
      <PageHeader
        compact
        eyebrow="Notes & Bulletins"
        title="Cahier des notes"
        description={`Gérez toutes les évaluations de l’école · ${year.name}`}
        meta={
          <Tag
            value={
              selectedPeriod?.status === "open"
                ? `${selectedPeriod.name} · active`
                : (selectedPeriod?.name ?? "Aucune période")
            }
            severity={
              selectedPeriod?.status === "open" ? "success" : "secondary"
            }
          />
        }
      />
      {error ? <Message severity="error" text={error} /> : null}
      <GradebookTree
        courses={courses}
        periods={periods}
        selectedCourse={course}
        selectedPeriodId={periodId}
        onCourse={(c, p) => {
          setCourse(c);
          setPeriodId(p);
        }}
      >
        <Gradebook
          course={course}
          period={selectedPeriod}
          periods={periods.filter((p) => p.cycle_id === course?.cycleId)}
          onPeriod={setPeriodId}
          students={students}
          notes={notes}
          results={results}
          types={types}
          appreciations={appreciations}
          institutionId={institutionId}
          yearId={yearId}
          onAdd={() => setNoteOpen(true)}
          onReload={loadBook}
        />
      </GradebookTree>
      <Dialog
        header="Ajouter une évaluation"
        visible={noteOpen}
        modal
        className="w-[min(94vw,38rem)]"
        onHide={() => setNoteOpen(false)}
      >
        <Message
          severity="info"
          text={`${course?.subjectName ?? "Cours"} · ${course?.className ?? "Classe"} · ${selectedPeriod?.name ?? "Période"}`}
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Libellé *">
            <InputText
              value={draft.label}
              onChange={(e) =>
                setDraft((v) => ({ ...v, label: e.target.value }))
              }
              className="w-full"
              placeholder="Devoir surveillé 1"
            />
          </Field>
          <Field label="Code *">
            <InputText
              value={draft.code}
              onChange={(e) =>
                setDraft((v) => ({ ...v, code: e.target.value }))
              }
              className="w-full"
              placeholder="DS1"
            />
          </Field>
          <Field label="Type d’évaluation *">
            <Dropdown
              value={draft.noteTypeId}
              options={types.map((t) => ({
                label: `${t.name} · /${t.scale}`,
                value: t.id,
              }))}
              onChange={(e) =>
                setDraft((v) => ({ ...v, noteTypeId: String(e.value) }))
              }
              className="w-full"
            />
          </Field>
          <Field label="Date *">
            <InputText
              type="date"
              value={draft.noteDate}
              onChange={(e) =>
                setDraft((v) => ({ ...v, noteDate: e.target.value }))
              }
              className="w-full"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Commentaire interne">
              <InputTextarea
                value={draft.comment}
                onChange={(e) =>
                  setDraft((v) => ({ ...v, comment: e.target.value }))
                }
                rows={3}
                className="w-full"
              />
            </Field>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            label="Annuler"
            severity="secondary"
            outlined
            onClick={() => setNoteOpen(false)}
          />
          <Button
            label="Créer l’évaluation"
            icon="pi pi-plus"
            disabled={
              !draft.label.trim() || !draft.code.trim() || !draft.noteTypeId
            }
            onClick={() => void addNote()}
          />
        </div>
      </Dialog>
    </div>
  );
}

function GradebookTree(props: {
  courses: CourseSummary[];
  periods: Period[];
  selectedCourse?: CourseSummary;
  selectedPeriodId: string;
  onCourse: (course: CourseSummary, periodId: string) => void;
  children: React.ReactNode;
}) {
  const [treeSearch, setTreeSearch] = useState("");
  const [cycleId, setCycleId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [levelName, setLevelName] = useState("");
  const [classId, setClassId] = useState("");
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const cycles = useMemo(
    () =>
      [
        ...new Map(
          props.courses.map((course) => [course.cycleId, course]),
        ).values(),
      ].map((course) => ({ label: course.cycleName, value: course.cycleId })),
    [props.courses],
  );
  const availablePeriods = useMemo(
    () =>
      props.periods.filter((period) => !cycleId || period.cycle_id === cycleId),
    [cycleId, props.periods],
  );
  const classes = useMemo(
    () =>
      [
        ...new Map(
          props.courses
            .filter((course) => !cycleId || course.cycleId === cycleId)
            .filter((course) => !levelName || course.levelName === levelName)
            .map((course) => [course.classId, course]),
        ).values(),
      ].map((course) => ({ label: course.className, value: course.classId })),
    [cycleId, levelName, props.courses],
  );
  const levels = useMemo(
    () =>
      [
        ...new Set(
          props.courses
            .filter((course) => !cycleId || course.cycleId === cycleId)
            .map((course) => course.levelName),
        ),
      ].map((level) => ({ label: level, value: level })),
    [cycleId, props.courses],
  );
  useEffect(() => {
    setCycleId(
      (current) =>
        current || props.selectedCourse?.cycleId || cycles[0]?.value || "",
    );
  }, [cycles, props.selectedCourse]);
  useEffect(() => {
    setPeriodId((current) => {
      if (availablePeriods.some((period) => period.id === current))
        return current;
      return (
        availablePeriods.find((period) => period.id === props.selectedPeriodId)
          ?.id ??
        availablePeriods.find((period) => period.status === "open")?.id ??
        availablePeriods[0]?.id ??
        ""
      );
    });
  }, [availablePeriods, props.selectedPeriodId]);
  useEffect(() => {
    if (classes.some((item) => item.value === classId)) return;
    setClassId("");
  }, [classId, classes]);
  const normalizedTreeSearch = treeSearch.trim().toLocaleLowerCase("fr");
  const nodes = useMemo<TreeNode[]>(() => {
    const filteredCourses = props.courses.filter((course) => {
      const searchable =
        `${course.levelName} ${course.className} ${course.subjectName} ${course.teacherName}`.toLocaleLowerCase(
          "fr",
        );
      return (
        (!cycleId || course.cycleId === cycleId) &&
        (!levelName || course.levelName === levelName) &&
        (!classId || course.classId === classId) &&
        (!periodId ||
          !course.allowedPeriodIds.length ||
          course.allowedPeriodIds.includes(periodId)) &&
        (!normalizedTreeSearch || searchable.includes(normalizedTreeSearch))
      );
    });
    return [...new Set(filteredCourses.map((course) => course.levelName))].map(
      (level) => {
        const levelCourses = filteredCourses.filter(
          (course) => course.levelName === level,
        );
        return {
          key: `level:${level}`,
          label: level,
          icon: "pi pi-sitemap",
          children: [
            ...new Set(levelCourses.map((course) => course.classId)),
          ].map((currentClassId) => {
            const classCourses = levelCourses.filter(
              (course) => course.classId === currentClassId,
            );
            return {
              key: `class:${currentClassId}`,
              label: classCourses[0]?.className,
              icon: "pi pi-users",
              children: classCourses.map((course) => ({
                key: `${periodId}:course:${course.assignmentId}`,
                label: `${course.subjectName} · ${course.teacherName}`,
                icon: "pi pi-book",
                data: { kind: "course", course, periodId },
              })),
            };
          }),
        };
      },
    );
  }, [
    classId,
    cycleId,
    levelName,
    normalizedTreeSearch,
    periodId,
    props.courses,
  ]);
  const selectedKey =
    props.selectedCourse && periodId
      ? `${periodId}:course:${props.selectedCourse.assignmentId}`
      : undefined;
  const selectNode = (key: string) => {
    const find = (list: TreeNode[]): TreeNode | undefined => {
      for (const node of list) {
        if (node.key === key) return node;
        const found = find(node.children ?? []);
        if (found) return found;
      }
    };
    const data: unknown = find(nodes)?.data;
    if (
      data &&
      typeof data === "object" &&
      "kind" in data &&
      data.kind === "course" &&
      "course" in data &&
      "periodId" in data &&
      typeof data.periodId === "string"
    ) {
      props.onCourse(data.course as CourseSummary, data.periodId);
      setMobileTreeOpen(false);
    }
  };
  const tree = (
    <Tree
      value={nodes}
      selectionMode="single"
      selectionKeys={selectedKey}
      onSelectionChange={(e) => {
        if (typeof e.value === "string") selectNode(e.value);
      }}
      className="border-0 bg-transparent p-0 text-xs"
    />
  );
  return (
    <section className="min-h-[620px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden items-center gap-2 border-b border-slate-200 bg-white p-2 lg:flex">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Contexte
        </span>
        <Dropdown
          value={cycleId}
          options={cycles}
          onChange={(event) => {
            setCycleId(String(event.value));
            setLevelName("");
            setClassId("");
          }}
          className="h-8 min-w-0 flex-1 text-xs"
          placeholder="Cycle"
        />
        <Dropdown
          value={periodId}
          options={availablePeriods.map((period) => ({
            label: period.name,
            value: period.id,
          }))}
          onChange={(event) => setPeriodId(String(event.value))}
          className="h-8 min-w-0 flex-1 text-xs"
          placeholder="Période"
        />
        <Dropdown
          value={levelName}
          options={[{ label: "Tous les niveaux", value: "" }, ...levels]}
          onChange={(event) => {
            setLevelName(String(event.value));
            setClassId("");
          }}
          className="h-8 min-w-0 flex-1 text-xs"
          placeholder="Niveau"
        />
        <Dropdown
          value={classId}
          options={[{ label: "Toutes les classes", value: "" }, ...classes]}
          onChange={(event) => setClassId(String(event.value))}
          className="h-8 min-w-0 flex-1 text-xs"
          placeholder="Classe"
        />
      </div>
      <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="hidden min-w-0 border-r border-slate-200 bg-slate-50/60 p-2.5 lg:block">
          <div className="border-t border-slate-200 pt-2">
            <span className="mb-1 block px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Recherche dans l’arbre
            </span>
            <span className="p-input-icon-left block">
              <i className="pi pi-search" />
              <InputText
                value={treeSearch}
                onChange={(e) => setTreeSearch(e.target.value)}
                className="h-9 w-full pl-9 text-sm"
                placeholder="Niveau, cours, enseignant…"
              />
            </span>
          </div>
          <div className="mb-2 mt-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Niveau → Classe → Cours
          </div>
          {tree}
        </aside>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/60 p-2 lg:hidden">
            <div className="min-w-0 text-xs">
              <span className="block text-slate-500">Cours sélectionné</span>
              <strong className="block truncate text-slate-800">
                {props.selectedCourse
                  ? `${props.selectedCourse.subjectName} · ${props.selectedCourse.className}`
                  : "Aucun cours"}
              </strong>
            </div>
            <Button
              size="small"
              label="Choisir"
              icon="pi pi-sitemap"
              outlined
              onClick={() => setMobileTreeOpen(true)}
            />
          </div>
          {props.children}
        </div>
      </div>
      <Dialog
        header="Choisir le cours"
        visible={mobileTreeOpen}
        modal
        className="w-[min(96vw,34rem)]"
        onHide={() => setMobileTreeOpen(false)}
      >
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          <Dropdown
            value={cycleId}
            options={cycles}
            onChange={(event) => {
              setCycleId(String(event.value));
              setLevelName("");
              setClassId("");
            }}
            className="h-9 w-full text-xs"
            placeholder="Cycle"
          />
          <Dropdown
            value={periodId}
            options={availablePeriods.map((period) => ({
              label: period.name,
              value: period.id,
            }))}
            onChange={(event) => setPeriodId(String(event.value))}
            className="h-9 w-full text-xs"
            placeholder="Période"
          />
          <Dropdown
            value={levelName}
            options={[{ label: "Tous les niveaux", value: "" }, ...levels]}
            onChange={(event) => {
              setLevelName(String(event.value));
              setClassId("");
            }}
            className="h-9 w-full text-xs"
            placeholder="Niveau"
          />
          <Dropdown
            value={classId}
            options={[{ label: "Toutes les classes", value: "" }, ...classes]}
            onChange={(event) => setClassId(String(event.value))}
            className="h-9 w-full text-xs"
            placeholder="Classe"
          />
        </div>
        <span className="p-input-icon-left mb-3 block">
          <i className="pi pi-search" />
          <InputText
            value={treeSearch}
            onChange={(e) => setTreeSearch(e.target.value)}
            className="h-9 w-full pl-9 text-sm"
            placeholder="Période, cycle, niveau, classe ou cours"
          />
        </span>
        {tree}
      </Dialog>
    </section>
  );
}

function Gradebook(props: {
  course?: CourseSummary;
  period?: Period;
  periods: Period[];
  onPeriod: (id: string) => void;
  students: GradebookStudent[];
  notes: GradebookNote[];
  results: NoteResult[];
  types: NoteType[];
  appreciations: Appreciation[];
  institutionId: string;
  yearId: string;
  onAdd: () => void;
  onReload: () => Promise<void>;
}) {
  const [studentQuery, setStudentQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkNote, setBulkNote] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<NoteResultStatus>("absent");
  const [journalOpen, setJournalOpen] = useState(false);
  const [journal, setJournal] = useState<
    Database["public"]["Tables"]["notes_audit_log"]["Row"][]
  >([]);
  const visible = props.students.filter((s) =>
    `${s.name} ${s.matricule}`
      .toLowerCase()
      .includes(studentQuery.toLowerCase()),
  );
  const resultFor = (noteId: string, studentId: string) =>
    props.results.find(
      (r) => r.note_id === noteId && r.student_id === studentId,
    );
  const typeFor = (note: GradebookNote) =>
    props.types.find((t) => t.id === note.note_type_id);
  const score = (note: GradebookNote, studentId: string) => {
    const r = resultFor(note.id, studentId);
    return r?.value == null ? undefined : (r.value / note.scale_snapshot) * 20;
  };
  const average = (studentId: string, noteRows: GradebookNote[]) => {
    const values = noteRows
      .map((n) => score(n, studentId))
      .filter((v): v is number => v !== undefined);
    return values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : undefined;
  };
  const usedTypes = props.types.filter((t) =>
    props.notes.some((n) => n.note_type_id === t.id),
  );
  const appreciationFor = (studentId: string) =>
    props.appreciations.find((a) => a.student_id === studentId)?.appreciation ??
    "";
  async function saveResult(noteId: string, studentId: string, raw: string) {
    if (!raw.trim()) return;
    const normalized = raw.trim().toLowerCase();
    const status =
      normalized === "absent"
        ? "absent"
        : normalized === "dispense" || normalized === "dispensé"
          ? "exempt"
          : normalized === "reporte" || normalized === "reporté"
            ? "postponed"
            : null;
    const value = status ? null : Number(raw.replace(",", "."));
    if (!status && !Number.isFinite(value)) return;
    await saveNoteResult({
      institutionId: props.institutionId,
      noteId,
      studentId,
      value,
      status,
    });
    await props.onReload();
  }
  async function pasteBulk() {
    if (!bulkNote) return;
    const byMatricule = new Map(
      props.students.map((s) => [s.matricule.toLowerCase(), s]),
    );
    const tasks = bulkText
      .split(/\r?\n/)
      .map((line) => line.split(/[\t;]/).map((v) => v.trim()))
      .filter((p) => p.length >= 2)
      .flatMap(([matricule, value]) => {
        if (!matricule || !value) return [];
        const student = byMatricule.get(matricule.toLowerCase());
        return student ? [saveResult(bulkNote, student.studentId, value)] : [];
      });
    await Promise.all(tasks);
    setBulkOpen(false);
    setBulkText("");
    await props.onReload();
  }
  async function applyStatus() {
    if (!bulkNote) return;
    await Promise.all(
      selected.map((studentId) =>
        saveNoteResult({
          institutionId: props.institutionId,
          noteId: bulkNote,
          studentId,
          status: bulkStatus,
        }),
      ),
    );
    setStatusOpen(false);
    setSelected([]);
    await props.onReload();
  }
  async function saveAppreciation(studentId: string, value: string) {
    if (!props.course || !props.period || value.trim().length < 2) return;
    await saveCourseAppreciation({
      institutionId: props.institutionId,
      yearId: props.yearId,
      periodId: props.period.id,
      course: props.course,
      studentId,
      appreciation: value,
    });
    await props.onReload();
  }
  if (!props.course)
    return (
      <Empty
        title="Choisissez un cours"
        detail="Dépliez l’arbre puis sélectionnez une matière."
      />
    );
  return (
    <>
      <header className="border-b border-slate-200 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-base font-semibold text-slate-950">
              {props.course.subjectName} · {props.course.className}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {props.course.cycleName} · {props.course.levelName} ·{" "}
              {props.course.teacherName} · coefficient{" "}
              {props.course.coefficient}
            </p>
          </div>
          <Tag
            value={
              props.period?.status === "open"
                ? "Période active"
                : "Période fermée"
            }
            severity={props.period?.status === "open" ? "success" : "secondary"}
          />
        </div>
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50/70 p-2">
          <span className="p-input-icon-left min-w-48 flex-1">
            <i className="pi pi-search" />
            <InputText
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              className="h-8 w-full pl-9 text-xs"
              placeholder="Nom ou matricule"
            />
          </span>
          <Button
            size="small"
            label="Évaluation"
            icon="pi pi-plus"
            disabled={props.period?.status !== "open"}
            onClick={props.onAdd}
          />
          <Button
            size="small"
            label="Saisie masse"
            icon="pi pi-table"
            severity="secondary"
            outlined
            disabled={!props.notes.length || props.period?.status !== "open"}
            onClick={() => {
              setBulkNote(props.notes[0]?.id ?? "");
              setBulkOpen(true);
            }}
          />
          <Button
            size="small"
            label="Statut"
            icon="pi pi-check-square"
            severity="secondary"
            outlined
            disabled={!selected.length || !props.notes.length}
            onClick={() => {
              setBulkNote(props.notes[0]?.id ?? "");
              setStatusOpen(true);
            }}
          />
          <Button
            size="small"
            label="Publier"
            icon="pi pi-send"
            severity="secondary"
            outlined
            disabled={!props.notes.length}
            onClick={() =>
              void publishCourseNotes(props.notes.map((n) => n.id)).then(
                props.onReload,
              )
            }
          />
          <Button
            size="small"
            label="Journal"
            icon="pi pi-history"
            text
            disabled={!props.notes.length}
            onClick={() =>
              void listCourseAudit(props.notes.map((n) => n.id)).then(
                (rows) => {
                  setJournal(rows);
                  setJournalOpen(true);
                },
              )
            }
          />
        </div>
      </header>
      {!props.students.length ? (
        <Empty
          title="Aucun élève"
          detail="Seuls les élèves confirmés et affectés à cette classe apparaissent."
        />
      ) : (
        <div className="max-h-[calc(100vh-15rem)] min-h-80 overflow-auto">
          <table className="w-full min-w-[980px] border-collapse text-xs">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-50 text-left text-xs text-slate-500">
                <th className="w-10 border-b p-2">
                  <Checkbox
                    checked={
                      selected.length === visible.length && visible.length > 0
                    }
                    onChange={() =>
                      setSelected(
                        selected.length === visible.length
                          ? []
                          : visible.map((s) => s.studentId),
                      )
                    }
                  />
                </th>
                <th className="sticky left-0 z-10 w-px whitespace-nowrap border-b border-r bg-slate-50 p-2">
                  Élève
                </th>
                {props.notes.map((note) => (
                  <th key={note.id} className="min-w-28 border-b p-2">
                    <strong className="block text-slate-800">
                      {note.label}
                    </strong>
                    <span className="block text-[11px] font-semibold text-emerald-700">
                      {typeFor(note)?.name ?? "Évaluation"}
                    </span>
                    <span>
                      {new Date(note.note_date).toLocaleDateString("fr-FR")} · /
                      {note.scale_snapshot}
                    </span>
                  </th>
                ))}
                {usedTypes.map((type) => (
                  <th
                    key={type.id}
                    className="hidden min-w-24 border-b bg-blue-50/50 p-2 xl:table-cell"
                  >
                    Moy. {type.name}
                  </th>
                ))}
                <th className="min-w-24 border-b bg-emerald-50 p-2">
                  Moyenne /20
                </th>
                <th className="min-w-52 border-b p-2">Appréciation du cours</th>
                <th className="border-b p-2">État</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((student) => (
                <tr key={student.studentId} className="hover:bg-slate-50/70">
                  <td className="border-b p-2">
                    <Checkbox
                      checked={selected.includes(student.studentId)}
                      onChange={() =>
                        setSelected((v) =>
                          v.includes(student.studentId)
                            ? v.filter((id) => id !== student.studentId)
                            : [...v, student.studentId],
                        )
                      }
                    />
                  </td>
                  <td className="sticky left-0 z-10 w-px whitespace-nowrap border-b border-r bg-white p-2">
                    <strong className="block">{student.name}</strong>
                    <span className="text-xs text-slate-400">
                      {student.matricule}
                    </span>
                  </td>
                  {props.notes.map((note) => {
                    const result = resultFor(note.id, student.studentId);
                    const shown = result?.status
                      ? noteResultStatusLabels[result.status]
                      : (result?.value?.toString() ?? "");
                    return (
                      <td key={note.id} className="border-b p-2">
                        <InputText
                          key={`${note.id}-${student.studentId}-${shown}`}
                          defaultValue={shown}
                          disabled={
                            note.is_locked || props.period?.status !== "open"
                          }
                          className="h-8 w-20 text-xs"
                          placeholder={`0–${note.scale_snapshot}`}
                          onBlur={(e) => {
                            if (e.target.value !== shown)
                              void saveResult(
                                note.id,
                                student.studentId,
                                e.target.value,
                              );
                          }}
                        />
                      </td>
                    );
                  })}
                  {usedTypes.map((type) => (
                    <td
                      key={type.id}
                      className="hidden border-b bg-blue-50/20 p-2 font-semibold xl:table-cell"
                    >
                      {formatAverage(
                        average(
                          student.studentId,
                          props.notes.filter((n) => n.note_type_id === type.id),
                        ),
                      )}
                    </td>
                  ))}
                  <td className="border-b bg-emerald-50/40 p-2 text-sm font-bold text-emerald-800">
                    {formatAverage(average(student.studentId, props.notes))}
                  </td>
                  <td className="border-b p-2">
                    <InputText
                      key={`${student.studentId}-${appreciationFor(student.studentId)}`}
                      defaultValue={appreciationFor(student.studentId)}
                      disabled={props.period?.status !== "open"}
                      className="h-8 w-full text-xs"
                      placeholder="Progrès, points forts, conseils…"
                      onBlur={(e) => {
                        if (
                          e.target.value !== appreciationFor(student.studentId)
                        )
                          void saveAppreciation(
                            student.studentId,
                            e.target.value,
                          );
                      }}
                    />
                  </td>
                  <td className="border-b p-2">
                    <Tag
                      value={
                        props.notes.every((n) =>
                          resultFor(n.id, student.studentId),
                        )
                          ? "Complet"
                          : "À compléter"
                      }
                      severity={
                        props.notes.every((n) =>
                          resultFor(n.id, student.studentId),
                        )
                          ? "success"
                          : "secondary"
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog
        header="Saisie en masse"
        visible={bulkOpen}
        modal
        className="w-[min(96vw,44rem)]"
        onHide={() => setBulkOpen(false)}
      >
        <Message
          severity="info"
          text="Copiez deux colonnes depuis Excel : matricule puis note. Les valeurs Absent, Dispensé et Reporté sont acceptées."
        />
        <div className="mt-4 space-y-4">
          <Field label="Évaluation">
            <Dropdown
              value={bulkNote}
              options={props.notes.map((n) => ({
                label: `${n.label} · ${typeFor(n)?.name ?? "Évaluation"}`,
                value: n.id,
              }))}
              onChange={(e) => setBulkNote(String(e.value))}
              className="w-full"
            />
          </Field>
          <Field label="Données à coller">
            <InputTextarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={10}
              className="w-full font-mono"
              placeholder={"EL-2025-00001\t16\nEL-2025-00002\tAbsent"}
            />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            label="Annuler"
            severity="secondary"
            outlined
            onClick={() => setBulkOpen(false)}
          />
          <Button
            label="Enregistrer la saisie"
            icon="pi pi-check"
            disabled={!bulkNote || !bulkText.trim()}
            onClick={() => void pasteBulk()}
          />
        </div>
      </Dialog>
      <Dialog
        header="Appliquer un statut"
        visible={statusOpen}
        modal
        className="w-[min(94vw,32rem)]"
        onHide={() => setStatusOpen(false)}
      >
        <Message
          severity="info"
          text={`${selected.length} élève(s) sélectionné(s).`}
        />
        <div className="mt-4 space-y-4">
          <Field label="Évaluation">
            <Dropdown
              value={bulkNote}
              options={props.notes.map((n) => ({
                label: n.label,
                value: n.id,
              }))}
              onChange={(e) => setBulkNote(String(e.value))}
              className="w-full"
            />
          </Field>
          <Field label="Statut">
            <Dropdown
              value={bulkStatus}
              options={Object.entries(noteResultStatusLabels).map(
                ([value, label]) => ({ value, label }),
              )}
              onChange={(e) => setBulkStatus(e.value as NoteResultStatus)}
              className="w-full"
            />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button label="Appliquer" onClick={() => void applyStatus()} />
        </div>
      </Dialog>
      <Dialog
        header="Journal des modifications"
        visible={journalOpen}
        modal
        className="w-[min(96vw,48rem)]"
        onHide={() => setJournalOpen(false)}
      >
        <Message
          severity="info"
          text="Ce journal permet de savoir quand une évaluation a été créée, modifiée ou publiée."
        />
        {journal.map((event) => (
          <div key={event.id} className="border-b py-3">
            <strong>{event.action}</strong>
            <span className="float-right text-xs text-slate-400">
              {new Date(event.created_at).toLocaleString("fr-FR")}
            </span>
          </div>
        ))}
      </Dialog>
    </>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}
function formatAverage(value?: number) {
  return value === undefined
    ? "—"
    : value.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}
function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="grid min-h-64 place-items-center p-8 text-center">
      <div>
        <MetricIcon
          icon="pi-inbox"
          size="md"
          tone="slate"
          className="mx-auto"
        />
        <h3 className="mt-3 font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
