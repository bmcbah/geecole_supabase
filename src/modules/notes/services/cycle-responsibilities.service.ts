import { supabase } from "../../../shared/lib/supabase/client";

export type ResponsibilityCapacity = "holder" | "acting" | "deputy";
export type ResponsibilityStatus = "draft" | "active" | "closed" | "archived";

export type CycleResponsibilityRow = {
  id: string;
  cycleId: string;
  cycleName: string;
  typeId: string;
  typeName: string;
  personId: string;
  personName: string;
  capacity: ResponsibilityCapacity;
  startsOn: string;
  endsOn: string | null;
  replacedPersonId: string | null;
  status: ResponsibilityStatus;
};

export async function listCycleResponsibilityContext(
  institutionId: string,
  yearId: string,
) {
  const [cycles, types, people, assignments] = await Promise.all([
    supabase
      .from("academic_year_cycles")
      .select("cycle_id,name")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", yearId)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("cycle_responsibility_types")
      .select("*")
      .eq("institution_id", institutionId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("people")
      .select("id,first_name,last_name,status")
      .eq("institution_id", institutionId)
      .eq("status", "active")
      .order("last_name"),
    supabase
      .from("cycle_responsibilities")
      .select("*")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", yearId)
      .order("starts_on", { ascending: false }),
  ]);
  for (const result of [cycles, types, people, assignments])
    if (result.error) throw result.error;
  const rows: CycleResponsibilityRow[] = (assignments.data ?? []).map(
    (item) => ({
      id: item.id,
      cycleId: item.cycle_id,
      cycleName:
        cycles.data?.find((cycle) => cycle.cycle_id === item.cycle_id)?.name ??
        "Cycle",
      typeId: item.responsibility_type_id,
      typeName:
        types.data?.find((type) => type.id === item.responsibility_type_id)
          ?.name ?? "Responsabilité",
      personId: item.person_id,
      personName: (() => {
        const person = people.data?.find(
          (entry) => entry.id === item.person_id,
        );
        return person
          ? `${person.first_name} ${person.last_name}`
          : "Personne inactive";
      })(),
      capacity: item.capacity,
      startsOn: item.starts_on,
      endsOn: item.ends_on,
      replacedPersonId: item.replaced_person_id,
      status: item.status,
    }),
  );
  return {
    cycles: cycles.data ?? [],
    types: types.data ?? [],
    people: people.data ?? [],
    rows,
  };
}

export async function saveCycleResponsibility(input: {
  id?: string;
  institutionId: string;
  yearId: string;
  cycleId: string;
  typeId: string;
  personId: string;
  capacity: ResponsibilityCapacity;
  startsOn: string;
  endsOn: string | null;
  replacedPersonId: string | null;
  status: ResponsibilityStatus;
}) {
  const payload = {
    institution_id: input.institutionId,
    academic_year_id: input.yearId,
    cycle_id: input.cycleId,
    responsibility_type_id: input.typeId,
    person_id: input.personId,
    capacity: input.capacity,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    replaced_person_id:
      input.capacity === "acting" ? input.replacedPersonId : null,
    status: input.status,
  };
  const query = input.id
    ? supabase.from("cycle_responsibilities").update(payload).eq("id", input.id)
    : supabase.from("cycle_responsibilities").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function closeCycleResponsibility(id: string, endsOn: string) {
  const { error } = await supabase
    .from("cycle_responsibilities")
    .update({ status: "closed", ends_on: endsOn })
    .eq("id", id);
  if (error) throw error;
}
