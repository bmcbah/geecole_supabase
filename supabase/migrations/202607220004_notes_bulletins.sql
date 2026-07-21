-- GeEcole V1 — Notes, formules, responsabilités et bulletins
-- Baseline consolidée le 2026-07-22.
-- Les marqueurs "Source consolidée" conservent la traçabilité Git.

-- -----------------------------------------------------------------------------
-- Source consolidée : 20260720010000_create_notes_foundation.sql
-- -----------------------------------------------------------------------------

-- Notes N1/N2: additive pedagogical foundation aligned with docs/modules/notes.
create type public.note_result_status as enum ('absent', 'exempt', 'postponed');
create type public.bulletin_generation_status as enum ('running', 'completed', 'partial', 'failed');
create type public.bulletin_item_status as enum ('generated', 'warning', 'blocked');
create type public.bulletin_status as enum ('generated', 'pending_validation', 'validated', 'published', 'rejected', 'replaced');

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

create table public.pedagogical_settings (
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  appreciations_required boolean not null default false,
  ranking_displayed boolean not null default true,
  coefficients_displayed boolean not null default true,
  average_decimal_places smallint not null default 2 check (average_decimal_places between 0 and 4),
  notifications_enabled boolean not null default true,
  multiple_teachers_enabled boolean not null default false,
  validation_roles public.app_role[] not null default array['owner','admin']::public.app_role[],
  publication_roles public.app_role[] not null default array['owner','admin']::public.app_role[],
  updated_at timestamptz not null default now(),
  primary key (institution_id, academic_year_id)
);

create table public.bulletin_generation_batches (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  period_id uuid not null references public.academic_periods(id) on delete restrict,
  scope_type text not null check (scope_type in ('school','cycle','level','class','student')),
  scope_ids uuid[] not null default array[]::uuid[],
  options jsonb not null default '{}'::jsonb,
  status public.bulletin_generation_status not null default 'running',
  total_count integer not null default 0,
  generated_count integer not null default 0,
  warning_count integer not null default 0,
  blocked_count integer not null default 0,
  initiated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.bulletin_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  period_id uuid not null references public.academic_periods(id) on delete restrict,
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  class_id uuid not null references public.school_classes(id) on delete restrict,
  batch_id uuid not null references public.bulletin_generation_batches(id) on delete restrict,
  version integer not null default 1 check (version > 0),
  status public.bulletin_status not null default 'generated',
  snapshot jsonb not null default '{}'::jsonb,
  validation_comment text,
  validated_by uuid references auth.users(id),
  validated_at timestamptz,
  published_by uuid references auth.users(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (enrollment_id, period_id, version)
);

create table public.bulletin_generation_items (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  batch_id uuid not null references public.bulletin_generation_batches(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  class_id uuid references public.school_classes(id) on delete restrict,
  status public.bulletin_item_status not null,
  issue_code text,
  message text,
  bulletin_version_id uuid references public.bulletin_versions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index pedagogical_assignments_context_idx on public.pedagogical_assignments(academic_year_id, class_id, subject_id);
create index gradebook_notes_course_idx on public.gradebook_notes(academic_year_id, period_id, class_id, subject_id);
create index note_results_note_idx on public.note_results(note_id);
create index notes_audit_entity_idx on public.notes_audit_log(entity_type, entity_id, created_at desc);
create index bulletin_batches_year_idx on public.bulletin_generation_batches(academic_year_id, created_at desc);
create index bulletin_versions_context_idx on public.bulletin_versions(academic_year_id, period_id, status);
create index bulletin_items_batch_idx on public.bulletin_generation_items(batch_id, status);

create view public.notes_average_controls with (security_invoker = true) as
select assignment.id, assignment.institution_id, assignment.academic_year_id,
  assignment.class_id, class.name as class_name, subject.name as subject_name,
  concat_ws(' ', teacher.first_name, teacher.last_name) as teacher_name,
  assignment.coefficient, count(distinct note.id)::integer as notes_count,
  count(result.id) filter (where result.status = 'postponed')::integer as postponed_count,
  case when count(distinct note.id) = 0 then 'not_started'
       when count(result.id) filter (where result.status = 'postponed') > 0 then 'incomplete'
       else 'ready' end as state
from public.pedagogical_assignments assignment
join public.school_classes class on class.id = assignment.class_id
join public.subjects subject on subject.id = assignment.subject_id
join public.people teacher on teacher.id = assignment.teacher_id
left join public.gradebook_notes note on note.academic_year_id = assignment.academic_year_id and note.class_id = assignment.class_id and note.subject_id = assignment.subject_id
left join public.note_results result on result.note_id = note.id
where assignment.is_active and assignment.subject_id is not null
group by assignment.id, class.name, subject.name, teacher.first_name, teacher.last_name;
grant select on public.notes_average_controls to authenticated;

create or replace function public.prepare_gradebook_note()
returns trigger language plpgsql security definer set search_path = '' as $$
declare selected_type public.assessment_types;
begin
  select * into selected_type from public.assessment_types
  where id = new.note_type_id and institution_id = new.institution_id
    and academic_year_id = new.academic_year_id and is_active;
  if selected_type.id is null then raise exception 'inactive_or_invalid_note_type'; end if;
  if not exists (
    select 1 from public.school_classes class
    join public.academic_year_levels level on level.id = class.academic_year_level_id
    join public.academic_periods period on period.id = new.period_id
      and period.academic_year_id = class.academic_year_id
      and period.cycle_id = level.cycle_id
    where class.id = new.class_id and class.academic_year_id = new.academic_year_id
  ) then raise exception 'period_does_not_belong_to_class_cycle'; end if;
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

create or replace function public.validate_assignment_period_cycle()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.pedagogical_assignments assignment
    join public.school_classes class on class.id = assignment.class_id
    join public.academic_year_levels level on level.id = class.academic_year_level_id
    join public.academic_periods period on period.id = new.period_id
      and period.academic_year_id = assignment.academic_year_id
      and period.cycle_id = level.cycle_id
    where assignment.id = new.assignment_id
  ) then raise exception 'period_does_not_belong_to_assignment_cycle'; end if;
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

create or replace function public.protect_published_bulletin()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'published' then raise exception 'published_bulletin_is_immutable'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.change_academic_period_status(target_period_id uuid, target_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare target_period public.academic_periods;
begin
  select * into target_period from public.academic_periods where id = target_period_id;
  if target_period.id is null then raise exception 'academic_period_not_found'; end if;
  if not public.has_institution_role(target_period.institution_id, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if target_status not in ('open','closed') then raise exception 'invalid_period_status'; end if;
  if target_status = 'open' then
    update public.academic_periods set status = 'closed'
    where academic_year_id = target_period.academic_year_id and cycle_id = target_period.cycle_id and status = 'open' and id <> target_period.id;
  end if;
  update public.academic_periods set status = target_status where id = target_period.id;
end;
$$;

create trigger assessment_types_rules before insert or update on public.assessment_types
for each row execute function public.enforce_assessment_type_rules();
create trigger gradebook_notes_prepare before insert or update on public.gradebook_notes
for each row execute function public.prepare_gradebook_note();
create trigger note_results_validate before insert or update on public.note_results
for each row execute function public.validate_note_result();
create trigger pedagogical_assignment_periods_validate before insert or update on public.pedagogical_assignment_periods
for each row execute function public.validate_assignment_period_cycle();

create trigger pedagogical_assignments_updated before update on public.pedagogical_assignments for each row execute function public.set_updated_at();
create trigger gradebook_notes_updated before update on public.gradebook_notes for each row execute function public.set_updated_at();
create trigger note_results_updated before update on public.note_results for each row execute function public.set_updated_at();
create trigger subject_appreciations_updated before update on public.subject_appreciations for each row execute function public.set_updated_at();
create trigger pedagogical_settings_updated before update on public.pedagogical_settings for each row execute function public.set_updated_at();

create trigger audit_pedagogical_assignments after insert or update or delete on public.pedagogical_assignments for each row execute function public.audit_notes_change();
create trigger audit_gradebook_notes after insert or update or delete on public.gradebook_notes for each row execute function public.audit_notes_change();
create trigger audit_note_results after insert or update or delete on public.note_results for each row execute function public.audit_notes_change();
create trigger audit_subject_appreciations after insert or update or delete on public.subject_appreciations for each row execute function public.audit_notes_change();
create trigger bulletin_versions_protect before update or delete on public.bulletin_versions for each row execute function public.protect_published_bulletin();

do $$
declare table_name text;
begin
  foreach table_name in array array['pedagogical_assignments','pedagogical_assignment_periods','gradebook_notes','note_results','subject_appreciations','notes_audit_log','pedagogical_settings','bulletin_generation_batches','bulletin_versions','bulletin_generation_items'] loop
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
create policy pedagogical_settings_read on public.pedagogical_settings for select to authenticated using (public.is_active_member(institution_id));
create policy pedagogical_settings_manage on public.pedagogical_settings for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
create policy bulletin_batches_read on public.bulletin_generation_batches for select to authenticated using (public.is_active_member(institution_id));
create policy bulletin_batches_manage on public.bulletin_generation_batches for all to authenticated using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[])) with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
create policy bulletin_versions_read on public.bulletin_versions for select to authenticated using (public.is_active_member(institution_id));
create policy bulletin_versions_manage on public.bulletin_versions for all to authenticated using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[])) with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
create policy bulletin_items_read on public.bulletin_generation_items for select to authenticated using (public.is_active_member(institution_id));
create policy bulletin_items_manage on public.bulletin_generation_items for all to authenticated using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[])) with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

grant select, insert, update, delete on public.pedagogical_assignments, public.pedagogical_assignment_periods,
  public.gradebook_notes, public.note_results, public.subject_appreciations to authenticated;
grant select, insert, update, delete on public.pedagogical_settings to authenticated;
grant select, insert, update, delete on public.bulletin_generation_batches, public.bulletin_versions, public.bulletin_generation_items to authenticated;
revoke all on function public.change_academic_period_status(uuid, text) from public;
grant execute on function public.change_academic_period_status(uuid, text) to authenticated;
grant select on public.notes_audit_log to authenticated;
revoke all on public.pedagogical_assignments, public.pedagogical_assignment_periods,
  public.gradebook_notes, public.note_results, public.subject_appreciations, public.notes_audit_log, public.pedagogical_settings,
  public.bulletin_generation_batches, public.bulletin_versions, public.bulletin_generation_items from anon;


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260721010000_add_bulletin_display_settings.sql
-- -----------------------------------------------------------------------------

alter table public.pedagogical_settings
  add column bulletin_title text not null default 'Bulletin scolaire',
  add column bulletin_orientation text not null default 'portrait' check (bulletin_orientation in ('portrait','landscape')),
  add column bulletin_show_rank boolean not null default true,
  add column bulletin_show_appreciations boolean not null default true,
  add column bulletin_teacher_signature_label text not null default 'Enseignant principal',
  add column bulletin_direction_signature_label text not null default 'Direction',
  add column bulletin_footer text not null default '';


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260721020000_invalidate_unpublished_bulletins.sql
-- -----------------------------------------------------------------------------

-- Invalidate an unpublished validation when one of its pedagogical inputs changes.
create or replace function public.invalidate_unpublished_bulletins()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  target_student uuid;
  target_period uuid;
  target_class uuid;
begin
  if tg_table_name = 'note_results' then
    target_student := case when tg_op = 'DELETE' then old.student_id else new.student_id end;
    select note.period_id, note.class_id
      into target_period, target_class
      from public.gradebook_notes note
      where note.id = case when tg_op = 'DELETE' then old.note_id else new.note_id end;
  else
    target_student := case when tg_op = 'DELETE' then old.student_id else new.student_id end;
    target_period := case when tg_op = 'DELETE' then old.period_id else new.period_id end;
    target_class := case when tg_op = 'DELETE' then old.class_id else new.class_id end;
  end if;

  update public.bulletin_versions
     set status = 'generated',
         validation_comment = 'Validation annulée automatiquement après modification des données pédagogiques.',
         validated_by = null,
         validated_at = null
   where student_id = target_student
     and period_id = target_period
     and class_id = target_class
     and status in ('pending_validation', 'validated');
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger note_results_invalidate_bulletins
after insert or update or delete on public.note_results
for each row execute function public.invalidate_unpublished_bulletins();

create trigger subject_appreciations_invalidate_bulletins
after insert or update or delete on public.subject_appreciations
for each row execute function public.invalidate_unpublished_bulletins();

create trigger audit_bulletin_versions
after insert or update or delete on public.bulletin_versions
for each row execute function public.audit_notes_change();


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260721030000_cycle_responsibilities.sql
-- -----------------------------------------------------------------------------

create table public.cycle_responsibility_types (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  code text not null check (code ~ '^[A-Z0-9_-]{2,40}$'),
  description text,
  can_validate_bulletins boolean not null default false,
  can_manage_periods boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, code)
);

create table public.cycle_responsibilities (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  cycle_id uuid not null,
  responsibility_type_id uuid not null references public.cycle_responsibility_types(id) on delete restrict,
  person_id uuid not null references public.people(id) on delete restrict,
  capacity text not null default 'holder' check (capacity in ('holder', 'acting', 'deputy')),
  starts_on date not null,
  ends_on date,
  replaced_person_id uuid references public.people(id) on delete restrict,
  status text not null default 'active' check (status in ('draft', 'active', 'closed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cycle_responsibilities_dates check (ends_on is null or starts_on <= ends_on),
  constraint cycle_responsibilities_year_fk foreign key (academic_year_id, institution_id)
    references public.academic_years(id, institution_id) on delete cascade,
  constraint cycle_responsibilities_cycle_fk foreign key (cycle_id, institution_id)
    references public.academic_cycles(id, institution_id) on delete restrict,
  constraint cycle_responsibilities_replacement check (
    (capacity = 'acting' and replaced_person_id is not null)
    or (capacity <> 'acting' and replaced_person_id is null)
  )
);

create index cycle_responsibilities_scope_idx
  on public.cycle_responsibilities(institution_id, academic_year_id, cycle_id, status);
create unique index cycle_responsibilities_one_active_holder_idx
  on public.cycle_responsibilities(academic_year_id, cycle_id, responsibility_type_id)
  where status = 'active' and capacity = 'holder';

create trigger cycle_responsibility_types_set_updated_at before update on public.cycle_responsibility_types
for each row execute function public.set_updated_at();
create trigger cycle_responsibilities_set_updated_at before update on public.cycle_responsibilities
for each row execute function public.set_updated_at();

insert into public.cycle_responsibility_types(
  institution_id, name, code, description, can_validate_bulletins, can_manage_periods
)
select institution.id, defaults.name, defaults.code, defaults.description,
       defaults.can_validate_bulletins, defaults.can_manage_periods
from public.institutions institution
cross join (values
  ('Responsable de cycle', 'CYCLE_MANAGER', 'Responsable principal du cycle.', true, true),
  ('Responsable pédagogique', 'PEDAGOGICAL_MANAGER', 'Coordonne le suivi pédagogique du cycle.', true, false),
  ('Censeur', 'CENSEUR', 'Fonction de suivi pédagogique du secondaire.', true, true),
  ('Principal', 'PRINCIPAL', 'Responsable du collège.', true, true),
  ('Proviseur', 'PROVISEUR', 'Responsable du lycée.', true, true),
  ('Directeur des études', 'STUDIES_DIRECTOR', 'Coordonne les études et les validations pédagogiques.', true, true)
) as defaults(name, code, description, can_validate_bulletins, can_manage_periods)
on conflict (institution_id, code) do nothing;

alter table public.cycle_responsibility_types enable row level security;
alter table public.cycle_responsibilities enable row level security;

create policy cycle_responsibility_types_read on public.cycle_responsibility_types
for select to authenticated using (public.is_active_member(institution_id));
create policy cycle_responsibility_types_write on public.cycle_responsibility_types
for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
create policy cycle_responsibilities_read on public.cycle_responsibilities
for select to authenticated using (public.is_active_member(institution_id));
create policy cycle_responsibilities_write on public.cycle_responsibilities
for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

grant select, insert, update, delete on public.cycle_responsibility_types to authenticated;
grant select, insert, update, delete on public.cycle_responsibilities to authenticated;
revoke all on public.cycle_responsibility_types, public.cycle_responsibilities from anon;


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260721040000_versioned_grading_formulas.sql
-- -----------------------------------------------------------------------------

-- Versioned, guided grading formulas. A formula applies to a cycle or a level,
-- never to a period. Level assignments override cycle assignments.

create table public.assessment_type_catalog (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  default_scale numeric(6,2) not null default 20 check (default_scale > 0),
  sort_order smallint not null default 0,
  is_active boolean not null default true
);

insert into public.assessment_type_catalog(code,name,description,sort_order) values
  ('INTERRO','Interrogation','Contrôle court écrit ou oral',10),
  ('DEVOIR','Devoir','Travail évalué en classe',20),
  ('DS','Devoir surveillé','Épreuve surveillée',30),
  ('DM','Devoir à domicile','Travail réalisé hors classe',40),
  ('EVALUATION','Évaluation','Évaluation pédagogique générique',50),
  ('COMPO','Composition','Composition de fin de période',60),
  ('EXAM','Examen','Examen interne',70),
  ('EXAM-BLANC','Examen blanc','Préparation au DEF ou au Baccalauréat',80),
  ('ORAL','Évaluation orale','Interrogation ou présentation orale',90),
  ('TP','Travaux pratiques','Travail pratique évalué',100),
  ('TD','Travaux dirigés','Exercices dirigés évalués',110),
  ('PROJET','Projet','Projet individuel ou collectif',120),
  ('EXPOSE','Exposé','Présentation préparée',130),
  ('CONTINU','Contrôle continu','Résultat consolidé du contrôle continu',140),
  ('RATTRAPAGE','Rattrapage','Évaluation de remplacement',150);

alter table public.assessment_types
  add column if not exists catalog_id uuid references public.assessment_type_catalog(id) on delete restrict;

create table public.grading_formula_series (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  code text not null,
  name text not null,
  formula_type text not null default 'course_average' check (formula_type in ('course_average')),
  description text,
  created_at timestamptz not null default now(),
  constraint grading_formula_series_year_fk foreign key (academic_year_id,institution_id)
    references public.academic_years(id,institution_id) on delete cascade,
  unique(academic_year_id,code)
);

create table public.grading_formula_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  series_id uuid not null references public.grading_formula_series(id) on delete cascade,
  version integer not null check (version > 0),
  rules jsonb not null default '{"expression":"","rounding":2}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint grading_formula_versions_year_fk foreign key (academic_year_id,institution_id)
    references public.academic_years(id,institution_id) on delete cascade,
  constraint grading_formula_rules_shape check (
    jsonb_typeof(rules)='object'
    and length(trim(coalesce(rules->>'expression',''))) between 1 and 1000
    and coalesce((rules->>'rounding')::integer,2) between 0 and 4
  ),
  unique(series_id,version)
);

create table public.grading_formula_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  formula_version_id uuid not null references public.grading_formula_versions(id) on delete restrict,
  cycle_id uuid references public.academic_cycles(id) on delete cascade,
  academic_year_level_id uuid references public.academic_year_levels(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint grading_formula_assignment_scope check (
    (cycle_id is not null)::integer + (academic_year_level_id is not null)::integer = 1
  ),
  constraint grading_formula_assignments_year_fk foreign key (academic_year_id,institution_id)
    references public.academic_years(id,institution_id) on delete cascade
);

create unique index grading_formula_assignment_cycle_active_idx
  on public.grading_formula_assignments(academic_year_id,cycle_id) where is_active and cycle_id is not null;
create unique index grading_formula_assignment_level_active_idx
  on public.grading_formula_assignments(academic_year_id,academic_year_level_id) where is_active and academic_year_level_id is not null;

create or replace function public.prevent_formula_version_mutation()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception 'grading_formula_version_is_immutable';
end; $$;
create trigger grading_formula_versions_immutable before update or delete on public.grading_formula_versions
for each row execute function public.prevent_formula_version_mutation();

create or replace function public.validate_grading_formula_data()
returns trigger language plpgsql set search_path='' as $$
declare expected_institution uuid; expected_year uuid; scope_institution uuid; scope_year uuid;
begin
  if tg_table_name='grading_formula_versions' then
    select institution_id,academic_year_id into expected_institution,expected_year
    from public.grading_formula_series where id=new.series_id;
    if expected_institution is distinct from new.institution_id or expected_year is distinct from new.academic_year_id then
      raise exception 'formula_series_context_mismatch';
    end if;
  else
    select institution_id,academic_year_id into expected_institution,expected_year
    from public.grading_formula_versions where id=new.formula_version_id;
    if new.cycle_id is not null then
      select institution_id,null::uuid into scope_institution,scope_year from public.academic_cycles where id=new.cycle_id;
    else
      select institution_id,academic_year_id into scope_institution,scope_year from public.academic_year_levels where id=new.academic_year_level_id;
    end if;
    if expected_institution is distinct from new.institution_id or expected_year is distinct from new.academic_year_id
      or scope_institution is distinct from new.institution_id
      or (new.academic_year_level_id is not null and scope_year is distinct from new.academic_year_id) then
      raise exception 'formula_assignment_context_mismatch';
    end if;
  end if;
  return new;
end; $$;
create trigger grading_formula_versions_validate before insert on public.grading_formula_versions
for each row execute function public.validate_grading_formula_data();
create trigger grading_formula_assignments_validate before insert or update on public.grading_formula_assignments
for each row execute function public.validate_grading_formula_data();

create or replace function public.install_assessment_type_catalog(target_institution_id uuid,target_year_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare inserted_count integer;
begin
  if not public.has_institution_role(target_institution_id,array['owner','admin']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  insert into public.assessment_types(institution_id,academic_year_id,catalog_id,name,code,weight,scale,is_active)
  select target_institution_id,target_year_id,id,name,code,1,default_scale,true
  from public.assessment_type_catalog where is_active
  on conflict(academic_year_id,code) do nothing;
  get diagnostics inserted_count=row_count;
  return inserted_count;
end; $$;

alter table public.assessment_type_catalog enable row level security;
create policy assessment_type_catalog_read on public.assessment_type_catalog for select to authenticated using(is_active);
grant select on public.assessment_type_catalog to authenticated;
grant execute on function public.install_assessment_type_catalog(uuid,uuid) to authenticated;

do $$ declare table_name text; begin
  foreach table_name in array array['grading_formula_series','grading_formula_versions','grading_formula_assignments'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('create policy %I_select on public.%I for select to authenticated using(public.is_active_member(institution_id))',table_name,table_name);
    execute format('create policy %I_write on public.%I for all to authenticated using(public.has_institution_role(institution_id,array[''owner'',''admin'']::public.app_role[])) with check(public.has_institution_role(institution_id,array[''owner'',''admin'']::public.app_role[]))',table_name,table_name);
    execute format('grant select,insert,update,delete on public.%I to authenticated',table_name);
  end loop;
end $$;

create trigger grading_formula_series_lock before insert or update or delete on public.grading_formula_series
for each row execute function public.ensure_preparation_year_write();
create trigger grading_formula_versions_lock before insert on public.grading_formula_versions
for each row execute function public.ensure_preparation_year_write();
create trigger grading_formula_assignments_lock before insert or update or delete on public.grading_formula_assignments
for each row execute function public.ensure_preparation_year_write();


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260721050000_fix_grading_formula_editor.sql
-- -----------------------------------------------------------------------------

-- Keep formula version creation and scope activation atomic. Configuration is
-- editable while an academic year is in preparation or open.

create or replace function public.ensure_preparation_year_write()
returns trigger language plpgsql set search_path = '' as $$
declare year_id uuid; year_status public.academic_year_status;
begin
  year_id := case when tg_op = 'DELETE' then old.academic_year_id else new.academic_year_id end;
  select status into year_status from public.academic_years where id = year_id;
  if year_status not in ('preparation', 'open') then
    raise exception 'academic_year_configuration_locked';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.save_grading_formula_version(
  target_institution_id uuid,
  target_year_id uuid,
  target_series_id uuid,
  formula_name text,
  formula_code text,
  formula_expression text,
  formula_rounding integer,
  scope_type text,
  scope_id uuid
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  resolved_series_id uuid := target_series_id;
  next_version integer;
  created_version_id uuid;
begin
  if not public.has_institution_role(target_institution_id, array['owner','admin']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  if scope_type not in ('cycle', 'level') then raise exception 'invalid_formula_scope'; end if;
  if length(trim(formula_expression)) not between 1 and 1000 then raise exception 'invalid_formula_expression'; end if;
  if formula_rounding not between 0 and 4 then raise exception 'invalid_formula_rounding'; end if;

  if resolved_series_id is null then
    insert into public.grading_formula_series(institution_id, academic_year_id, name, code, formula_type)
    values(target_institution_id, target_year_id, trim(formula_name), upper(trim(formula_code)), 'course_average')
    returning id into resolved_series_id;
  elsif not exists (
    select 1 from public.grading_formula_series
    where id = resolved_series_id and institution_id = target_institution_id and academic_year_id = target_year_id
  ) then
    raise exception 'formula_series_context_mismatch';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(resolved_series_id::text, 0));
  select coalesce(max(version), 0) + 1 into next_version
  from public.grading_formula_versions where series_id = resolved_series_id;

  insert into public.grading_formula_versions(institution_id, academic_year_id, series_id, version, rules, created_by)
  values(target_institution_id, target_year_id, resolved_series_id, next_version,
    jsonb_build_object('expression', trim(formula_expression), 'rounding', formula_rounding), auth.uid())
  returning id into created_version_id;

  if scope_type = 'cycle' then
    update public.grading_formula_assignments set is_active = false
    where academic_year_id = target_year_id and cycle_id = scope_id and is_active;
  else
    update public.grading_formula_assignments set is_active = false
    where academic_year_id = target_year_id and academic_year_level_id = scope_id and is_active;
  end if;

  insert into public.grading_formula_assignments(
    institution_id, academic_year_id, formula_version_id, cycle_id, academic_year_level_id
  ) values (
    target_institution_id, target_year_id, created_version_id,
    case when scope_type = 'cycle' then scope_id end,
    case when scope_type = 'level' then scope_id end
  );
  return created_version_id;
end;
$$;

grant execute on function public.save_grading_formula_version(uuid,uuid,uuid,text,text,text,integer,text,uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260721060000_fix_cycle_responsibility_workflow.sql
-- -----------------------------------------------------------------------------

create or replace function public.save_cycle_responsibility(
  target_id uuid,
  target_institution_id uuid,
  target_year_id uuid,
  target_cycle_id uuid,
  target_type_id uuid,
  target_person_id uuid,
  target_capacity text,
  target_starts_on date,
  target_ends_on date,
  target_replaced_person_id uuid
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare saved_id uuid;
begin
  if not public.has_institution_role(target_institution_id, array['owner','admin']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  if target_capacity not in ('holder', 'acting', 'deputy') then
    raise exception 'invalid_responsibility_capacity';
  end if;
  if target_ends_on is not null and target_ends_on < target_starts_on then
    raise exception 'invalid_responsibility_dates';
  end if;
  if target_capacity = 'acting' and target_replaced_person_id is null then
    raise exception 'replaced_person_required';
  end if;
  if target_capacity <> 'acting' and target_replaced_person_id is not null then
    raise exception 'replaced_person_not_allowed';
  end if;

  if target_capacity = 'holder' then
    update public.cycle_responsibilities
       set status = 'closed',
           ends_on = greatest(starts_on, target_starts_on - 1)
     where institution_id = target_institution_id
       and academic_year_id = target_year_id
       and cycle_id = target_cycle_id
       and responsibility_type_id = target_type_id
       and capacity = 'holder'
       and status = 'active'
       and id is distinct from target_id;
  end if;

  if target_id is null then
    insert into public.cycle_responsibilities(
      institution_id, academic_year_id, cycle_id, responsibility_type_id,
      person_id, capacity, starts_on, ends_on, replaced_person_id, status
    ) values (
      target_institution_id, target_year_id, target_cycle_id, target_type_id,
      target_person_id, target_capacity, target_starts_on, target_ends_on,
      case when target_capacity = 'acting' then target_replaced_person_id end,
      'active'
    ) returning id into saved_id;
  else
    update public.cycle_responsibilities
       set cycle_id = target_cycle_id,
           responsibility_type_id = target_type_id,
           person_id = target_person_id,
           capacity = target_capacity,
           starts_on = target_starts_on,
           ends_on = target_ends_on,
           replaced_person_id = case when target_capacity = 'acting' then target_replaced_person_id end,
           status = 'active'
     where id = target_id
       and institution_id = target_institution_id
       and academic_year_id = target_year_id
    returning id into saved_id;
  end if;

  if saved_id is null then raise exception 'cycle_responsibility_not_found'; end if;
  return saved_id;
end;
$$;

grant execute on function public.save_cycle_responsibility(uuid,uuid,uuid,uuid,uuid,uuid,text,date,date,uuid) to authenticated;

