import { supabase } from "../../../shared/lib/supabase/client";
import { listPeople } from "../../settings/services/annual-settings.service";

export type TeacherEmploymentStatus = "permanent" | "contract" | "vacation" | "intern" | "inactive";

export interface TeacherProfile {
  id: string;
  institution_id: string;
  academic_year_id: string;
  teacher_user_id: string;
  employee_number: string | null;
  specialty: string | null;
  employment_status: TeacherEmploymentStatus;
  hired_on: string | null;
  left_on: string | null;
  notes: string | null;
  is_active: boolean;
}

export interface TeacherProfileRow extends TeacherProfile {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
}

export async function listTeacherCandidates(institutionId: string) {
  const people = await listPeople(institutionId);
  return people.filter((person) => person.roles.includes("teacher") && person.auth_user_id);
}

export async function listTeacherProfiles(institutionId: string, yearId: string): Promise<TeacherProfileRow[]> {
  const [people, profilesResult] = await Promise.all([
    listTeacherCandidates(institutionId),
    supabase.from("teacher_profiles").select("*").eq("academic_year_id", yearId).order("created_at"),
  ]);
  if (profilesResult.error) throw profilesResult.error;
  const peopleByUser = new Map(people.map((person) => [person.auth_user_id, person]));
  return (profilesResult.data ?? []).map((profile: any) => {
    const person = peopleByUser.get(profile.teacher_user_id);
    return {
      ...profile,
      first_name: person?.first_name ?? "Compte",
      last_name: person?.last_name ?? "enseignant",
      email: person?.email ?? null,
      phone: person?.phone ?? null,
    } as TeacherProfileRow;
  });
}

export async function saveTeacherProfile(
  institutionId: string,
  yearId: string,
  input: Omit<TeacherProfile, "id" | "institution_id" | "academic_year_id">,
  id?: string,
) {
  const payload = { institution_id: institutionId, academic_year_id: yearId, ...input };
  const query = id
    ? supabase.from("teacher_profiles").update(payload).eq("id", id)
    : supabase.from("teacher_profiles").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function deleteTeacherProfile(id: string) {
  const { error } = await supabase.from("teacher_profiles").delete().eq("id", id);
  if (error) throw error;
}
