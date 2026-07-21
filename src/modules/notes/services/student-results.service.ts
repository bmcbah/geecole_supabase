import { supabase } from "../../../shared/lib/supabase/client";
import type { Json } from "../../../shared/lib/supabase/database.types";

export type StudentNoteSummary = {
  id: string;
  label: string;
  subjectName: string;
  periodName: string;
  score: number | null;
  scale: number;
  status: string | null;
  date: string;
};

export type StudentBulletinSummary = {
  id: string;
  periodName: string;
  version: number;
  status: string;
  snapshot: Json;
  createdAt: string;
};

export async function listStudentResults(
  institutionId: string,
  yearId: string,
  studentId: string,
) {
  const [resultsResponse, bulletinsResponse] = await Promise.all([
    supabase
      .from("note_results")
      .select("id,note_id,value,status")
      .eq("institution_id", institutionId)
      .eq("student_id", studentId),
    supabase
      .from("bulletin_versions")
      .select("id,period_id,version,status,snapshot,created_at")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", yearId)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }),
  ]);
  if (resultsResponse.error) throw resultsResponse.error;
  if (bulletinsResponse.error) throw bulletinsResponse.error;

  const noteIds = (resultsResponse.data ?? []).map((result) => result.note_id);
  const { data: notes, error: notesError } = noteIds.length
    ? await supabase
        .from("gradebook_notes")
        .select("id,label,subject_id,period_id,note_date,scale_snapshot")
        .eq("academic_year_id", yearId)
        .in("id", noteIds)
    : { data: [], error: null };
  if (notesError) throw notesError;

  const subjectIds = [...new Set((notes ?? []).map((note) => note.subject_id))];
  const periodIds = [
    ...new Set([
      ...(notes ?? []).map((note) => note.period_id),
      ...(bulletinsResponse.data ?? []).map((bulletin) => bulletin.period_id),
    ]),
  ];
  const [subjectsResponse, periodsResponse] = await Promise.all([
    subjectIds.length
      ? supabase.from("subjects").select("id,name").in("id", subjectIds)
      : Promise.resolve({ data: [], error: null }),
    periodIds.length
      ? supabase.from("academic_periods").select("id,name").in("id", periodIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (subjectsResponse.error) throw subjectsResponse.error;
  if (periodsResponse.error) throw periodsResponse.error;

  const noteRows: StudentNoteSummary[] = (resultsResponse.data ?? []).flatMap(
    (result) => {
      const note = (notes ?? []).find((item) => item.id === result.note_id);
      if (!note) return [];
      return [
        {
          id: result.id,
          label: note.label,
          subjectName:
            subjectsResponse.data?.find((item) => item.id === note.subject_id)
              ?.name ?? "Matière",
          periodName:
            periodsResponse.data?.find((item) => item.id === note.period_id)
              ?.name ?? "Période",
          score: result.value,
          scale: note.scale_snapshot,
          status: result.status,
          date: note.note_date,
        },
      ];
    },
  );

  const bulletinRows: StudentBulletinSummary[] = (
    bulletinsResponse.data ?? []
  ).map((bulletin) => ({
    id: bulletin.id,
    periodName:
      periodsResponse.data?.find((item) => item.id === bulletin.period_id)
        ?.name ?? "Période",
    version: bulletin.version,
    status: bulletin.status,
    snapshot: bulletin.snapshot,
    createdAt: bulletin.created_at,
  }));

  return { notes: noteRows, bulletins: bulletinRows };
}
