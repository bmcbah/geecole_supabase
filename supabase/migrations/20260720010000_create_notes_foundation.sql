-- Notes N1/N2: additive pedagogical foundation aligned with docs/modules/notes.
create type public.note_result_status as enum ('absent', 'exempt', 'postponed');

alter table public.assessment_types
  alter column weight set default 1;

update public.assessment_types set weight = 1 where weight <> 1;

create or replace function public.enforce_assessment_type_rules()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.weight := 1;
  if tg_op = 'UPDATE' and old.scale <> new.scale and exists (
    select 1 from public.gradebook_notes where note_type_id = old.id
  ) then
    raise exception 'note_type_scale_is_immutable_after_use';
  end if;
  return new;
end;
$$;

create table public.pedagogical_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  class_id uuid not null references public.school_classes(id) on delete restrict,
  subject_id uuid references public.subjects(id) on delete restrict,
  teacher_id uuid not null references public.people(id) on delete restrict,
  role text not null default 'subject_teacher'
    check (role in ('main_teacher', 'subject_teacher', 'co_teacher', 'substitute', 'specialist')),
  coefficient numeric(6,2) not null default 1 check (coefficient > 0),
  all_periods boolean not null default true,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pedagogical_assignment_subject check (
    (role = 'main_teacher' and subject_id is null) or subject_id is not null
  )
);

create table public.pedagogical_assignment_periods (
  assignment_id uuid not null references public.pedagogical_assignments(id) on delete cascade,
  period_id uuid not null references public.academic_periods(id) on delete restrict,
  primary key (assignment_id, period_id)
);

create table public.gradebook_notes (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  class_id uuid not null references public.school_classes(id) on delete restrict,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  period_id uuid not null references public.academic_periods(id) on delete restrict,
  note_type_id uuid not null references public.assessment_types(id) on delete restrict,
  teacher_id uuid not null references public.people(id) on delete restrict,
  label text not null check (char_length(trim(label)) between 2 and 120),
  code text not null check (char_length(trim(code)) between 1 and 30),
  note_date date not null default current_date,
  scale_snapshot numeric(6,2) not null check (scale_snapshot > 0),
  internal_comment text,
  is_locked boolean not null default false,
  is_published boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year_id, class_id, subject_id, period_id, code)
);

create table public.note_results (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  note_id uuid not null references public.gradebook_notes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  value numeric(7,2),
  status public.note_result_status,
  comment text,
  is_makeup boolean not null default false,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint note_result_value_or_status check (
    (value is not null and status is null) or (value is null and status is not null)
  ),
  unique (note_id, student_id, is_makeup)
);

create table public.subject_appreciations (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  period_id uuid not null references public.academic_periods(id) on delete restrict,
  class_id uuid not null references public.school_classes(id) on delete restrict,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  appreciation text not null check (char_length(trim(appreciation)) between 2 and 1000),
  author_id uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_id, class_id, subject_id, student_id)
);

create table public.notes_audit_log (
  id bigint generated always as identity primary key,
  institution_id uuid not null references public.institutions(id) on delete restrict,
  academic_year_id uuid references public.academic_years(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index pedagogical_assignments_context_idx on public.pedagogical_assignments(academic_year_id, class_id, subject_id);
create index gradebook_notes_course_idx on public.gradebook_notes(academic_year_id, period_id, class_id, subject_id);
create index note_results_note_idx on public.note_results(note_id);
create index notes_audit_entity_idx on public.notes_audit_log(entity_type, entity_id, created_at desc);

create or replace function public.prepare_gradebook_note()
returns trigger language plpgsql security definer set search_path = '' as $$
declare selected_type public.assessment_types;
begin
  select * into selected_type from public.assessment_types
  where id = new.note_type_id and institution_id = new.institution_id
    and academic_year_id = new.academic_year_id and is_active;
  if selected_type.id is null then raise exception 'inactive_or_invalid_note_type'; end if;
  if not exists (
    select 1 from public.pedagogical_assignments assignment
    where assignment.institution_id = new.institution_id
      and assignment.academic_year_id = new.academic_year_id
      and assignment.class_id = new.class_id
      and (assignment.subject_id = new.subject_id or assignment.role = 'main_teacher')
      and assignment.teacher_id = new.teacher_id and assignment.is_active
      and (assignment.all_periods or exists (
        select 1 from public.pedagogical_assignment_periods scope
        where scope.assignment_id = assignment.id and scope.period_id = new.period_id
      ))
  ) then raise exception 'course_not_accessible'; end if;
  if not public.has_institution_role(new.institution_id, array['owner','admin']::public.app_role[])
    and not exists (
      select 1 from public.people person
      where person.id = new.teacher_id and person.auth_user_id = auth.uid()
    ) then raise exception 'teacher_course_access_denied'; end if;
  new.scale_snapshot := selected_type.scale;
  return new;
end;
$$;

create or replace function public.validate_note_result()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_note public.gradebook_notes;
begin
  select * into target_note from public.gradebook_notes where id = new.note_id;
  if target_note.id is null or target_note.institution_id <> new.institution_id then
    raise exception 'invalid_note';
  end if;
  if target_note.is_locked then raise exception 'note_is_locked'; end if;
  if not public.has_institution_role(new.institution_id, array['owner','admin']::public.app_role[])
    and not exists (
      select 1 from public.people person
      where person.id = target_note.teacher_id and person.auth_user_id = auth.uid()
    ) then raise exception 'teacher_course_access_denied'; end if;
  if new.value is not null and (new.value < 0 or new.value > target_note.scale_snapshot) then
    raise exception 'result_outside_scale';
  end if;
  if not exists (
    select 1 from public.enrollments enrollment
    join public.class_assignments assignment on assignment.enrollment_id = enrollment.id
    where enrollment.student_id = new.student_id
      and enrollment.academic_year_id = target_note.academic_year_id
      and assignment.class_id = target_note.class_id and assignment.ends_on is null
      and enrollment.status = 'confirmed'
  ) then raise exception 'student_not_enrolled_in_course_class'; end if;
  new.updated_by := auth.uid();
  return new;
end;
$$;

create or replace function public.audit_notes_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare row_data jsonb; institution uuid; year_id uuid; object_id uuid;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  institution := (row_data->>'institution_id')::uuid;
  year_id := nullif(row_data->>'academic_year_id', '')::uuid;
  object_id := (row_data->>'id')::uuid;
  if year_id is null and tg_table_name = 'note_results' then
    select academic_year_id into year_id from public.gradebook_notes where id = (row_data->>'note_id')::uuid;
  end if;
  insert into public.notes_audit_log(institution_id, academic_year_id, entity_type, entity_id, action, before_data, after_data, actor_id)
  values(institution, year_id, tg_table_name, object_id, lower(tg_op),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end, auth.uid());
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger assessment_types_rules before insert or update on public.assessment_types
for each row execute function public.enforce_assessment_type_rules();
create trigger gradebook_notes_prepare before insert or update on public.gradebook_notes
for each row execute function public.prepare_gradebook_note();
create trigger note_results_validate before insert or update on public.note_results
for each row execute function public.validate_note_result();

create trigger pedagogical_assignments_updated before update on public.pedagogical_assignments for each row execute function public.set_updated_at();
create trigger gradebook_notes_updated before update on public.gradebook_notes for each row execute function public.set_updated_at();
create trigger note_results_updated before update on public.note_results for each row execute function public.set_updated_at();
create trigger subject_appreciations_updated before update on public.subject_appreciations for each row execute function public.set_updated_at();

create trigger audit_pedagogical_assignments after insert or update or delete on public.pedagogical_assignments for each row execute function public.audit_notes_change();
create trigger audit_gradebook_notes after insert or update or delete on public.gradebook_notes for each row execute function public.audit_notes_change();
create trigger audit_note_results after insert or update or delete on public.note_results for each row execute function public.audit_notes_change();
create trigger audit_subject_appreciations after insert or update or delete on public.subject_appreciations for each row execute function public.audit_notes_change();

do $$
declare table_name text;
begin
  foreach table_name in array array['pedagogical_assignments','pedagogical_assignment_periods','gradebook_notes','note_results','subject_appreciations','notes_audit_log'] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create policy pedagogical_assignments_read on public.pedagogical_assignments for select to authenticated using (public.is_active_member(institution_id));
create policy pedagogical_assignments_manage on public.pedagogical_assignments for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
create policy pedagogical_assignment_periods_read on public.pedagogical_assignment_periods for select to authenticated using (
  exists (select 1 from public.pedagogical_assignments a where a.id = assignment_id and public.is_active_member(a.institution_id))
);
create policy pedagogical_assignment_periods_manage on public.pedagogical_assignment_periods for all to authenticated using (
  exists (select 1 from public.pedagogical_assignments a where a.id = assignment_id and public.has_institution_role(a.institution_id, array['owner','admin']::public.app_role[]))
) with check (
  exists (select 1 from public.pedagogical_assignments a where a.id = assignment_id and public.has_institution_role(a.institution_id, array['owner','admin']::public.app_role[]))
);
create policy gradebook_notes_read on public.gradebook_notes for select to authenticated using (public.is_active_member(institution_id));
create policy gradebook_notes_write on public.gradebook_notes for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin','teacher']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin','teacher']::public.app_role[]));
create policy note_results_read on public.note_results for select to authenticated using (public.is_active_member(institution_id));
create policy note_results_write on public.note_results for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin','teacher']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin','teacher']::public.app_role[]));
create policy subject_appreciations_read on public.subject_appreciations for select to authenticated using (public.is_active_member(institution_id));
create policy subject_appreciations_write on public.subject_appreciations for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin','teacher']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin','teacher']::public.app_role[]));
create policy notes_audit_read on public.notes_audit_log for select to authenticated using (public.is_active_member(institution_id));

grant select, insert, update, delete on public.pedagogical_assignments, public.pedagogical_assignment_periods,
  public.gradebook_notes, public.note_results, public.subject_appreciations to authenticated;
grant select on public.notes_audit_log to authenticated;
revoke all on public.pedagogical_assignments, public.pedagogical_assignment_periods,
  public.gradebook_notes, public.note_results, public.subject_appreciations, public.notes_audit_log from anon;
