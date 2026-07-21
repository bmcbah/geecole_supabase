import { supabase } from "../../../shared/lib/supabase/client";
import { listCourseSummaries } from "./notes.service";
import { calculateCourseAverage } from "../domain/grading-formula";
import { resolveFormula } from "./grading-formulas.service";

export type PostponedResultItem = {
  id: string;
  studentName: string;
  matricule: string;
  className: string;
  subjectName: string;
  noteLabel: string;
  noteDate: string;
  impact: string;
};
export type AppreciationItem = {
  id: string;
  appreciationId?: string;
  studentId: string;
  classId: string;
  subjectId: string;
  periodId: string;
  studentName: string;
  matricule: string;
  className: string;
  subjectName: string;
  appreciation: string;
  updatedAt: string;
};
export type AverageControlItem = {
  id: string;
  classId: string;
  className: string;
  subjectName: string;
  teacherName: string;
  coefficient: number;
  periodId: string;
  periodName: string;
  formulaName: string;
  formulaExpression: string;
  notesCount: number;
  expectedResults: number;
  enteredResults: number;
  missingCount: number;
  postponedCount: number;
  absentCount: number;
  exemptCount: number;
  average: number | null;
  contribution: number | null;
  anomalies: string[];
  state: "ready" | "incomplete" | "not_started";
};
export type OperationsMode = "postponed" | "appreciations" | "averages";
export type OperationsFilters = {
  first: number;
  rows: number;
  search?: string;
  classId?: string;
  cycleId?: string;
  levelId?: string;
  periodId?: string;
  state?: string;
};
export type OperationsPage = {
  rows: (PostponedResultItem | AppreciationItem | AverageControlItem)[];
  total: number;
};

export async function completePostponedResult(input: {
  id: string;
  value?: number;
  status?: "absent" | "exempt";
}) {
  const payload = input.status
    ? { value: null, status: input.status }
    : { value: input.value ?? null, status: null };
  const { error } = await supabase
    .from("note_results")
    .update(payload)
    .eq("id", input.id);
  if (error) throw error;
}

export async function updateAppreciation(
  item: AppreciationItem,
  appreciation: string,
) {
  const { error } = await supabase.from("subject_appreciations").upsert(
    {
      institution_id: item.id.split(":")[0],
      academic_year_id: item.id.split(":")[1],
      period_id: item.periodId,
      class_id: item.classId,
      subject_id: item.subjectId,
      student_id: item.studentId,
      appreciation: appreciation.trim(),
    },
    { onConflict: "period_id,class_id,subject_id,student_id" },
  );
  if (error) throw error;
}

export async function listOperationsContext(
  institutionId: string,
  yearId: string,
) {
  const [classes, periods, cycles, levels] = await Promise.all([
    supabase
      .from("school_classes")
      .select("id,name,academic_year_level_id")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", yearId)
      .order("name"),
    supabase
      .from("academic_periods")
      .select("id,name,cycle_id,sequence,status")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", yearId)
      .order("sequence"),
    supabase
      .from("academic_cycles")
      .select("id,name")
      .eq("institution_id", institutionId)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("academic_year_levels")
      .select("id,cycle_id,level_name_snapshot")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", yearId)
      .eq("is_active", true)
      .order("sort_order"),
  ]);
  for (const result of [classes, periods, cycles, levels])
    if (result.error) throw result.error;
  return {
    classes: classes.data ?? [],
    cycles: cycles.data ?? [],
    levels: levels.data ?? [],
    periods: (periods.data ?? []).map((period) => ({
      ...period,
      cycleName:
        cycles.data?.find((cycle) => cycle.id === period.cycle_id)?.name ??
        "Cycle",
    })),
  };
}

export async function listOperationsPage(
  institutionId: string,
  yearId: string,
  mode: OperationsMode,
  filters: OperationsFilters,
): Promise<OperationsPage> {
  const context = await listOperationsContext(institutionId, yearId);
  const allowedLevelIds = context.levels
    .filter((level) => !filters.cycleId || level.cycle_id === filters.cycleId)
    .filter((level) => !filters.levelId || level.id === filters.levelId)
    .map((level) => level.id);
  const allowedClassIds = context.classes
    .filter((schoolClass) =>
      allowedLevelIds.includes(schoolClass.academic_year_level_id),
    )
    .map((schoolClass) => schoolClass.id);
  let studentIds: string[] | undefined;
  if (filters.search?.trim()) {
    const term = filters.search.trim();
    const { data, error } = await supabase
      .from("students")
      .select("id")
      .eq("institution_id", institutionId)
      .or(
        `first_name.ilike.%${term}%,last_name.ilike.%${term}%,matricule.ilike.%${term}%`,
      );
    if (error) throw error;
    studentIds = (data ?? []).map((i) => i.id);
    if (!studentIds.length && mode !== "averages")
      return { rows: [], total: 0 };
  }
  if (mode === "appreciations") {
    const all = await listExpectedAppreciations(institutionId, yearId);
    const rows = all.filter(
      (item) =>
        (!studentIds || studentIds.includes(item.studentId)) &&
        (!filters.classId || item.classId === filters.classId) &&
        ((!filters.cycleId && !filters.levelId) ||
          allowedClassIds.includes(item.classId)) &&
        (!filters.periodId || item.periodId === filters.periodId) &&
        (!filters.state ||
          (filters.state === "complete"
            ? Boolean(item.appreciation)
            : !item.appreciation)),
    );
    return {
      rows: rows.slice(filters.first, filters.first + filters.rows),
      total: rows.length,
    };
  }
  if (mode === "postponed") {
    let notesQuery = supabase
      .from("gradebook_notes")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", yearId);
    if (filters.classId)
      notesQuery = notesQuery.eq("class_id", filters.classId);
    else if (filters.cycleId || filters.levelId)
      notesQuery = notesQuery.in("class_id", allowedClassIds);
    if (filters.periodId)
      notesQuery = notesQuery.eq("period_id", filters.periodId);
    const { data: notes, error: notesError } = await notesQuery;
    if (notesError) throw notesError;
    const noteIds = (notes ?? []).map((n) => n.id);
    if (!noteIds.length) return { rows: [], total: 0 };
    let query = supabase
      .from("note_results")
      .select("id", { count: "exact" })
      .eq("institution_id", institutionId)
      .eq("status", "postponed")
      .in("note_id", noteIds);
    if (studentIds) query = query.in("student_id", studentIds);
    query = query
      .order("updated_at", { ascending: false })
      .range(filters.first, filters.first + filters.rows - 1);
    const { data, count, error } = await query;
    if (error) throw error;
    const all = await listPostponedResults(institutionId, yearId);
    const ids = new Set((data ?? []).map((i) => i.id));
    return { rows: all.filter((i) => ids.has(i.id)), total: count ?? 0 };
  }
  const all = await listAverageControls(institutionId, yearId);
  const term = filters.search?.trim().toLocaleLowerCase("fr") ?? "";
  const rows = all.filter(
    (item) =>
      (!filters.classId || item.classId === filters.classId) &&
      ((!filters.cycleId && !filters.levelId) ||
        allowedClassIds.includes(item.classId)) &&
      (!filters.periodId || item.periodId === filters.periodId) &&
      (!filters.state || item.state === filters.state) &&
      (!term ||
        [item.className, item.subjectName, item.teacherName].some((value) =>
          value.toLocaleLowerCase("fr").includes(term),
        )),
  );
  return {
    rows: rows.slice(filters.first, filters.first + filters.rows),
    total: rows.length,
  };
}

async function listExpectedAppreciations(
  institutionId: string,
  yearId: string,
): Promise<AppreciationItem[]> {
  const courses = await listCourseSummaries(institutionId, yearId);
  const [periods, assignments, enrollments, students, stored] =
    await Promise.all([
      supabase
        .from("academic_periods")
        .select("id,cycle_id")
        .eq("institution_id", institutionId)
        .eq("academic_year_id", yearId),
      supabase
        .from("class_assignments")
        .select("class_id,enrollment_id")
        .eq("institution_id", institutionId)
        .eq("academic_year_id", yearId)
        .is("ends_on", null),
      supabase
        .from("enrollments")
        .select("id,student_id")
        .eq("institution_id", institutionId)
        .eq("academic_year_id", yearId)
        .eq("status", "confirmed"),
      supabase
        .from("students")
        .select("id,first_name,last_name,matricule")
        .eq("institution_id", institutionId),
      supabase
        .from("subject_appreciations")
        .select("*")
        .eq("institution_id", institutionId)
        .eq("academic_year_id", yearId),
    ]);
  for (const result of [periods, assignments, enrollments, students, stored])
    if (result.error) throw result.error;
  return courses.flatMap((course) => {
    const courseStudents = (assignments.data ?? []).flatMap((assignment) => {
      if (assignment.class_id !== course.classId) return [];
      const enrollment = enrollments.data?.find(
        (item) => item.id === assignment.enrollment_id,
      );
      const student = students.data?.find(
        (item) => item.id === enrollment?.student_id,
      );
      return student ? [student] : [];
    });
    return (periods.data ?? [])
      .filter(
        (period) =>
          period.cycle_id === course.cycleId &&
          (!course.allowedPeriodIds.length ||
            course.allowedPeriodIds.includes(period.id)),
      )
      .flatMap((period) =>
        courseStudents.map((student) => {
          const current = stored.data?.find(
            (item) =>
              item.period_id === period.id &&
              item.class_id === course.classId &&
              item.subject_id === course.subjectId &&
              item.student_id === student.id,
          );
          return {
            id: `${institutionId}:${yearId}:${period.id}:${course.classId}:${course.subjectId}:${student.id}`,
            appreciationId: current?.id,
            studentId: student.id,
            classId: course.classId,
            subjectId: course.subjectId,
            periodId: period.id,
            studentName: `${student.first_name} ${student.last_name}`,
            matricule: student.matricule,
            className: course.className,
            subjectName: course.subjectName,
            appreciation: current?.appreciation ?? "",
            updatedAt: current?.updated_at ?? "",
          };
        }),
      );
  });
}

export async function listPostponedResults(
  institutionId: string,
  yearId: string,
): Promise<PostponedResultItem[]> {
  const [results, notes, students, classes, subjects] = await Promise.all([
    supabase
      .from("note_results")
      .select("id,note_id,student_id")
      .eq("institution_id", institutionId)
      .eq("status", "postponed"),
    supabase
      .from("gradebook_notes")
      .select("id,academic_year_id,class_id,subject_id,label,note_date")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", yearId),
    supabase
      .from("students")
      .select("id,first_name,last_name,matricule")
      .eq("institution_id", institutionId),
    supabase
      .from("school_classes")
      .select("id,name")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", yearId),
    supabase
      .from("subjects")
      .select("id,name")
      .eq("institution_id", institutionId),
  ]);
  for (const result of [results, notes, students, classes, subjects])
    if (result.error) throw result.error;
  return (results.data ?? []).flatMap((result) => {
    const note = notes.data?.find((item) => item.id === result.note_id);
    const student = students.data?.find(
      (item) => item.id === result.student_id,
    );
    if (!note || !student) return [];
    return [
      {
        id: result.id,
        studentName: `${student.first_name} ${student.last_name}`,
        matricule: student.matricule,
        className:
          classes.data?.find((item) => item.id === note.class_id)?.name ?? "—",
        subjectName:
          subjects.data?.find((item) => item.id === note.subject_id)?.name ??
          "—",
        noteLabel: note.label,
        noteDate: note.note_date,
        impact: "Moyenne et bulletin bloqués",
      },
    ];
  });
}

export async function listAppreciations(
  institutionId: string,
  yearId: string,
): Promise<AppreciationItem[]> {
  const [items, students, classes, subjects] = await Promise.all([
    supabase
      .from("subject_appreciations")
      .select("*")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", yearId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("students")
      .select("id,first_name,last_name,matricule")
      .eq("institution_id", institutionId),
    supabase
      .from("school_classes")
      .select("id,name")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", yearId),
    supabase
      .from("subjects")
      .select("id,name")
      .eq("institution_id", institutionId),
  ]);
  for (const result of [items, students, classes, subjects])
    if (result.error) throw result.error;
  return (items.data ?? []).map((item) => {
    const student = students.data?.find(
      (entry) => entry.id === item.student_id,
    );
    return {
      id: item.id,
      studentName: student
        ? `${student.first_name} ${student.last_name}`
        : "Élève",
      matricule: student?.matricule ?? "—",
      className:
        classes.data?.find((entry) => entry.id === item.class_id)?.name ?? "—",
      subjectName:
        subjects.data?.find((entry) => entry.id === item.subject_id)?.name ??
        "—",
      appreciation: item.appreciation,
      updatedAt: item.updated_at,
    };
  });
}

export async function listAverageControls(
  institutionId: string,
  yearId: string,
): Promise<AverageControlItem[]> {
  const courses = await listCourseSummaries(institutionId, yearId);
  const [periods, notes, results, assignments, enrollments, assessmentTypes] =
    await Promise.all([
      supabase
        .from("academic_periods")
        .select("id,name,cycle_id")
        .eq("institution_id", institutionId)
        .eq("academic_year_id", yearId),
      supabase
        .from("gradebook_notes")
        .select("id,class_id,subject_id,period_id,note_type_id,scale_snapshot")
        .eq("institution_id", institutionId)
        .eq("academic_year_id", yearId),
      supabase
        .from("note_results")
        .select("note_id,student_id,value,status")
        .eq("institution_id", institutionId),
      supabase
        .from("class_assignments")
        .select("class_id,enrollment_id")
        .eq("institution_id", institutionId)
        .eq("academic_year_id", yearId)
        .is("ends_on", null),
      supabase
        .from("enrollments")
        .select("id")
        .eq("institution_id", institutionId)
        .eq("academic_year_id", yearId)
        .eq("status", "confirmed"),
      supabase
        .from("assessment_types")
        .select("id,code")
        .eq("institution_id", institutionId)
        .eq("academic_year_id", yearId),
    ]);
  for (const result of [
    periods,
    notes,
    results,
    assignments,
    enrollments,
    assessmentTypes,
  ])
    if (result.error) throw result.error;
  const formulas = new Map(
    await Promise.all(
      courses.map(
        async (course) =>
          [
            course.assignmentId,
            await resolveFormula({
              institutionId,
              yearId,
              cycleId: course.cycleId,
              levelId: course.levelId,
            }),
          ] as const,
      ),
    ),
  );
  const confirmed = new Set((enrollments.data ?? []).map((item) => item.id));
  return courses.flatMap((course) =>
    (periods.data ?? [])
      .filter(
        (period) =>
          period.cycle_id === course.cycleId &&
          (!course.allowedPeriodIds.length ||
            course.allowedPeriodIds.includes(period.id)),
      )
      .map((period) => {
        const formula = formulas.get(course.assignmentId) ?? null;
        const courseNotes = (notes.data ?? []).filter(
          (note) =>
            note.class_id === course.classId &&
            note.subject_id === course.subjectId &&
            note.period_id === period.id,
        );
        const noteIds = new Set(courseNotes.map((note) => note.id));
        const courseResults = (results.data ?? []).filter((result) =>
          noteIds.has(result.note_id),
        );
        const studentsCount = (assignments.data ?? []).filter(
          (item) =>
            item.class_id === course.classId &&
            confirmed.has(item.enrollment_id),
        ).length;
        const expectedResults = courseNotes.length * studentsCount;
        const postponedCount = courseResults.filter(
          (result) => result.status === "postponed",
        ).length;
        const absentCount = courseResults.filter(
          (result) => result.status === "absent",
        ).length;
        const exemptCount = courseResults.filter(
          (result) => result.status === "exempt",
        ).length;
        const missingCount = Math.max(
          0,
          expectedResults - courseResults.length,
        );
        const normalized = courseResults.flatMap((result) => {
          const note = courseNotes.find((item) => item.id === result.note_id);
          const assessmentType = assessmentTypes.data?.find(
            (item) => item.id === note?.note_type_id,
          );
          return result.value == null || !note || !assessmentType
            ? []
            : [
                {
                  value: result.value,
                  scale: note.scale_snapshot,
                  assessmentTypeCode: assessmentType.code,
                },
              ];
        });
        const calculation = formula
          ? calculateCourseAverage(normalized, formula.rules)
          : { average: null, missingTypeCodes: [] };
        const average = calculation.average;
        const anomalies = [
          ...(!formula ? ["Aucune formule applicable"] : []),
          ...(calculation.missingTypeCodes.length
            ? [
                `Note absente pour les variables : ${calculation.missingTypeCodes.join(", ")}`,
              ]
            : []),
          ...(calculation.error
            ? [`Formule invalide : ${calculation.error}`]
            : []),
          ...(courseNotes.length ? [] : ["Aucune évaluation créée"]),
          ...(postponedCount
            ? [`${postponedCount} résultat(s) reporté(s)`]
            : []),
          ...(missingCount ? [`${missingCount} note(s) non saisie(s)`] : []),
        ];
        return {
          id: `${course.assignmentId}:${period.id}`,
          classId: course.classId,
          className: course.className,
          subjectName: course.subjectName,
          teacherName: course.teacherName,
          coefficient: course.coefficient,
          periodId: period.id,
          periodName: period.name,
          formulaName: formula
            ? `${formula.name} v${formula.version}`
            : "Formule manquante",
          formulaExpression: formula
            ? `${formula.rules.expression} (${formula.source === "level" ? "niveau" : "cycle"})`
            : "Aucune affectation active au niveau ou au cycle",
          notesCount: courseNotes.length,
          expectedResults,
          enteredResults: courseResults.length,
          missingCount,
          postponedCount,
          absentCount,
          exemptCount,
          average,
          contribution: average === null ? null : average * course.coefficient,
          anomalies,
          state:
            courseNotes.length === 0
              ? ("not_started" as const)
              : anomalies.length
                ? ("incomplete" as const)
                : ("ready" as const),
        };
      }),
  );
}
