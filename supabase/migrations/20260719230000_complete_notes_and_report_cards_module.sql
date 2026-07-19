begin;

create type public.subject_result_status as enum ('draft', 'calculated', 'validated');
create type public.deliberation_decision as enum ('pending', 'admitted', 'repeat', 'excluded', 'conditional');
create type public.report_card_status as enum ('draft', 'published', 'cancelled');

create table public.teaching_assignments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  teacher_user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.school_classes(id) on delete cascade,
  annual_subject_id uuid not null references public.annual_subjects(id) on delete cascade,
  starts_on date,
  ends_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teaching_assignments_dates_check check (ends_on is null or starts_on is null or ends_on >= starts_on),
  unique (academic_year_id, teacher_user_id, class_id, annual_subject_id)
);

create table public.period_subject_results (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  academic_period_id uuid not null references public.academic_periods(id) on delete cascade,
  class_id uuid not null references public.school_classes(id) on delete cascade,
  annual_subject_id uuid not null references public.annual_subjects(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  grading_formula_id uuid references public.grading_formulas(id) on delete restrict,
  grading_formula_version integer,
  variables jsonb not null default '{}'::jsonb,
  result numeric(8,3),
  status public.subject_result_status not null default 'draft',
  teacher_comment text,
  calculated_at timestamptz,
  validated_at timestamptz,
  validated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_period_id, annual_subject_id, enrollment_id)
);

create table public.deliberations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  academic_period_id uuid not null references public.academic_periods(id) on delete cascade,
  class_id uuid not null references public.school_classes(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  general_average numeric(8,3),
  rank integer,
  decision public.deliberation_decision not null default 'pending',
  mention text,
  conduct_comment text,
  council_comment text,
  decided_at timestamptz,
  decided_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_period_id, enrollment_id)
);

create table public.report_cards (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  academic_period_id uuid not null references public.academic_periods(id) on delete restrict,
  class_id uuid not null references public.school_classes(id) on delete restrict,
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  version integer not null default 1,
  status public.report_card_status not null default 'draft',
  snapshot jsonb not null,
  generated_at timestamptz not null default now(),
  generated_by uuid references auth.users(id),
  published_at timestamptz,
  published_by uuid references auth.users(id),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id),
  unique (academic_period_id, enrollment_id, version)
);

create index teaching_assignments_teacher_idx on public.teaching_assignments (teacher_user_id, academic_year_id, is_active);
create index teaching_assignments_class_idx on public.teaching_assignments (class_id, annual_subject_id, is_active);
create index period_subject_results_workspace_idx on public.period_subject_results (academic_period_id, class_id, annual_subject_id, status);
create index deliberations_workspace_idx on public.deliberations (academic_period_id, class_id, decision, rank);
create index report_cards_workspace_idx on public.report_cards (academic_period_id, class_id, status, generated_at desc);

create or replace function public.validate_teaching_assignment_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  selected_class public.school_classes%rowtype;
  selected_subject public.annual_subjects%rowtype;
begin
  select * into selected_class from public.school_classes where id = new.class_id;
  select * into selected_subject from public.annual_subjects where id = new.annual_subject_id;
  if selected_class.id is null or selected_subject.id is null then raise exception 'invalid_teaching_assignment_scope'; end if;
  if selected_class.institution_id <> new.institution_id
     or selected_class.academic_year_id <> new.academic_year_id
     or selected_subject.institution_id <> new.institution_id
     or selected_subject.academic_year_id <> new.academic_year_id
     or selected_subject.academic_year_level_id <> selected_class.academic_year_level_id then
    raise exception 'teaching_assignment_scope_mismatch';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger teaching_assignments_validate
before insert or update on public.teaching_assignments
for each row execute function public.validate_teaching_assignment_scope();

create or replace function public.is_assigned_teacher(target_class_id uuid, target_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teaching_assignments assignment
    where assignment.teacher_user_id = auth.uid()
      and assignment.class_id = target_class_id
      and assignment.annual_subject_id = target_subject_id
      and assignment.is_active
      and (assignment.starts_on is null or assignment.starts_on <= current_date)
      and (assignment.ends_on is null or assignment.ends_on >= current_date)
  );
$$;

create or replace function public.validate_result_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  selected_period public.academic_periods%rowtype;
  selected_class public.school_classes%rowtype;
  selected_subject public.annual_subjects%rowtype;
  selected_enrollment public.enrollments%rowtype;
begin
  select * into selected_period from public.academic_periods where id = new.academic_period_id;
  select * into selected_class from public.school_classes where id = new.class_id;
  select * into selected_subject from public.annual_subjects where id = new.annual_subject_id;
  select * into selected_enrollment from public.enrollments where id = new.enrollment_id;
  if selected_period.id is null or selected_class.id is null or selected_subject.id is null or selected_enrollment.id is null then
    raise exception 'invalid_result_scope';
  end if;
  if selected_period.institution_id <> new.institution_id or selected_period.academic_year_id <> new.academic_year_id
     or selected_class.institution_id <> new.institution_id or selected_class.academic_year_id <> new.academic_year_id
     or selected_subject.institution_id <> new.institution_id or selected_subject.academic_year_id <> new.academic_year_id
     or selected_enrollment.institution_id <> new.institution_id or selected_enrollment.academic_year_id <> new.academic_year_id
     or selected_subject.academic_year_level_id <> selected_class.academic_year_level_id
     or selected_enrollment.academic_year_level_id <> selected_class.academic_year_level_id
     or not exists (select 1 from public.class_assignments ca where ca.enrollment_id = new.enrollment_id and ca.class_id = new.class_id and ca.ends_on is null) then
    raise exception 'result_scope_mismatch';
  end if;
  if new.status in ('calculated','validated') and new.result is null then raise exception 'result_required'; end if;
  if new.status = 'validated' and old.status is distinct from 'validated' then
    new.validated_at := now(); new.validated_by := auth.uid();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger period_subject_results_validate
before insert or update on public.period_subject_results
for each row execute function public.validate_result_scope();

create or replace function public.publish_report_card(target_report_card_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare selected_card public.report_cards%rowtype;
begin
  select * into selected_card from public.report_cards where id = target_report_card_id for update;
  if selected_card.id is null then raise exception 'report_card_not_found'; end if;
  if not public.has_institution_role(selected_card.institution_id, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if selected_card.status <> 'draft' then raise exception 'report_card_not_draft'; end if;
  update public.report_cards set status='published', published_at=now(), published_by=auth.uid() where id=target_report_card_id;
end;
$$;

alter table public.teaching_assignments enable row level security;
alter table public.period_subject_results enable row level security;
alter table public.deliberations enable row level security;
alter table public.report_cards enable row level security;

create policy teaching_assignments_select on public.teaching_assignments for select to authenticated
using (public.is_active_member(institution_id));
create policy teaching_assignments_manage on public.teaching_assignments for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

create policy period_subject_results_select on public.period_subject_results for select to authenticated
using (public.is_active_member(institution_id));
create policy period_subject_results_write on public.period_subject_results for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]) or public.is_assigned_teacher(class_id, annual_subject_id))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]) or public.is_assigned_teacher(class_id, annual_subject_id));

create policy deliberations_select on public.deliberations for select to authenticated
using (public.is_active_member(institution_id));
create policy deliberations_manage on public.deliberations for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

create policy report_cards_select on public.report_cards for select to authenticated
using (public.is_active_member(institution_id));
create policy report_cards_manage on public.report_cards for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

grant execute on function public.is_assigned_teacher(uuid, uuid) to authenticated;
grant execute on function public.publish_report_card(uuid) to authenticated;

commit;
