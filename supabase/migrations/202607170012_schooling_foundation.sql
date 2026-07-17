create type public.student_status as enum ('active', 'inactive');
create type public.enrollment_status as enum (
  'draft', 'pre_registered', 'confirmed', 'rejected', 'withdrawn', 'cancelled', 'transferred'
);

create table public.students (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  matricule text not null,
  first_name text not null check (char_length(trim(first_name)) between 1 and 80),
  last_name text not null check (char_length(trim(last_name)) between 1 and 80),
  other_names text,
  gender text not null check (gender in ('female', 'male', 'other')),
  birth_date date,
  birth_date_is_approximate boolean not null default false,
  birth_place text,
  nationality text not null default 'Guinéenne',
  address text,
  photo_url text,
  birth_certificate_number text,
  previous_school text,
  previous_level text,
  status public.student_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, matricule)
);

create table public.guardians (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  primary_phone text not null,
  secondary_phone text,
  address text,
  occupation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index guardians_phone_unique
  on public.guardians (institution_id, regexp_replace(primary_phone, '\\s+', '', 'g'));

create table public.student_guardians (
  student_id uuid not null references public.students(id) on delete cascade,
  guardian_id uuid not null references public.guardians(id) on delete restrict,
  relationship text not null,
  is_primary_contact boolean not null default false,
  is_financial_responsible boolean not null default false,
  is_emergency_contact boolean not null default false,
  can_pick_up boolean not null default false,
  receives_communications boolean not null default true,
  primary key (student_id, guardian_id)
);

create table public.enrollments (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  academic_year_level_id uuid not null references public.academic_year_levels(id) on delete restrict,
  status public.enrollment_status not null default 'draft',
  admission_date date not null default current_date,
  origin text not null default 'new' check (origin in ('new', 'transfer', 'returning')),
  level_name_snapshot text not null,
  cycle_name_snapshot text not null,
  cancellation_reason text,
  confirmed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index enrollments_one_current_per_year
  on public.enrollments (institution_id, academic_year_id, student_id)
  where status not in ('cancelled', 'rejected', 'withdrawn');
create index students_search_idx on public.students (institution_id, last_name, first_name);
create index enrollments_year_status_idx on public.enrollments (academic_year_id, status);

create trigger students_set_updated_at before update on public.students
  for each row execute function public.set_updated_at();
create trigger guardians_set_updated_at before update on public.guardians
  for each row execute function public.set_updated_at();
create trigger enrollments_set_updated_at before update on public.enrollments
  for each row execute function public.set_updated_at();

create sequence public.student_matricule_sequence;

create or replace function public.create_student_enrollment(
  target_institution_id uuid,
  target_academic_year_id uuid,
  target_annual_level_id uuid,
  student_first_name text,
  student_last_name text,
  student_gender text,
  student_birth_date date,
  student_birth_place text,
  student_address text,
  guardian_first_name text,
  guardian_last_name text,
  guardian_phone text,
  guardian_relationship text,
  enrollment_kind public.enrollment_status default 'pre_registered'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  new_student_id uuid;
  selected_guardian_id uuid;
  annual_level public.academic_year_levels%rowtype;
  enrollment_id uuid;
  generated_matricule text;
begin
  if not public.has_institution_role(target_institution_id, array['owner','admin','secretary']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  if enrollment_kind not in ('draft', 'pre_registered', 'confirmed') then
    raise exception 'invalid_initial_status';
  end if;
  select * into annual_level from public.academic_year_levels
    where id = target_annual_level_id and institution_id = target_institution_id
      and academic_year_id = target_academic_year_id and is_active;
  if not found then raise exception 'invalid_annual_level'; end if;

  generated_matricule := 'EL-' || extract(year from current_date)::text || '-' ||
    lpad(nextval('public.student_matricule_sequence')::text, 5, '0');
  insert into public.students (
    institution_id, matricule, first_name, last_name, gender,
    birth_date, birth_place, address
  ) values (
    target_institution_id, generated_matricule, trim(student_first_name),
    trim(student_last_name), student_gender, student_birth_date,
    nullif(trim(student_birth_place), ''), nullif(trim(student_address), '')
  ) returning id into new_student_id;

  select id into selected_guardian_id from public.guardians
    where institution_id = target_institution_id
      and regexp_replace(primary_phone, '\\s+', '', 'g') = regexp_replace(guardian_phone, '\\s+', '', 'g');
  if selected_guardian_id is null then
    insert into public.guardians (institution_id, first_name, last_name, primary_phone)
    values (target_institution_id, trim(guardian_first_name), trim(guardian_last_name), trim(guardian_phone))
    returning id into selected_guardian_id;
  end if;
  insert into public.student_guardians (
    student_id, guardian_id, relationship, is_primary_contact,
    is_financial_responsible, is_emergency_contact
  ) values (new_student_id, selected_guardian_id, guardian_relationship, true, true, true);

  insert into public.enrollments (
    institution_id, academic_year_id, student_id, academic_year_level_id,
    status, level_name_snapshot, cycle_name_snapshot, confirmed_at, created_by
  ) values (
    target_institution_id, target_academic_year_id, new_student_id, target_annual_level_id,
    enrollment_kind, annual_level.level_name_snapshot, annual_level.cycle_name_snapshot,
    case when enrollment_kind = 'confirmed' then now() else null end, (select auth.uid())
  ) returning id into enrollment_id;
  return enrollment_id;
end;
$$;

revoke all on function public.create_student_enrollment(uuid,uuid,uuid,text,text,text,date,text,text,text,text,text,text,public.enrollment_status) from public;
grant execute on function public.create_student_enrollment(uuid,uuid,uuid,text,text,text,date,text,text,text,text,text,text,public.enrollment_status) to authenticated;

alter table public.students enable row level security;
alter table public.guardians enable row level security;
alter table public.student_guardians enable row level security;
alter table public.enrollments enable row level security;

create policy students_select_member on public.students for select to authenticated
  using (public.is_active_member(institution_id));
create policy students_manage_schooling on public.students for all to authenticated
  using (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]))
  with check (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]));
create policy guardians_select_member on public.guardians for select to authenticated
  using (public.is_active_member(institution_id));
create policy guardians_manage_schooling on public.guardians for all to authenticated
  using (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]))
  with check (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]));
create policy student_guardians_select_member on public.student_guardians for select to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and public.is_active_member(s.institution_id)));
create policy student_guardians_manage_schooling on public.student_guardians for all to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and public.has_institution_role(s.institution_id, array['owner','admin','secretary']::public.app_role[])))
  with check (exists (select 1 from public.students s where s.id = student_id and public.has_institution_role(s.institution_id, array['owner','admin','secretary']::public.app_role[])));
create policy enrollments_select_member on public.enrollments for select to authenticated
  using (public.is_active_member(institution_id));
create policy enrollments_manage_schooling on public.enrollments for all to authenticated
  using (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]))
  with check (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]));

grant select, insert, update on public.students, public.guardians, public.student_guardians, public.enrollments to authenticated;
revoke all on public.students, public.guardians, public.student_guardians, public.enrollments from anon;
