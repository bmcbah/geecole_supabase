-- Scolarité Phase 1: additive data foundation.
-- Extends the existing schooling schema without recreating tables used by
-- Finances, Notes or existing application services.

-- ---------------------------------------------------------------------------
-- Enrollment lifecycle
-- ---------------------------------------------------------------------------

do $$
begin
  alter type public.enrollment_status add value if not exists 'pending' after 'pre_registered';
exception
  when duplicate_object then null;
end
$$;

alter table public.students
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

create unique index if not exists students_auth_user_unique
  on public.students (institution_id, auth_user_id)
  where auth_user_id is not null;

alter table public.guardians
  add column if not exists email text,
  add column if not exists status text not null default 'active'
    check (status in ('active', 'inactive')),
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.student_guardians
  add column if not exists starts_on date not null default current_date,
  add column if not exists ends_on date,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add constraint student_guardians_date_order
    check (ends_on is null or ends_on >= starts_on) not valid;

alter table public.student_guardians validate constraint student_guardians_date_order;

alter table public.enrollments
  add column if not exists requested_academic_year_level_id uuid
    references public.academic_year_levels(id) on delete restrict,
  add column if not exists pedagogical_decision text
    check (pedagogical_decision is null or pedagogical_decision in (
      'promoted', 'repeat', 'redirected', 'admitted', 'not_admitted', 'pending'
    )),
  add column if not exists pedagogical_decision_reason text,
  add column if not exists pedagogical_decision_by uuid references auth.users(id) on delete set null,
  add column if not exists pedagogical_decision_at timestamptz,
  add column if not exists confirmed_by uuid references auth.users(id) on delete set null,
  add column if not exists rejection_reason text,
  add column if not exists withdrawal_reason text,
  add column if not exists transfer_destination text,
  add column if not exists lifecycle_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

update public.enrollments
set requested_academic_year_level_id = academic_year_level_id
where requested_academic_year_level_id is null;

alter table public.enrollments
  alter column requested_academic_year_level_id set not null;

create index if not exists enrollments_student_year_idx
  on public.enrollments (student_id, academic_year_id);
create index if not exists enrollments_institution_year_status_idx
  on public.enrollments (institution_id, academic_year_id, status);
create index if not exists enrollments_level_year_idx
  on public.enrollments (academic_year_level_id, academic_year_id);

-- ---------------------------------------------------------------------------
-- Enrollment history and validation results
-- ---------------------------------------------------------------------------

create table if not exists public.enrollment_status_history (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  from_status public.enrollment_status,
  to_status public.enrollment_status not null,
  reason text,
  performed_by uuid references auth.users(id) on delete set null,
  performed_at timestamptz not null default now()
);

create index if not exists enrollment_status_history_timeline_idx
  on public.enrollment_status_history (enrollment_id, performed_at desc);
create index if not exists enrollment_status_history_institution_idx
  on public.enrollment_status_history (institution_id, performed_at desc);

create table if not exists public.enrollment_validation_results (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  code text not null check (char_length(trim(code)) between 2 and 100),
  severity text not null check (severity in ('blocking', 'warning', 'information', 'success')),
  domain text not null check (char_length(trim(domain)) between 2 and 80),
  message_key text not null check (char_length(trim(message_key)) between 2 and 160),
  details jsonb not null default '{}'::jsonb,
  resolution_action text,
  evaluated_by uuid references auth.users(id) on delete set null,
  evaluated_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (enrollment_id, code)
);

create index if not exists enrollment_validation_active_idx
  on public.enrollment_validation_results (enrollment_id, severity)
  where resolved_at is null;

create or replace function public.track_enrollment_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.enrollment_status_history (
      institution_id, enrollment_id, from_status, to_status, performed_by
    ) values (
      new.institution_id, new.id, null, new.status, coalesce(new.created_by, auth.uid())
    );
  elsif old.status is distinct from new.status then
    insert into public.enrollment_status_history (
      institution_id, enrollment_id, from_status, to_status, reason, performed_by
    ) values (
      new.institution_id,
      new.id,
      old.status,
      new.status,
      coalesce(
        new.cancellation_reason,
        new.rejection_reason,
        new.withdrawal_reason,
        new.pedagogical_decision_reason
      ),
      coalesce(new.updated_by, new.confirmed_by, auth.uid())
    );
  end if;
  return new;
end;
$$;

drop trigger if exists enrollments_track_status on public.enrollments;
create trigger enrollments_track_status
after insert or update of status on public.enrollments
for each row execute function public.track_enrollment_status_change();

create or replace function public.protect_confirmed_enrollment_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'confirmed' then
    raise exception 'confirmed_enrollment_cannot_be_deleted';
  end if;
  return old;
end;
$$;

drop trigger if exists enrollments_protect_confirmed_delete on public.enrollments;
create trigger enrollments_protect_confirmed_delete
before delete on public.enrollments
for each row execute function public.protect_confirmed_enrollment_delete();

create or replace function public.validate_enrollment_context()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.students student
    where student.id = new.student_id
      and student.institution_id = new.institution_id
  ) then
    raise exception 'student_institution_mismatch';
  end if;

  if not exists (
    select 1
    from public.academic_year_levels level
    where level.id = new.academic_year_level_id
      and level.institution_id = new.institution_id
      and level.academic_year_id = new.academic_year_id
  ) then
    raise exception 'enrollment_level_context_mismatch';
  end if;

  if not exists (
    select 1
    from public.academic_year_levels level
    where level.id = new.requested_academic_year_level_id
      and level.institution_id = new.institution_id
      and level.academic_year_id = new.academic_year_id
  ) then
    raise exception 'requested_level_context_mismatch';
  end if;

  if new.status = 'confirmed' then
    new.confirmed_at := coalesce(new.confirmed_at, now());
    new.confirmed_by := coalesce(new.confirmed_by, auth.uid());
  end if;

  return new;
end;
$$;

drop trigger if exists enrollments_validate_context on public.enrollments;
create trigger enrollments_validate_context
before insert or update of institution_id, academic_year_id, student_id,
  academic_year_level_id, requested_academic_year_level_id, status
on public.enrollments
for each row execute function public.validate_enrollment_context();

-- ---------------------------------------------------------------------------
-- Classes and administrative class history
-- ---------------------------------------------------------------------------

alter table public.school_classes
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.class_assignments
  add column if not exists ended_by uuid references auth.users(id) on delete set null;

create index if not exists school_classes_year_level_idx
  on public.school_classes (academic_year_id, academic_year_level_id, is_active);
create index if not exists class_assignments_class_active_idx
  on public.class_assignments (class_id, enrollment_id)
  where ends_on is null;

-- ---------------------------------------------------------------------------
-- Pedagogical assignments and generated courses
-- ---------------------------------------------------------------------------

alter table public.pedagogical_assignments
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

create unique index if not exists pedagogical_assignments_full_year_unique
  on public.pedagogical_assignments (
    institution_id, academic_year_id, class_id, subject_id, teacher_id, role
  )
  where all_periods and is_active;

create unique index if not exists pedagogical_assignment_period_unique
  on public.pedagogical_assignment_periods (assignment_id, period_id);

create table if not exists public.academic_courses (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  assignment_id uuid not null references public.pedagogical_assignments(id) on delete restrict,
  class_id uuid not null references public.school_classes(id) on delete restrict,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  teacher_id uuid not null references public.people(id) on delete restrict,
  period_id uuid not null references public.academic_periods(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'inactive', 'cancelled')),
  generated_at timestamptz not null default now(),
  generated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (assignment_id, period_id)
);

create index if not exists academic_courses_context_idx
  on public.academic_courses (academic_year_id, class_id, subject_id, period_id, status);
create index if not exists academic_courses_teacher_idx
  on public.academic_courses (teacher_id, academic_year_id, period_id, status);

create trigger academic_courses_set_updated_at
before update on public.academic_courses
for each row execute function public.set_updated_at();

create or replace function public.validate_academic_course_context()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.pedagogical_assignments assignment
    join public.pedagogical_assignment_periods scope
      on scope.assignment_id = assignment.id
    where assignment.id = new.assignment_id
      and assignment.institution_id = new.institution_id
      and assignment.academic_year_id = new.academic_year_id
      and assignment.class_id = new.class_id
      and assignment.subject_id = new.subject_id
      and assignment.teacher_id = new.teacher_id
      and scope.period_id = new.period_id
      and assignment.is_active
  ) and not exists (
    select 1
    from public.pedagogical_assignments assignment
    join public.school_classes class on class.id = assignment.class_id
    join public.academic_year_levels level on level.id = class.academic_year_level_id
    join public.academic_periods period
      on period.academic_year_id = assignment.academic_year_id
     and period.cycle_id = level.cycle_id
    where assignment.id = new.assignment_id
      and assignment.institution_id = new.institution_id
      and assignment.academic_year_id = new.academic_year_id
      and assignment.class_id = new.class_id
      and assignment.subject_id = new.subject_id
      and assignment.teacher_id = new.teacher_id
      and period.id = new.period_id
      and assignment.all_periods
      and assignment.is_active
  ) then
    raise exception 'academic_course_assignment_context_mismatch';
  end if;
  return new;
end;
$$;

create trigger academic_courses_validate_context
before insert or update on public.academic_courses
for each row execute function public.validate_academic_course_context();

-- ---------------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------------

create type public.attendance_event_type as enum ('absence', 'late', 'present', 'excused');
create type public.attendance_justification_status as enum ('not_required', 'pending', 'justified', 'rejected');

create table if not exists public.attendance_records (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  class_id uuid not null references public.school_classes(id) on delete restrict,
  course_id uuid references public.academic_courses(id) on delete restrict,
  attendance_date date not null,
  period_id uuid references public.academic_periods(id) on delete restrict,
  event_type public.attendance_event_type not null,
  justification_status public.attendance_justification_status not null default 'pending',
  minutes_late integer check (minutes_late is null or minutes_late > 0),
  reason text,
  justification_document_id uuid,
  recorded_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_late_minutes check (
    (event_type = 'late' and minutes_late is not null)
    or (event_type <> 'late' and minutes_late is null)
  ),
  unique (student_id, attendance_date, course_id, event_type)
);

create index if not exists attendance_student_timeline_idx
  on public.attendance_records (student_id, attendance_date desc);
create index if not exists attendance_class_date_idx
  on public.attendance_records (class_id, attendance_date, event_type);
create index if not exists attendance_pending_justification_idx
  on public.attendance_records (institution_id, attendance_date desc)
  where justification_status = 'pending';

create trigger attendance_records_set_updated_at
before update on public.attendance_records
for each row execute function public.set_updated_at();

create or replace function public.validate_attendance_context()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.enrollments enrollment
    join public.class_assignments assignment
      on assignment.enrollment_id = enrollment.id
     and assignment.class_id = new.class_id
     and assignment.ends_on is null
    where enrollment.id = new.enrollment_id
      and enrollment.student_id = new.student_id
      and enrollment.institution_id = new.institution_id
      and enrollment.academic_year_id = new.academic_year_id
      and enrollment.status = 'confirmed'
  ) then
    raise exception 'attendance_requires_confirmed_class_enrollment';
  end if;

  if new.course_id is not null and not exists (
    select 1
    from public.academic_courses course
    where course.id = new.course_id
      and course.institution_id = new.institution_id
      and course.academic_year_id = new.academic_year_id
      and course.class_id = new.class_id
      and course.status = 'active'
  ) then
    raise exception 'attendance_course_context_mismatch';
  end if;

  return new;
end;
$$;

create trigger attendance_records_validate_context
before insert or update on public.attendance_records
for each row execute function public.validate_attendance_context();

-- ---------------------------------------------------------------------------
-- RLS and grants
-- ---------------------------------------------------------------------------

alter table public.enrollment_status_history enable row level security;
alter table public.enrollment_validation_results enable row level security;
alter table public.academic_courses enable row level security;
alter table public.attendance_records enable row level security;

create policy enrollment_status_history_select_member
on public.enrollment_status_history for select to authenticated
using (public.is_active_member(institution_id));

create policy enrollment_status_history_manage_schooling
on public.enrollment_status_history for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]));

create policy enrollment_validation_results_select_member
on public.enrollment_validation_results for select to authenticated
using (public.is_active_member(institution_id));

create policy enrollment_validation_results_manage_schooling
on public.enrollment_validation_results for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]));

create policy academic_courses_select_member
on public.academic_courses for select to authenticated
using (public.is_active_member(institution_id));

create policy academic_courses_manage_admin
on public.academic_courses for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

create policy attendance_records_select_member
on public.attendance_records for select to authenticated
using (public.is_active_member(institution_id));

create policy attendance_records_manage_schooling
on public.attendance_records for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]));

grant select, insert, update on
  public.enrollment_status_history,
  public.enrollment_validation_results,
  public.academic_courses,
  public.attendance_records
  to authenticated;

revoke all on
  public.enrollment_status_history,
  public.enrollment_validation_results,
  public.academic_courses,
  public.attendance_records
  from anon;
