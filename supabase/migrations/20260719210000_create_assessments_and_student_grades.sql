begin;

create type public.grade_status as enum ('graded', 'absent', 'exempt', 'missing');
create type public.assessment_status as enum ('draft', 'open', 'locked', 'cancelled');

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  academic_period_id uuid not null references public.academic_periods(id) on delete restrict,
  class_id uuid not null references public.school_classes(id) on delete restrict,
  annual_subject_id uuid not null references public.annual_subjects(id) on delete restrict,
  assessment_type_id uuid not null references public.assessment_types(id) on delete restrict,
  title text not null,
  description text,
  assessment_date date not null default current_date,
  scale numeric(6,2) not null,
  status public.assessment_status not null default 'draft',
  created_by uuid references auth.users(id),
  locked_at timestamptz,
  locked_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessments_title_check check (char_length(trim(title)) between 2 and 120),
  constraint assessments_scale_check check (scale > 0),
  constraint assessments_lock_check check (
    (status <> 'locked' and locked_at is null and locked_by is null)
    or (status = 'locked' and locked_at is not null and locked_by is not null)
  )
);

create table public.student_grades (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  status public.grade_status not null default 'missing',
  score numeric(8,2),
  comment text,
  entered_by uuid references auth.users(id),
  entered_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint student_grades_score_status_check check (
    (status = 'graded' and score is not null)
    or (status <> 'graded' and score is null)
  ),
  unique (assessment_id, enrollment_id)
);

create index assessments_workspace_idx on public.assessments
  (academic_year_id, class_id, annual_subject_id, academic_period_id, assessment_date desc);
create index student_grades_assessment_idx on public.student_grades (assessment_id, enrollment_id);
create index student_grades_enrollment_idx on public.student_grades (enrollment_id, assessment_id);

create or replace function public.validate_assessment_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  selected_class public.school_classes%rowtype;
  selected_subject public.annual_subjects%rowtype;
  selected_period public.academic_periods%rowtype;
  selected_type public.assessment_types%rowtype;
  selected_level public.academic_year_levels%rowtype;
begin
  select * into selected_class from public.school_classes where id = new.class_id;
  select * into selected_subject from public.annual_subjects where id = new.annual_subject_id;
  select * into selected_period from public.academic_periods where id = new.academic_period_id;
  select * into selected_type from public.assessment_types where id = new.assessment_type_id;
  select * into selected_level from public.academic_year_levels where id = selected_class.academic_year_level_id;

  if selected_class.id is null or selected_subject.id is null or selected_period.id is null or selected_type.id is null then
    raise exception 'invalid_assessment_scope';
  end if;
  if selected_class.institution_id <> new.institution_id
     or selected_class.academic_year_id <> new.academic_year_id
     or selected_subject.institution_id <> new.institution_id
     or selected_subject.academic_year_id <> new.academic_year_id
     or selected_subject.academic_year_level_id <> selected_class.academic_year_level_id
     or selected_period.institution_id <> new.institution_id
     or selected_period.academic_year_id <> new.academic_year_id
     or selected_period.cycle_id <> selected_level.cycle_id
     or selected_type.institution_id <> new.institution_id
     or selected_type.academic_year_id <> new.academic_year_id then
    raise exception 'assessment_scope_mismatch';
  end if;
  if new.assessment_date < selected_period.starts_on or new.assessment_date > selected_period.ends_on then
    raise exception 'assessment_date_outside_period';
  end if;
  if new.scale is null then new.scale := selected_type.scale; end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger assessments_validate_scope
before insert or update on public.assessments
for each row execute function public.validate_assessment_scope();

create or replace function public.guard_locked_assessment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'locked' then raise exception 'assessment_locked'; end if;
  if new.status = 'locked' then
    new.locked_at := now();
    new.locked_by := auth.uid();
  elsif new.status <> 'locked' then
    new.locked_at := null;
    new.locked_by := null;
  end if;
  return new;
end;
$$;

create trigger assessments_guard_lock
before update on public.assessments
for each row execute function public.guard_locked_assessment();

create or replace function public.validate_student_grade()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  selected_assessment public.assessments%rowtype;
  selected_enrollment public.enrollments%rowtype;
begin
  select * into selected_assessment from public.assessments where id = new.assessment_id;
  select * into selected_enrollment from public.enrollments where id = new.enrollment_id;
  if selected_assessment.id is null or selected_enrollment.id is null then raise exception 'invalid_grade_scope'; end if;
  if selected_assessment.status = 'locked' then raise exception 'assessment_locked'; end if;
  if selected_assessment.institution_id <> new.institution_id
     or selected_assessment.academic_year_id <> new.academic_year_id
     or selected_enrollment.institution_id <> new.institution_id
     or selected_enrollment.academic_year_id <> new.academic_year_id
     or selected_enrollment.academic_year_level_id <> (select academic_year_level_id from public.school_classes where id = selected_assessment.class_id)
     or not exists (
       select 1 from public.class_assignments assignment
       where assignment.enrollment_id = new.enrollment_id
         and assignment.class_id = selected_assessment.class_id
         and assignment.ends_on is null
     ) then raise exception 'grade_scope_mismatch'; end if;
  if new.status = 'graded' and (new.score < 0 or new.score > selected_assessment.scale) then
    raise exception 'grade_out_of_scale';
  end if;
  new.entered_by := auth.uid();
  new.entered_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger student_grades_validate
before insert or update on public.student_grades
for each row execute function public.validate_student_grade();

create or replace function public.save_assessment_grades(target_assessment_id uuid, grade_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_assessment public.assessments%rowtype;
  grade_row jsonb;
  changed integer := 0;
begin
  select * into selected_assessment from public.assessments where id = target_assessment_id for update;
  if selected_assessment.id is null then raise exception 'assessment_not_found'; end if;
  if selected_assessment.status = 'locked' then raise exception 'assessment_locked'; end if;
  if not public.has_institution_role(selected_assessment.institution_id, array['owner','admin','teacher']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  if jsonb_typeof(grade_rows) <> 'array' then raise exception 'grade_rows_array_required'; end if;

  for grade_row in select * from jsonb_array_elements(grade_rows)
  loop
    insert into public.student_grades(
      institution_id, academic_year_id, assessment_id, enrollment_id, status, score, comment
    ) values (
      selected_assessment.institution_id,
      selected_assessment.academic_year_id,
      selected_assessment.id,
      (grade_row->>'enrollment_id')::uuid,
      coalesce((grade_row->>'status')::public.grade_status, 'missing'),
      case when coalesce(grade_row->>'status','missing') = 'graded' then (grade_row->>'score')::numeric else null end,
      nullif(trim(grade_row->>'comment'), '')
    )
    on conflict (assessment_id, enrollment_id) do update set
      status = excluded.status,
      score = excluded.score,
      comment = excluded.comment;
    changed := changed + 1;
  end loop;
  return changed;
end;
$$;

alter table public.assessments enable row level security;
alter table public.student_grades enable row level security;

create policy assessments_select on public.assessments for select to authenticated
using (public.is_active_member(institution_id));
create policy assessments_write on public.assessments for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin','teacher']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin','teacher']::public.app_role[]));

create policy student_grades_select on public.student_grades for select to authenticated
using (public.is_active_member(institution_id));
create policy student_grades_write on public.student_grades for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin','teacher']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin','teacher']::public.app_role[]));

grant execute on function public.save_assessment_grades(uuid, jsonb) to authenticated;

commit;
