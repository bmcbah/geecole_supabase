import { supabase } from "../../../shared/lib/supabase/client";
import type {
  CourseSummary,
  GradebookStudent,
  NoteResultStatus,
} from "../domain/notes";

export async function listCourseSummaries(
  institutionId: string,
  yearId: string,
): Promise<CourseSummary[]> {
  const [assignments, classes, levels, cycles, subjects, people, scopes] =
    await Promise.all([
      supabase
        .from("pedagogical_assignments")
        .select("*")
        .eq("institution_id", institutionId)
        .eq("academic_year_id", yearId)
        .eq("is_active", true),
      supabase
        .from("school_classes")
        .select("id,name,academic_year_level_id")
        .eq("institution_id", institutionId)
        .eq("academic_year_id", yearId),
      supabase
        .from("academic_year_levels")
        .select("id,cycle_id,cycle_name_snapshot,level_name_snapshot")
        .eq("institution_id", institutionId)
        .eq("academic_year_id", yearId),
      supabase
        .from("academic_year_cycles")
        .select("cycle_id,grading_scale")
        .eq("institution_id", institutionId)
        .eq("academic_year_id", yearId),
      supabase
        .from("subjects")
        .select("id,name")
        .eq("institution_id", institutionId),
      supabase
        .from("people")
        .select("id,first_name,last_name")
        .eq("institution_id", institutionId),
      supabase
        .from("pedagogical_assignment_periods")
        .select("assignment_id,period_id"),
    ]);
  for (const result of [
    assignments,
    classes,
    levels,
    cycles,
    subjects,
    people,
    scopes,
  ])
    if (result.error) throw result.error;
  return (assignments.data ?? [])
    .filter((item) => item.subject_id)
    .map((item) => {
      const schoolClass = classes.data?.find(
        (entry) => entry.id === item.class_id,
      );
      const level = levels.data?.find(
        (entry) => entry.id === schoolClass?.academic_year_level_id,
      );
      return {
        assignmentId: item.id,
        classId: item.class_id,
        className:
          classes.data?.find((entry) => entry.id === item.class_id)?.name ??
          "Classe",
        cycleId: level?.cycle_id ?? "",
        levelId: level?.id ?? "",
        cycleName: level?.cycle_name_snapshot ?? "Cycle",
        gradingScale:
          cycles.data?.find((cycle) => cycle.cycle_id === level?.cycle_id)
            ?.grading_scale ?? 20,
        levelName: level?.level_name_snapshot ?? "Niveau",
        subjectId: item.subject_id as string,
        subjectName:
          subjects.data?.find((entry) => entry.id === item.subject_id)?.name ??
          "Matière",
        teacherId: item.teacher_id,
        teacherName: (() => {
          const person = people.data?.find(
            (entry) => entry.id === item.teacher_id,
          );
          return person
            ? `${person.first_name} ${person.last_name}`
            : "Enseignant non renseigné";
        })(),
        coefficient: item.coefficient,
        allowedPeriodIds: item.all_periods
          ? []
          : (scopes.data ?? [])
              .filter((scope) => scope.assignment_id === item.id)
              .map((scope) => scope.period_id),
      };
    });
}

export async function listClassStudents(
  classId: string,
): Promise<GradebookStudent[]> {
  const assignments = await supabase
    .from("class_assignments")
    .select("enrollment_id")
    .eq("class_id", classId)
    .is("ends_on", null);
  if (assignments.error) throw assignments.error;
  const enrollmentIds = assignments.data.map((item) => item.enrollment_id);
  if (!enrollmentIds.length) return [];
  const enrollments = await supabase
    .from("enrollments")
    .select("student_id")
    .in("id", enrollmentIds)
    .eq("status", "confirmed");
  if (enrollments.error) throw enrollments.error;
  const studentIds = enrollments.data.map((item) => item.student_id);
  if (!studentIds.length) return [];
  const students = await supabase
    .from("students")
    .select("id,matricule,first_name,last_name")
    .in("id", studentIds)
    .order("last_name");
  if (students.error) throw students.error;
  return students.data.map((student) => ({
    studentId: student.id,
    matricule: student.matricule,
    name: `${student.first_name} ${student.last_name}`,
  }));
}

export async function listCourseNotes(
  yearId: string,
  periodId: string,
  course: CourseSummary,
) {
  const { data, error } = await supabase
    .from("gradebook_notes")
    .select("*")
    .eq("academic_year_id", yearId)
    .eq("period_id", periodId)
    .eq("class_id", course.classId)
    .eq("subject_id", course.subjectId)
    .order("note_date");
  if (error) throw error;
  return data;
}

export async function listNoteResults(noteIds: string[]) {
  if (!noteIds.length) return [];
  const { data, error } = await supabase
    .from("note_results")
    .select("*")
    .in("note_id", noteIds);
  if (error) throw error;
  return data;
}

export async function listCourseAppreciations(input: {
  institutionId: string;
  yearId: string;
  periodId: string;
  course: CourseSummary;
}) {
  const { data, error } = await supabase
    .from("subject_appreciations")
    .select("*")
    .eq("institution_id", input.institutionId)
    .eq("academic_year_id", input.yearId)
    .eq("period_id", input.periodId)
    .eq("class_id", input.course.classId)
    .eq("subject_id", input.course.subjectId);
  if (error) throw error;
  return data;
}

export async function saveCourseAppreciation(input: {
  institutionId: string;
  yearId: string;
  periodId: string;
  course: CourseSummary;
  studentId: string;
  appreciation: string;
}) {
  const { error } = await supabase.from("subject_appreciations").upsert(
    {
      institution_id: input.institutionId,
      academic_year_id: input.yearId,
      period_id: input.periodId,
      class_id: input.course.classId,
      subject_id: input.course.subjectId,
      student_id: input.studentId,
      appreciation: input.appreciation.trim(),
    },
    { onConflict: "period_id,class_id,subject_id,student_id" },
  );
  if (error) throw error;
}

export async function changePeriodStatus(
  periodId: string,
  status: "open" | "closed",
) {
  const { error } = await supabase.rpc("change_academic_period_status", {
    target_period_id: periodId,
    target_status: status,
  });
  if (error) throw error;
}

export type PeriodManagementRow = {
  id: string;
  cycleId: string;
  cycleName: string;
  name: string;
  sequence: number;
  startsOn: string;
  endsOn: string;
  status: "planned" | "open" | "closed";
};

export async function listPeriodsForManagement(
  institutionId: string,
  yearId: string,
): Promise<PeriodManagementRow[]> {
  const [periods, cycles] = await Promise.all([
    supabase
      .from("academic_periods")
      .select("id,cycle_id,name,sequence,starts_on,ends_on,status")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", yearId)
      .order("sequence"),
    supabase
      .from("academic_cycles")
      .select("id,name")
      .eq("institution_id", institutionId),
  ]);
  if (periods.error) throw periods.error;
  if (cycles.error) throw cycles.error;
  return (periods.data ?? []).map((period) => ({
    id: period.id,
    cycleId: period.cycle_id,
    cycleName:
      cycles.data?.find((cycle) => cycle.id === period.cycle_id)?.name ??
      "Cycle",
    name: period.name,
    sequence: period.sequence,
    startsOn: period.starts_on,
    endsOn: period.ends_on,
    status: period.status as PeriodManagementRow["status"],
  }));
}

export async function createGradebookNote(input: {
  institutionId: string;
  yearId: string;
  periodId: string;
  course: CourseSummary;
  noteTypeId: string;
  label: string;
  code: string;
  noteDate: string;
  comment?: string;
}) {
  const { data, error } = await supabase
    .from("gradebook_notes")
    .insert({
      institution_id: input.institutionId,
      academic_year_id: input.yearId,
      period_id: input.periodId,
      class_id: input.course.classId,
      subject_id: input.course.subjectId,
      teacher_id: input.course.teacherId,
      note_type_id: input.noteTypeId,
      label: input.label,
      code: input.code.toUpperCase(),
      note_date: input.noteDate,
      internal_comment: input.comment || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveNoteResult(input: {
  institutionId: string;
  noteId: string;
  studentId: string;
  value?: number | null;
  status?: NoteResultStatus | null;
}) {
  const { error } = await supabase.from("note_results").upsert(
    {
      institution_id: input.institutionId,
      note_id: input.noteId,
      student_id: input.studentId,
      value: input.value ?? null,
      status: input.status ?? null,
    },
    { onConflict: "note_id,student_id,is_makeup" },
  );
  if (error) throw error;
}

export async function listActiveNoteTypes(
  institutionId: string,
  yearId: string,
) {
  const { data, error } = await supabase
    .from("assessment_types")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("academic_year_id", yearId)
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data;
}

export async function listAssignmentOptions(
  institutionId: string,
  yearId: string,
) {
  const [classes, levels, subjects, teacherCandidates, periods] =
    await Promise.all([
      supabase
        .from("school_classes")
        .select("id,name,academic_year_level_id")
        .eq("institution_id", institutionId)
        .eq("academic_year_id", yearId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("academic_year_levels")
        .select("id,cycle_id")
        .eq("institution_id", institutionId)
        .eq("academic_year_id", yearId),
      supabase
        .from("subjects")
        .select("id,name")
        .eq("institution_id", institutionId)
        .eq("is_active", true)
        .order("name"),
      supabase.rpc("list_teacher_candidates", {
        target_institution_id: institutionId,
      }),
      supabase
        .from("academic_periods")
        .select("id,name,cycle_id")
        .eq("institution_id", institutionId)
        .eq("academic_year_id", yearId)
        .order("sequence"),
    ]);
  for (const result of [classes, levels, subjects, teacherCandidates, periods])
    if (result.error) throw result.error;
  return {
    classes: (classes.data ?? []).map((item) => ({
      ...item,
      cycle_id:
        levels.data?.find((level) => level.id === item.academic_year_level_id)
          ?.cycle_id ?? "",
    })),
    subjects: subjects.data ?? [],
    teachers: teacherCandidates.data ?? [],
    periods: periods.data ?? [],
  };
}

export async function publishCourseNotes(noteIds: string[]) {
  if (!noteIds.length) return;
  const { error } = await supabase
    .from("gradebook_notes")
    .update({ is_published: true })
    .in("id", noteIds);
  if (error) throw error;
}

export type CourseAuditEvent = {
  id: number;
  entity_type: string;
  action: string;
  before_data: unknown;
  after_data: unknown;
  actorName: string;
  created_at: string;
};

export async function listCourseAudit(
  entityIds: string[],
): Promise<CourseAuditEvent[]> {
  if (!entityIds.length) return [];
  const { data, error } = await supabase
    .from("notes_audit_log")
    .select("*")
    .in("entity_id", entityIds)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const actorIds = [
    ...new Set(
      (data ?? []).flatMap((event) => (event.actor_id ? [event.actor_id] : [])),
    ),
  ];
  const actors = actorIds.length
    ? await supabase
        .from("people")
        .select("auth_user_id,first_name,last_name")
        .in("auth_user_id", actorIds)
    : { data: [], error: null };
  if (actors.error) throw actors.error;
  return (data ?? []).map((event) => {
    const actor = actors.data?.find(
      (person) => person.auth_user_id === event.actor_id,
    );
    return {
      ...event,
      actorName: actor
        ? `${actor.first_name} ${actor.last_name}`
        : "Utilisateur système",
    };
  });
}

export async function createPedagogicalAssignment(input: {
  institutionId: string;
  yearId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  coefficient: number;
  periodIds: string[];
}) {
  const { data, error } = await supabase
    .from("pedagogical_assignments")
    .insert({
      institution_id: input.institutionId,
      academic_year_id: input.yearId,
      class_id: input.classId,
      subject_id: input.subjectId,
      teacher_id: input.teacherId,
      coefficient: input.coefficient,
      all_periods: input.periodIds.length === 0,
    })
    .select()
    .single();
  if (error) throw error;
  if (input.periodIds.length) {
    const scope = await supabase.from("pedagogical_assignment_periods").insert(
      input.periodIds.map((periodId) => ({
        assignment_id: data.id,
        period_id: periodId,
      })),
    );
    if (scope.error) throw scope.error;
  }
  return data;
}
