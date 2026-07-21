import { supabase } from "../../../shared/lib/supabase/client";
import type { Json } from "../../../shared/lib/supabase/database.types";
import { calculateCourseAverage } from "../domain/grading-formula";
import { resolveFormula } from "./grading-formulas.service";

export type BulletinBatchRow = {
  id: string;
  periodName: string;
  scope: string;
  status: string;
  total: number;
  generated: number;
  blocked: number;
  createdAt: string;
};
export type GenerationScope =
  "school" | "cycle" | "level" | "class" | "student";
export type BulletinGenerationItem = {
  id: string;
  studentName: string;
  matricule: string;
  className: string;
  status: string;
  issueCode: string | null;
  message: string | null;
};
export type BulletinRow = {
  id: string;
  studentName: string;
  matricule: string;
  className: string;
  periodName: string;
  version: number;
  status:
    | "generated"
    | "pending_validation"
    | "validated"
    | "published"
    | "rejected"
    | "replaced";
  createdAt: string;
  snapshot: Json;
};
export type ServerPage<T> = { rows: T[]; total: number };
export type BulletinListFilters = {
  first: number;
  rows: number;
  search?: string;
  status?: string;
  statuses?: BulletinRow["status"][];
  classId?: string;
  periodId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortField?: string;
  sortOrder?: 1 | -1 | 0;
};

export async function listGenerationContext(
  institutionId: string,
  yearId: string,
) {
  const [periods, cycles, levels, classes, enrollments, assignments, students] =
    await Promise.all([
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
        .select("id,cycle_id,level_name_snapshot,sort_order")
        .eq("institution_id", institutionId)
        .eq("academic_year_id", yearId)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("school_classes")
        .select("id,name,academic_year_level_id")
        .eq("institution_id", institutionId)
        .eq("academic_year_id", yearId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("enrollments")
        .select("id,student_id,academic_year_level_id")
        .eq("institution_id", institutionId)
        .eq("academic_year_id", yearId)
        .eq("status", "confirmed"),
      supabase
        .from("class_assignments")
        .select("enrollment_id,class_id")
        .eq("institution_id", institutionId)
        .eq("academic_year_id", yearId)
        .is("ends_on", null),
      supabase
        .from("students")
        .select("id,matricule,first_name,last_name")
        .eq("institution_id", institutionId)
        .eq("status", "active")
        .order("last_name"),
    ]);
  for (const result of [
    periods,
    cycles,
    levels,
    classes,
    enrollments,
    assignments,
    students,
  ])
    if (result.error) throw result.error;
  return {
    periods: (periods.data ?? []).map((period) => ({
      ...period,
      label: `${cycles.data?.find((cycle) => cycle.id === period.cycle_id)?.name ?? "Cycle"} — ${period.name}`,
    })),
    cycles: cycles.data ?? [],
    levels: levels.data ?? [],
    classes: classes.data ?? [],
    students: (enrollments.data ?? []).flatMap((enrollment) => {
      const student = students.data?.find(
        (item) => item.id === enrollment.student_id,
      );
      const assignment = assignments.data?.find(
        (item) => item.enrollment_id === enrollment.id,
      );
      return student && assignment
        ? [
            {
              id: student.id,
              enrollmentId: enrollment.id,
              levelId: enrollment.academic_year_level_id,
              classId: assignment.class_id,
              matricule: student.matricule,
              name: `${student.first_name} ${student.last_name}`,
            },
          ]
        : [];
    }),
  };
}

export async function listGenerationItems(
  batchId: string,
): Promise<BulletinGenerationItem[]> {
  const { data: items, error } = await supabase
    .from("bulletin_generation_items")
    .select("id,student_id,class_id,status,issue_code,message")
    .eq("batch_id", batchId)
    .order("created_at");
  if (error) throw error;
  const studentIds = [...new Set((items ?? []).map((item) => item.student_id))];
  const classIds = [
    ...new Set(
      (items ?? []).flatMap((item) => (item.class_id ? [item.class_id] : [])),
    ),
  ];
  const [students, classes] = await Promise.all([
    studentIds.length
      ? supabase
          .from("students")
          .select("id,matricule,first_name,last_name")
          .in("id", studentIds)
      : Promise.resolve({ data: [], error: null }),
    classIds.length
      ? supabase.from("school_classes").select("id,name").in("id", classIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (students.error) throw students.error;
  if (classes.error) throw classes.error;
  return (items ?? []).map((item) => {
    const student = students.data?.find((row) => row.id === item.student_id);
    return {
      id: item.id,
      studentName: student
        ? `${student.first_name} ${student.last_name}`
        : "Élève",
      matricule: student?.matricule ?? "—",
      className:
        classes.data?.find((row) => row.id === item.class_id)?.name ?? "—",
      status: item.status,
      issueCode: item.issue_code,
      message: item.message,
    };
  });
}

export async function listBatches(
  institutionId: string,
  yearId: string,
  filters: BulletinListFilters = { first: 0, rows: 10 },
): Promise<ServerPage<BulletinBatchRow>> {
  let searchedPeriodIds: string[] | undefined;
  if (filters.search?.trim()) {
    const { data, error } = await supabase
      .from("academic_periods")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", yearId)
      .ilike("name", `%${filters.search.trim()}%`);
    if (error) throw error;
    searchedPeriodIds = (data ?? []).map((item) => item.id);
    if (!searchedPeriodIds.length) return { rows: [], total: 0 };
  }
  let query = supabase
    .from("bulletin_generation_batches")
    .select("*", { count: "exact" })
    .eq("institution_id", institutionId)
    .eq("academic_year_id", yearId);
  if (searchedPeriodIds) query = query.in("period_id", searchedPeriodIds);
  if (filters.status)
    query = query.eq(
      "status",
      filters.status as "running" | "completed" | "partial" | "failed",
    );
  if (filters.periodId) query = query.eq("period_id", filters.periodId);
  if (filters.dateFrom)
    query = query.gte("created_at", `${filters.dateFrom}T00:00:00`);
  if (filters.dateTo)
    query = query.lte("created_at", `${filters.dateTo}T23:59:59`);
  query = query
    .order(filters.sortField === "total" ? "total_count" : "created_at", {
      ascending: filters.sortOrder === 1,
    })
    .range(filters.first, filters.first + filters.rows - 1);
  const [batches, periods] = await Promise.all([
    query,
    supabase
      .from("academic_periods")
      .select("id,name")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", yearId),
  ]);
  if (batches.error) throw batches.error;
  if (periods.error) throw periods.error;
  return {
    rows: (batches.data ?? []).map((row) => ({
      id: row.id,
      periodName:
        periods.data?.find((p) => p.id === row.period_id)?.name ?? "—",
      scope:
        (
          {
            school: "Toute l’école",
            cycle: "Cycle",
            level: "Niveau",
            class: "Classe",
            student: "Élève",
          } as const
        )[row.scope_type] ?? "Périmètre",
      status: row.status,
      total: row.total_count,
      generated: row.generated_count,
      blocked: row.blocked_count,
      createdAt: row.created_at,
    })),
    total: batches.count ?? 0,
  };
}

export async function generateBulletins(input: {
  institutionId: string;
  yearId: string;
  periodId: string;
  scope: GenerationScope;
  scopeId?: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const { data: bulletinSettings, error: settingsError } = await supabase
    .from("pedagogical_settings")
    .select(
      "bulletin_title,bulletin_orientation,bulletin_show_rank,bulletin_show_appreciations,bulletin_teacher_signature_label,bulletin_direction_signature_label,bulletin_footer",
    )
    .eq("institution_id", input.institutionId)
    .eq("academic_year_id", input.yearId)
    .maybeSingle();
  if (settingsError) throw settingsError;
  const { data: batch, error: batchError } = await supabase
    .from("bulletin_generation_batches")
    .insert({
      institution_id: input.institutionId,
      academic_year_id: input.yearId,
      period_id: input.periodId,
      scope_type: input.scope,
      scope_ids: input.scopeId ? [input.scopeId] : [],
      initiated_by: auth.user?.id,
    })
    .select("id")
    .single();
  if (batchError) throw batchError;
  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select("id,student_id")
    .eq("institution_id", input.institutionId)
    .eq("academic_year_id", input.yearId)
    .eq("status", "confirmed");
  if (error) throw error;
  const { data: assignments, error: assignmentError } = await supabase
    .from("class_assignments")
    .select("enrollment_id,class_id")
    .eq("institution_id", input.institutionId)
    .eq("academic_year_id", input.yearId)
    .is("ends_on", null);
  if (assignmentError) throw assignmentError;
  const { data: classRows, error: classesError } = await supabase
    .from("school_classes")
    .select("id,academic_year_level_id")
    .eq("institution_id", input.institutionId)
    .eq("academic_year_id", input.yearId);
  if (classesError) throw classesError;
  const { data: levelRows, error: levelsError } = await supabase
    .from("academic_year_levels")
    .select("id,cycle_id")
    .eq("institution_id", input.institutionId)
    .eq("academic_year_id", input.yearId);
  if (levelsError) throw levelsError;
  const selected = (enrollments ?? []).flatMap((enrollment) => {
    const assignment = assignments?.find(
      (item) => item.enrollment_id === enrollment.id,
    );
    const schoolClass = classRows?.find(
      (item) => item.id === assignment?.class_id,
    );
    const level = levelRows?.find(
      (item) => item.id === schoolClass?.academic_year_level_id,
    );
    const matches =
      input.scope === "school" ||
      (input.scope === "cycle" && level?.cycle_id === input.scopeId) ||
      (input.scope === "level" &&
        schoolClass?.academic_year_level_id === input.scopeId) ||
      (input.scope === "class" && assignment?.class_id === input.scopeId) ||
      (input.scope === "student" && enrollment.student_id === input.scopeId);
    return assignment && matches
      ? [{ ...enrollment, classId: assignment.class_id }]
      : [];
  });
  let generated = 0;
  let blocked = 0;
  const selectedLevelIds = [
    ...new Set(
      selected.flatMap((enrollment) => {
        const schoolClass = classRows?.find(
          (item) => item.id === enrollment.classId,
        );
        return schoolClass ? [schoolClass.academic_year_level_id] : [];
      }),
    ),
  ];
  const formulasByLevel = new Map(
    await Promise.all(
      selectedLevelIds.flatMap((levelId) => {
        const level = levelRows?.find((item) => item.id === levelId);
        return level
          ? [
              resolveFormula({
                institutionId: input.institutionId,
                yearId: input.yearId,
                cycleId: level.cycle_id,
                levelId: level.id,
              }).then((formula) => [level.id, formula] as const),
            ]
          : [];
      }),
    ),
  );
  for (const enrollment of selected) {
    const schoolClass = classRows?.find(
      (item) => item.id === enrollment.classId,
    );
    const level = levelRows?.find(
      (item) => item.id === schoolClass?.academic_year_level_id,
    );
    const formula = level ? (formulasByLevel.get(level.id) ?? null) : null;
    const { data: notes } = await supabase
      .from("gradebook_notes")
      .select("id,label,subject_id,note_type_id,scale_snapshot")
      .eq("period_id", input.periodId)
      .eq("class_id", enrollment.classId);
    const noteIds = (notes ?? []).map((n) => n.id);
    const { data: results } = noteIds.length
      ? await supabase
          .from("note_results")
          .select("note_id,value,status,comment")
          .eq("student_id", enrollment.student_id)
          .in("note_id", noteIds)
      : { data: [] };
    const missingNoteIds = noteIds.filter(
      (noteId) => !(results ?? []).some((result) => result.note_id === noteId),
    );
    const postponed = (results ?? []).some(
      (result) => result.status === "postponed",
    );
    const blockingIssue = !formula
      ? {
          code: "FORMULA_MISSING",
          message:
            "Aucune formule active n’est affectée à ce niveau ni à son cycle.",
        }
      : !noteIds.length
        ? {
            code: "NO_ASSESSMENT",
            message:
              "Aucune évaluation n’existe pour cette classe et cette période.",
          }
        : missingNoteIds.length
          ? {
              code: "MISSING_RESULTS",
              message: `${missingNoteIds.length} note(s) obligatoire(s) ne sont pas renseignée(s).`,
            }
          : postponed
            ? {
                code: "POSTPONED_RESULT",
                message: "Un résultat reporté bloque le calcul.",
              }
            : null;
    if (blockingIssue) {
      blocked += 1;
      const { error: itemError } = await supabase
        .from("bulletin_generation_items")
        .insert({
          institution_id: input.institutionId,
          batch_id: batch.id,
          enrollment_id: enrollment.id,
          student_id: enrollment.student_id,
          class_id: enrollment.classId,
          status: "blocked",
          issue_code: blockingIssue.code,
          message: blockingIssue.message,
        });
      if (itemError) throw itemError;
      continue;
    }
    const subjectIds = [
      ...new Set((notes ?? []).map((note) => note.subject_id)),
    ];
    const [subjects, coefficients, appreciations, assessmentTypes] =
      await Promise.all([
        subjectIds.length
          ? supabase.from("subjects").select("id,name").in("id", subjectIds)
          : Promise.resolve({ data: [], error: null }),
        subjectIds.length
          ? supabase
              .from("pedagogical_assignments")
              .select("subject_id,coefficient")
              .eq("academic_year_id", input.yearId)
              .eq("class_id", enrollment.classId)
              .in("subject_id", subjectIds)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("subject_appreciations")
          .select("subject_id,appreciation")
          .eq("period_id", input.periodId)
          .eq("student_id", enrollment.student_id),
        supabase
          .from("assessment_types")
          .select("id,code")
          .eq("academic_year_id", input.yearId),
      ]);
    if (subjects.error) throw subjects.error;
    if (coefficients.error) throw coefficients.error;
    if (appreciations.error) throw appreciations.error;
    if (assessmentTypes.error) throw assessmentTypes.error;
    const missingFormulaTypes = new Set<string>();
    const formulaErrors = new Set<string>();
    const subjectLines = subjectIds.map((subjectId) => {
      const subjectNotes = (notes ?? []).filter(
        (note) => note.subject_id === subjectId,
      );
      const values = subjectNotes.flatMap((note) => {
        const result = (results ?? []).find((item) => item.note_id === note.id);
        const assessmentType = assessmentTypes.data?.find(
          (item) => item.id === note.note_type_id,
        );
        return result?.value == null || !assessmentType
          ? []
          : [
              {
                value: result.value,
                scale: note.scale_snapshot,
                assessmentTypeCode: assessmentType.code,
              },
            ];
      });
      const calculation = calculateCourseAverage(values, formula!.rules);
      calculation.missingTypeCodes.forEach((code) =>
        missingFormulaTypes.add(code),
      );
      if (calculation.error) formulaErrors.add(calculation.error);
      const average = calculation.average;
      return {
        subject_id: subjectId,
        name:
          subjects.data?.find((item) => item.id === subjectId)?.name ??
          "Matière",
        coefficient:
          coefficients.data?.find((item) => item.subject_id === subjectId)
            ?.coefficient ?? 1,
        average,
        appreciation:
          appreciations.data?.find((item) => item.subject_id === subjectId)
            ?.appreciation ?? "",
      };
    });
    const missingFormulaType = [...missingFormulaTypes][0];
    if (missingFormulaType) {
      blocked += 1;
      const { error: itemError } = await supabase
        .from("bulletin_generation_items")
        .insert({
          institution_id: input.institutionId,
          batch_id: batch.id,
          enrollment_id: enrollment.id,
          student_id: enrollment.student_id,
          class_id: enrollment.classId,
          status: "blocked",
          issue_code: "FORMULA_TYPE_WEIGHT_MISSING",
          message: `La variable ${missingFormulaType} de la formule ${formula!.name} v${formula!.version} ne possède aucune note.`,
        });
      if (itemError) throw itemError;
      continue;
    }
    const formulaError = [...formulaErrors][0];
    if (formulaError) {
      blocked += 1;
      const { error: itemError } = await supabase
        .from("bulletin_generation_items")
        .insert({
          institution_id: input.institutionId,
          batch_id: batch.id,
          enrollment_id: enrollment.id,
          student_id: enrollment.student_id,
          class_id: enrollment.classId,
          status: "blocked",
          issue_code: "FORMULA_INVALID",
          message: `La formule ${formula!.name} v${formula!.version} est invalide : ${formulaError}.`,
        });
      if (itemError) throw itemError;
      continue;
    }
    const calculable = subjectLines.filter((line) => line.average !== null);
    const coefficientTotal = calculable.reduce(
      (sum, line) => sum + line.coefficient,
      0,
    );
    const generalAverage = coefficientTotal
      ? calculable.reduce(
          (sum, line) => sum + (line.average ?? 0) * line.coefficient,
          0,
        ) / coefficientTotal
      : null;
    const { data: previous } = await supabase
      .from("bulletin_versions")
      .select("version")
      .eq("enrollment_id", enrollment.id)
      .eq("period_id", input.periodId)
      .order("version", { ascending: false })
      .limit(1);
    const { data: bulletin, error: bulletinError } = await supabase
      .from("bulletin_versions")
      .insert({
        institution_id: input.institutionId,
        academic_year_id: input.yearId,
        period_id: input.periodId,
        enrollment_id: enrollment.id,
        student_id: enrollment.student_id,
        class_id: enrollment.classId,
        batch_id: batch.id,
        version: (previous?.[0]?.version ?? 0) + 1,
        snapshot: {
          subjects: subjectLines,
          general_average: generalAverage,
          generated_at: new Date().toISOString(),
          display: bulletinSettings,
          formula: {
            series_id: formula!.seriesId,
            version_id: formula!.versionId,
            code: formula!.code,
            name: formula!.name,
            version: formula!.version,
            source: formula!.source,
            rules: formula!.rules,
          },
        },
      })
      .select("id")
      .single();
    if (bulletinError) throw bulletinError;
    generated += 1;
    const { error: itemError } = await supabase
      .from("bulletin_generation_items")
      .insert({
        institution_id: input.institutionId,
        batch_id: batch.id,
        enrollment_id: enrollment.id,
        student_id: enrollment.student_id,
        class_id: enrollment.classId,
        status: "generated",
        bulletin_version_id: bulletin.id,
      });
    if (itemError) throw itemError;
  }
  const status =
    blocked && generated ? "partial" : blocked ? "failed" : "completed";
  const { error: updateError } = await supabase
    .from("bulletin_generation_batches")
    .update({
      status,
      total_count: selected.length,
      generated_count: generated,
      blocked_count: blocked,
      completed_at: new Date().toISOString(),
    })
    .eq("id", batch.id);
  if (updateError) throw updateError;
  return { generated, blocked };
}

export async function listBulletins(
  institutionId: string,
  yearId: string,
  filters: BulletinListFilters = { first: 0, rows: 10 },
): Promise<ServerPage<BulletinRow>> {
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
    studentIds = (data ?? []).map((item) => item.id);
    if (!studentIds.length) return { rows: [], total: 0 };
  }
  let query = supabase
    .from("bulletin_versions")
    .select("*", { count: "exact" })
    .eq("institution_id", institutionId)
    .eq("academic_year_id", yearId);
  if (studentIds) query = query.in("student_id", studentIds);
  if (filters.status)
    query = query.eq("status", filters.status as BulletinRow["status"]);
  if (filters.statuses?.length) query = query.in("status", filters.statuses);
  if (filters.classId) query = query.eq("class_id", filters.classId);
  if (filters.periodId) query = query.eq("period_id", filters.periodId);
  if (filters.dateFrom)
    query = query.gte("created_at", `${filters.dateFrom}T00:00:00`);
  if (filters.dateTo)
    query = query.lte("created_at", `${filters.dateTo}T23:59:59`);
  const sortable: Record<string, string> = {
    version: "version",
    createdAt: "created_at",
    status: "status",
  };
  query = query
    .order(sortable[filters.sortField ?? ""] ?? "created_at", {
      ascending: filters.sortOrder === 1,
    })
    .range(filters.first, filters.first + filters.rows - 1);
  const [versions, students, classes, periods] = await Promise.all([
    query,
    supabase
      .from("students")
      .select("id,first_name,last_name,matricule")
      .eq("institution_id", institutionId),
    supabase
      .from("school_classes")
      .select("id,name")
      .eq("academic_year_id", yearId),
    supabase
      .from("academic_periods")
      .select("id,name")
      .eq("academic_year_id", yearId),
  ]);
  for (const result of [versions, students, classes, periods])
    if (result.error) throw result.error;
  return {
    rows: (versions.data ?? []).map((row) => {
      const student = students.data?.find((item) => item.id === row.student_id);
      return {
        id: row.id,
        studentName: student
          ? `${student.first_name} ${student.last_name}`
          : "Élève",
        matricule: student?.matricule ?? "—",
        className:
          classes.data?.find((item) => item.id === row.class_id)?.name ?? "—",
        periodName:
          periods.data?.find((item) => item.id === row.period_id)?.name ?? "—",
        version: row.version,
        status: row.status,
        createdAt: row.created_at,
        snapshot: row.snapshot,
      };
    }),
    total: versions.count ?? 0,
  };
}

export async function changeBulletinStatus(
  id: string,
  status: BulletinRow["status"],
  comment?: string,
) {
  if (status === "rejected" && (!comment || comment.trim().length < 3))
    throw new Error("Le motif de rejet est obligatoire.");
  const { data: auth } = await supabase.auth.getUser();
  const now = new Date().toISOString();
  const patch =
    status === "validated"
      ? {
          status,
          validation_comment: comment ?? null,
          validated_by: auth.user?.id,
          validated_at: now,
        }
      : status === "published"
        ? { status, published_by: auth.user?.id, published_at: now }
        : { status, validation_comment: comment ?? null };
  const { error } = await supabase
    .from("bulletin_versions")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}
