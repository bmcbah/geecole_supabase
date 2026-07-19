begin;

create type public.teacher_employment_status as enum ('permanent', 'contract', 'vacation', 'intern', 'inactive');

create table public.teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  teacher_user_id uuid not null references auth.users(id) on delete cascade,
  employee_number text,
  specialty text,
  employment_status public.teacher_employment_status not null default 'permanent',
  hired_on date,
  left_on date,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, academic_year_id, teacher_user_id),
  constraint teacher_profiles_employee_number_check check (employee_number is null or char_length(trim(employee_number)) between 2 and 40),
  constraint teacher_profiles_dates_check check (left_on is null or hired_on is null or left_on >= hired_on)
);

create unique index teacher_profiles_employee_number_unique
  on public.teacher_profiles (institution_id, academic_year_id, upper(employee_number))
  where employee_number is not null;

create index teacher_profiles_year_active_idx
  on public.teacher_profiles (academic_year_id, is_active, teacher_user_id);

create or replace function public.validate_teacher_profile()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.academic_years year
    where year.id = new.academic_year_id
      and year.institution_id = new.institution_id
  ) then
    raise exception 'teacher_profile_year_mismatch';
  end if;

  new.employee_number := nullif(upper(trim(new.employee_number)), '');
  new.specialty := nullif(trim(new.specialty), '');
  new.notes := nullif(trim(new.notes), '');
  new.updated_at := now();
  return new;
end;
$$;

create trigger teacher_profiles_validate
before insert or update on public.teacher_profiles
for each row execute function public.validate_teacher_profile();

alter table public.teacher_profiles enable row level security;

create policy teacher_profiles_select on public.teacher_profiles
for select to authenticated
using (public.is_active_member(institution_id));

create policy teacher_profiles_manage on public.teacher_profiles
for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

create or replace function public.validate_teaching_assignment()
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

  if selected_class.id is null or selected_subject.id is null then
    raise exception 'invalid_teaching_assignment_scope';
  end if;
  if selected_class.institution_id <> new.institution_id
     or selected_class.academic_year_id <> new.academic_year_id
     or selected_subject.institution_id <> new.institution_id
     or selected_subject.academic_year_id <> new.academic_year_id
     or selected_subject.academic_year_level_id <> selected_class.academic_year_level_id then
    raise exception 'teaching_assignment_scope_mismatch';
  end if;
  if not exists (
    select 1 from public.teacher_profiles profile
    where profile.institution_id = new.institution_id
      and profile.academic_year_id = new.academic_year_id
      and profile.teacher_user_id = new.teacher_user_id
      and profile.is_active
      and profile.employment_status <> 'inactive'
  ) then
    raise exception 'active_teacher_profile_required';
  end if;
  if new.ends_on is not null and new.starts_on is not null and new.ends_on < new.starts_on then
    raise exception 'invalid_assignment_dates';
  end if;
  return new;
end;
$$;

commit;
