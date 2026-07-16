create table public.subjects (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  code text not null check (char_length(trim(code)) between 1 and 20),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, name),
  unique (institution_id, code),
  unique (id, institution_id)
);

create table public.annual_subjects (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  academic_year_level_id uuid not null references public.academic_year_levels(id) on delete cascade,
  subject_id uuid not null,
  subject_name_snapshot text not null,
  coefficient numeric(6,2) not null default 1 check (coefficient > 0),
  weekly_hours numeric(5,2) not null default 0 check (weekly_hours >= 0),
  created_at timestamptz not null default now(),
  constraint annual_subjects_year_fk foreign key (academic_year_id, institution_id)
    references public.academic_years(id, institution_id) on delete cascade,
  constraint annual_subjects_subject_fk foreign key (subject_id, institution_id)
    references public.subjects(id, institution_id) on delete restrict,
  unique (academic_year_id, academic_year_level_id, subject_id)
);

create table public.assessment_types (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 80),
  code text not null check (char_length(trim(code)) between 1 and 20),
  weight numeric(6,2) not null default 1 check (weight > 0),
  scale numeric(6,2) not null default 20 check (scale > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint assessment_types_year_fk foreign key (academic_year_id, institution_id)
    references public.academic_years(id, institution_id) on delete cascade,
  unique (academic_year_id, name),
  unique (academic_year_id, code)
);

create table public.grading_formulas (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 100),
  expression text not null check (char_length(trim(expression)) between 1 and 500),
  description text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  constraint grading_formulas_year_fk foreign key (academic_year_id, institution_id)
    references public.academic_years(id, institution_id) on delete cascade,
  unique (academic_year_id, name)
);
create unique index grading_formulas_one_default_idx
  on public.grading_formulas(academic_year_id) where is_default;

create table public.financial_rules (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 100),
  code text not null check (char_length(trim(code)) between 1 and 20),
  amount numeric(14,2) not null check (amount >= 0),
  due_day smallint check (due_day between 1 and 31),
  frequency text not null default 'once' check (frequency in ('once', 'monthly', 'termly')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint financial_rules_year_fk foreign key (academic_year_id, institution_id)
    references public.academic_years(id, institution_id) on delete cascade,
  unique (academic_year_id, code)
);

create table public.academic_year_user_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  responsibility text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint year_user_assignments_year_fk foreign key (academic_year_id, institution_id)
    references public.academic_years(id, institution_id) on delete cascade,
  unique (academic_year_id, membership_id)
);

create policy profiles_select_institution_colleague on public.profiles
for select to authenticated using (
  exists (
    select 1 from public.memberships colleague
    join public.memberships current_member
      on current_member.institution_id = colleague.institution_id
    where colleague.user_id = profiles.id
      and current_member.user_id = (select auth.uid())
      and current_member.status = 'active'
  )
);

create index annual_subjects_year_idx on public.annual_subjects(academic_year_id);
create index assessment_types_year_idx on public.assessment_types(academic_year_id);
create index grading_formulas_year_idx on public.grading_formulas(academic_year_id);
create index financial_rules_year_idx on public.financial_rules(academic_year_id);
create index year_user_assignments_year_idx on public.academic_year_user_assignments(academic_year_id);
create trigger subjects_set_updated_at before update on public.subjects
for each row execute function public.set_updated_at();

create or replace function public.ensure_preparation_year_write()
returns trigger language plpgsql set search_path = '' as $$
declare year_id uuid; year_status public.academic_year_status;
begin
  year_id := case when tg_op = 'DELETE' then old.academic_year_id else new.academic_year_id end;
  select status into year_status from public.academic_years where id = year_id;
  if year_status <> 'preparation' then raise exception 'academic_year_configuration_locked'; end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.prepare_annual_subject()
returns trigger language plpgsql security definer set search_path = '' as $$
declare annual_level public.academic_year_levels; subject_row public.subjects;
begin
  select * into annual_level from public.academic_year_levels where id = new.academic_year_level_id;
  select * into subject_row from public.subjects where id = new.subject_id and institution_id = new.institution_id;
  if annual_level.id is null or annual_level.academic_year_id <> new.academic_year_id
    or annual_level.institution_id <> new.institution_id or subject_row.id is null
  then raise exception 'invalid_annual_subject'; end if;
  new.subject_name_snapshot := subject_row.name;
  return new;
end;
$$;

create trigger annual_subjects_prepare before insert or update on public.annual_subjects
for each row execute function public.prepare_annual_subject();

do $$
declare table_name text;
begin
  foreach table_name in array array['annual_subjects','assessment_types','grading_formulas','financial_rules','academic_year_user_assignments']
  loop
    execute format('create trigger %I_lock before insert or update or delete on public.%I for each row execute function public.ensure_preparation_year_write()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I_select on public.%I for select to authenticated using (public.is_active_member(institution_id))', table_name, table_name);
    execute format('create policy %I_write on public.%I for all to authenticated using (public.has_institution_role(institution_id, array[''owner'',''admin'']::public.app_role[])) with check (public.has_institution_role(institution_id, array[''owner'',''admin'']::public.app_role[]))', table_name, table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('revoke all on public.%I from anon', table_name);
  end loop;
end $$;

alter table public.subjects enable row level security;
create policy subjects_select on public.subjects for select to authenticated using (public.is_active_member(institution_id));
create policy subjects_write on public.subjects for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
grant select, insert, update, delete on public.subjects to authenticated;
revoke all on public.subjects from anon;

create or replace function public.clone_academic_year_configuration(
  source_year_id uuid,
  target_year_id uuid,
  include_structure boolean default true,
  include_subjects boolean default true,
  include_assessments boolean default true,
  include_finance boolean default true,
  include_users boolean default true
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare source_institution uuid; target_institution uuid; target_status public.academic_year_status;
declare structure_count integer := 0; subjects_count integer := 0; assessments_count integer := 0;
declare formulas_count integer := 0; finance_count integer := 0; users_count integer := 0;
begin
  select institution_id into source_institution from public.academic_years where id = source_year_id;
  select institution_id, status into target_institution, target_status from public.academic_years where id = target_year_id;
  if source_institution is null or target_institution is null or source_institution <> target_institution then raise exception 'incompatible_academic_years'; end if;
  if source_year_id = target_year_id then raise exception 'source_and_target_must_differ'; end if;
  if target_status <> 'preparation' then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(target_institution, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;

  if include_structure then
    select public.clone_academic_year_levels(source_year_id, target_year_id) into structure_count;
  end if;
  if include_subjects then
    insert into public.annual_subjects (institution_id, academic_year_id, academic_year_level_id, subject_id, subject_name_snapshot, coefficient, weekly_hours)
    select s.institution_id, target_year_id, target_level.id, s.subject_id, s.subject_name_snapshot, s.coefficient, s.weekly_hours
    from public.annual_subjects s
    join public.academic_year_levels source_level on source_level.id = s.academic_year_level_id
    join public.academic_year_levels target_level on target_level.academic_year_id = target_year_id and target_level.level_id = source_level.level_id
    where s.academic_year_id = source_year_id
    on conflict (academic_year_id, academic_year_level_id, subject_id) do nothing;
    get diagnostics subjects_count = row_count;
  end if;
  if include_assessments then
    insert into public.assessment_types (institution_id, academic_year_id, name, code, weight, scale, is_active)
    select institution_id, target_year_id, name, code, weight, scale, is_active from public.assessment_types where academic_year_id = source_year_id
    on conflict (academic_year_id, code) do nothing;
    get diagnostics assessments_count = row_count;
    insert into public.grading_formulas (institution_id, academic_year_id, name, expression, description, is_default)
    select institution_id, target_year_id, name, expression, description, is_default from public.grading_formulas where academic_year_id = source_year_id
    on conflict (academic_year_id, name) do nothing;
    get diagnostics formulas_count = row_count;
  end if;
  if include_finance then
    insert into public.financial_rules (institution_id, academic_year_id, name, code, amount, due_day, frequency, is_active)
    select institution_id, target_year_id, name, code, amount, due_day, frequency, is_active from public.financial_rules where academic_year_id = source_year_id
    on conflict (academic_year_id, code) do nothing;
    get diagnostics finance_count = row_count;
  end if;
  if include_users then
    insert into public.academic_year_user_assignments (institution_id, academic_year_id, membership_id, responsibility, is_active)
    select institution_id, target_year_id, membership_id, responsibility, is_active from public.academic_year_user_assignments where academic_year_id = source_year_id
    on conflict (academic_year_id, membership_id) do nothing;
    get diagnostics users_count = row_count;
  end if;
  return jsonb_build_object('structure', structure_count, 'subjects', subjects_count, 'assessments', assessments_count, 'formulas', formulas_count, 'finance', finance_count, 'users', users_count);
end;
$$;

revoke all on function public.clone_academic_year_configuration(uuid, uuid, boolean, boolean, boolean, boolean, boolean) from public;
grant execute on function public.clone_academic_year_configuration(uuid, uuid, boolean, boolean, boolean, boolean, boolean) to authenticated;
