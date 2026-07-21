-- GeEcole V1 — Socle, établissements et paramétrage scolaire
-- Baseline consolidée le 2026-07-22.
-- Les marqueurs "Source consolidée" conservent la traçabilité Git.

-- -----------------------------------------------------------------------------
-- Source consolidée : 202607160001_foundation.sql
-- -----------------------------------------------------------------------------

create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('owner', 'admin', 'secretary', 'teacher', 'finance');
create type public.membership_status as enum ('active', 'suspended');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.institutions (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  phone text,
  email text,
  address text,
  currency text not null default 'GNF' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Africa/Conakry',
  locale text not null default 'fr-GN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (institution_id, user_id)
);

create index memberships_user_id_idx on public.memberships(user_id);
create index memberships_institution_status_idx on public.memberships(institution_id, status);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger institutions_set_updated_at before update on public.institutions for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_active_member(target_institution_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where institution_id = target_institution_id and user_id = (select auth.uid()) and status = 'active'
  );
$$;

create or replace function public.has_institution_role(target_institution_id uuid, allowed_roles public.app_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where institution_id = target_institution_id and user_id = (select auth.uid())
      and status = 'active' and role = any(allowed_roles)
  );
$$;

create or replace function public.create_institution(institution_name text, institution_slug text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  insert into public.institutions (name, slug)
  values (trim(institution_name), lower(trim(institution_slug))) returning id into new_id;
  insert into public.memberships (institution_id, user_id, role)
  values (new_id, (select auth.uid()), 'owner');
  return new_id;
end;
$$;

revoke all on function public.create_institution(text, text) from public;
grant execute on function public.create_institution(text, text) to authenticated;
revoke all on function public.is_active_member(uuid) from public;
grant execute on function public.is_active_member(uuid) to authenticated;
revoke all on function public.has_institution_role(uuid, public.app_role[]) from public;
grant execute on function public.has_institution_role(uuid, public.app_role[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.institutions enable row level security;
alter table public.memberships enable row level security;

create policy profiles_select_self on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy institutions_select_member on public.institutions for select to authenticated using (public.is_active_member(id));
create policy institutions_update_admin on public.institutions for update to authenticated using (public.has_institution_role(id, array['owner','admin']::public.app_role[])) with check (public.has_institution_role(id, array['owner','admin']::public.app_role[]));

create policy memberships_select_member on public.memberships for select to authenticated using (public.is_active_member(institution_id));
create policy memberships_insert_admin on public.memberships for insert to authenticated with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
create policy memberships_update_admin on public.memberships for update to authenticated using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[])) with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
create policy memberships_delete_owner on public.memberships for delete to authenticated using (public.has_institution_role(institution_id, array['owner']::public.app_role[]) and role <> 'owner');


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607160002_institution_settings.sql
-- -----------------------------------------------------------------------------

create type public.academic_year_status as enum ('preparation', 'open', 'closed', 'archived');

create table public.academic_years (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 4 and 30),
  starts_on date not null,
  ends_on date not null,
  status public.academic_year_status not null default 'preparation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_years_valid_dates check (starts_on < ends_on),
  constraint academic_years_unique_name unique (institution_id, name)
);

create unique index academic_years_one_open_per_institution_idx
  on public.academic_years (institution_id)
  where status = 'open';
create index academic_years_institution_dates_idx
  on public.academic_years (institution_id, starts_on desc);

create trigger academic_years_set_updated_at
before update on public.academic_years
for each row execute function public.set_updated_at();

create or replace function public.enforce_academic_year_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = old.status then return new; end if;
  if not (
    (old.status = 'preparation' and new.status = 'open') or
    (old.status = 'open' and new.status = 'closed') or
    (old.status = 'closed' and new.status = 'archived')
  ) then
    raise exception 'invalid_academic_year_transition: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$;

create trigger academic_years_enforce_transition
before update of status on public.academic_years
for each row execute function public.enforce_academic_year_transition();

alter table public.academic_years enable row level security;

create policy academic_years_select_member
on public.academic_years for select to authenticated
using (public.is_active_member(institution_id));

create policy academic_years_insert_admin
on public.academic_years for insert to authenticated
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

create policy academic_years_update_admin
on public.academic_years for update to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

create policy academic_years_delete_preparation_admin
on public.academic_years for delete to authenticated
using (
  status = 'preparation'
  and public.has_institution_role(institution_id, array['owner','admin']::public.app_role[])
);


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607160003_authenticated_grants.sql
-- -----------------------------------------------------------------------------

grant usage on schema public to authenticated;

grant select, update
on public.profiles, public.institutions
to authenticated;

grant select, insert, update, delete
on public.memberships, public.academic_years
to authenticated;

revoke all
on public.profiles, public.institutions, public.memberships, public.academic_years
from anon;


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607160004_academic_structure.sql
-- -----------------------------------------------------------------------------

create table public.academic_cycles (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  code text not null check (code ~ '^[A-Z0-9_-]{2,20}$'),
  sort_order smallint not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, name),
  unique (institution_id, code),
  unique (id, institution_id)
);

create table public.grade_levels (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  cycle_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 80),
  code text not null check (code ~ '^[A-Z0-9_-]{1,20}$'),
  sort_order smallint not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grade_levels_cycle_fk foreign key (cycle_id, institution_id)
    references public.academic_cycles(id, institution_id) on delete restrict,
  unique (cycle_id, name),
  unique (cycle_id, code)
);

create index academic_cycles_institution_order_idx on public.academic_cycles(institution_id, sort_order, name);
create index grade_levels_cycle_order_idx on public.grade_levels(cycle_id, sort_order, name);

create trigger academic_cycles_set_updated_at before update on public.academic_cycles
for each row execute function public.set_updated_at();
create trigger grade_levels_set_updated_at before update on public.grade_levels
for each row execute function public.set_updated_at();

alter table public.academic_cycles enable row level security;
alter table public.grade_levels enable row level security;

create policy academic_cycles_select_member on public.academic_cycles for select to authenticated
using (public.is_active_member(institution_id));
create policy academic_cycles_insert_admin on public.academic_cycles for insert to authenticated
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
create policy academic_cycles_update_admin on public.academic_cycles for update to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

create policy grade_levels_select_member on public.grade_levels for select to authenticated
using (public.is_active_member(institution_id));
create policy grade_levels_insert_admin on public.grade_levels for insert to authenticated
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
create policy grade_levels_update_admin on public.grade_levels for update to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

grant select, insert, update on public.academic_cycles, public.grade_levels to authenticated;
revoke all on public.academic_cycles, public.grade_levels from anon;


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607160005_annual_academic_structure.sql
-- -----------------------------------------------------------------------------

alter table public.academic_years
  add constraint academic_years_id_institution_unique unique (id, institution_id);
alter table public.grade_levels
  add constraint grade_levels_id_cycle_institution_unique unique (id, cycle_id, institution_id);

create table public.academic_year_levels (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  cycle_id uuid not null,
  level_id uuid not null,
  cycle_name_snapshot text not null,
  level_name_snapshot text not null,
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  cloned_from_id uuid references public.academic_year_levels(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint annual_levels_year_fk foreign key (academic_year_id, institution_id)
    references public.academic_years(id, institution_id) on delete cascade,
  constraint annual_levels_cycle_fk foreign key (cycle_id, institution_id)
    references public.academic_cycles(id, institution_id) on delete restrict,
  constraint annual_levels_level_fk foreign key (level_id, cycle_id, institution_id)
    references public.grade_levels(id, cycle_id, institution_id) on delete restrict,
  unique (academic_year_id, level_id)
);

create index academic_year_levels_year_cycle_idx
  on public.academic_year_levels(academic_year_id, cycle_id, sort_order);

create or replace function public.prepare_academic_year_level()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cycle_row public.academic_cycles; level_row public.grade_levels;
begin
  select * into cycle_row from public.academic_cycles
  where id = new.cycle_id and institution_id = new.institution_id;
  select * into level_row from public.grade_levels
  where id = new.level_id and cycle_id = new.cycle_id and institution_id = new.institution_id;
  if cycle_row.id is null or level_row.id is null then raise exception 'invalid_academic_structure'; end if;
  new.cycle_name_snapshot = cycle_row.name;
  new.level_name_snapshot = level_row.name;
  new.sort_order = level_row.sort_order;
  return new;
end;
$$;

create trigger academic_year_levels_prepare before insert on public.academic_year_levels
for each row execute function public.prepare_academic_year_level();

create or replace function public.set_academic_year_cycle_levels(
  target_year_id uuid, target_cycle_id uuid, target_level_ids uuid[]
)
returns integer language plpgsql security definer set search_path = '' as $$
declare target_institution_id uuid; target_status public.academic_year_status; inserted_count integer;
begin
  select institution_id, status into target_institution_id, target_status
  from public.academic_years where id = target_year_id;
  if target_institution_id is null then raise exception 'academic_year_not_found'; end if;
  if not public.has_institution_role(target_institution_id, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if target_status <> 'preparation' then raise exception 'academic_year_configuration_locked'; end if;
  if not exists (select 1 from public.academic_cycles where id = target_cycle_id and institution_id = target_institution_id) then raise exception 'cycle_not_found'; end if;
  delete from public.academic_year_levels where academic_year_id = target_year_id and cycle_id = target_cycle_id;
  insert into public.academic_year_levels (
    institution_id, academic_year_id, cycle_id, level_id, cycle_name_snapshot, level_name_snapshot
  )
  select target_institution_id, target_year_id, target_cycle_id, level.id, '', ''
  from public.grade_levels level
  where level.id = any(coalesce(target_level_ids, array[]::uuid[]))
    and level.cycle_id = target_cycle_id and level.institution_id = target_institution_id and level.is_active;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.clone_academic_year_levels(source_year_id uuid, target_year_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare source_institution_id uuid; target_institution_id uuid; target_status public.academic_year_status; inserted_count integer;
begin
  select institution_id into source_institution_id from public.academic_years where id = source_year_id;
  select institution_id, status into target_institution_id, target_status from public.academic_years where id = target_year_id;
  if source_institution_id is null or target_institution_id is null or source_institution_id <> target_institution_id then raise exception 'incompatible_academic_years'; end if;
  if not public.has_institution_role(target_institution_id, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if target_status <> 'preparation' then raise exception 'academic_year_configuration_locked'; end if;
  insert into public.academic_year_levels (
    institution_id, academic_year_id, cycle_id, level_id, cycle_name_snapshot, level_name_snapshot, is_active, cloned_from_id
  )
  select institution_id, target_year_id, cycle_id, level_id, cycle_name_snapshot, level_name_snapshot, is_active, id
  from public.academic_year_levels where academic_year_id = source_year_id
  on conflict (academic_year_id, level_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.enforce_academic_year_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = old.status then return new; end if;
  if new.status = 'open' and not exists (
    select 1 from public.academic_year_levels where academic_year_id = new.id and is_active
  ) then raise exception 'academic_year_requires_active_levels'; end if;
  if not (
    (old.status = 'preparation' and new.status = 'open') or
    (old.status = 'open' and new.status = 'closed') or
    (old.status = 'closed' and new.status = 'archived')
  ) then raise exception 'invalid_academic_year_transition: % -> %', old.status, new.status; end if;
  return new;
end;
$$;

alter table public.academic_year_levels enable row level security;
create policy annual_levels_select_member on public.academic_year_levels for select to authenticated
using (public.is_active_member(institution_id));
create policy annual_levels_write_admin on public.academic_year_levels for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

grant select, insert, update, delete on public.academic_year_levels to authenticated;
revoke all on public.academic_year_levels from anon;
revoke all on function public.set_academic_year_cycle_levels(uuid, uuid, uuid[]) from public;
grant execute on function public.set_academic_year_cycle_levels(uuid, uuid, uuid[]) to authenticated;
revoke all on function public.clone_academic_year_levels(uuid, uuid) from public;
grant execute on function public.clone_academic_year_levels(uuid, uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607160006_annual_settings.sql
-- -----------------------------------------------------------------------------

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
    insert into public.assessment_types (institution_id, academic_year_id, name, code, weight, is_active)
    select institution_id, target_year_id, name, code, weight, is_active from public.assessment_types where academic_year_id = source_year_id
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


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607160007_people_periods.sql
-- -----------------------------------------------------------------------------

alter type public.app_role add value if not exists 'parent';
alter type public.app_role add value if not exists 'student';

alter table public.academic_cycles
  add column period_system text not null default 'term' check (period_system in ('term', 'semester', 'custom')),
  add column period_count smallint not null default 3 check (period_count between 1 and 6);

create table public.people (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  first_name text not null check (char_length(trim(first_name)) between 2 and 80),
  last_name text not null check (char_length(trim(last_name)) between 2 and 80),
  email text,
  phone text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, email)
);
create index people_institution_name_idx on public.people(institution_id, last_name, first_name);
create trigger people_set_updated_at before update on public.people
for each row execute function public.set_updated_at();

create table public.person_roles (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (person_id, role)
);

create table public.person_invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index person_invitations_person_idx on public.person_invitations(person_id, status);

create table public.academic_periods (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  cycle_id uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 80),
  code text not null check (char_length(trim(code)) between 1 and 20),
  sequence smallint not null check (sequence between 1 and 6),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'planned' check (status in ('planned', 'open', 'closed')),
  created_at timestamptz not null default now(),
  constraint academic_periods_dates check (starts_on <= ends_on),
  constraint academic_periods_year_fk foreign key (academic_year_id, institution_id)
    references public.academic_years(id, institution_id) on delete cascade,
  constraint academic_periods_cycle_fk foreign key (cycle_id, institution_id)
    references public.academic_cycles(id, institution_id) on delete restrict,
  unique (academic_year_id, cycle_id, sequence),
  unique (academic_year_id, cycle_id, code)
);
create index academic_periods_year_cycle_idx on public.academic_periods(academic_year_id, cycle_id, sequence);
create trigger academic_periods_lock before insert or update or delete on public.academic_periods
for each row execute function public.ensure_preparation_year_write();

create or replace function public.sync_academic_year_periods(target_year_id uuid, target_cycle_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare target_institution uuid; target_status public.academic_year_status; year_start date; year_end date;
declare system_name text; number_of_periods integer; period_index integer; period_start date; period_end date;
begin
  select institution_id, status, starts_on, ends_on into target_institution, target_status, year_start, year_end
  from public.academic_years where id = target_year_id;
  select period_system, period_count into system_name, number_of_periods from public.academic_cycles
  where id = target_cycle_id and institution_id = target_institution;
  if target_institution is null or system_name is null then raise exception 'invalid_year_or_cycle'; end if;
  if target_status <> 'preparation' then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(target_institution, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  delete from public.academic_periods where academic_year_id = target_year_id and cycle_id = target_cycle_id;
  for period_index in 1..number_of_periods loop
    period_start := year_start + (((year_end - year_start + 1) * (period_index - 1)) / number_of_periods);
    period_end := case when period_index = number_of_periods then year_end else year_start + (((year_end - year_start + 1) * period_index) / number_of_periods) - 1 end;
    insert into public.academic_periods(institution_id, academic_year_id, cycle_id, name, code, sequence, starts_on, ends_on)
    values(target_institution, target_year_id, target_cycle_id,
      case system_name when 'term' then period_index || case when period_index = 1 then 'er trimestre' else 'e trimestre' end
        when 'semester' then period_index || case when period_index = 1 then 'er semestre' else 'e semestre' end
        else 'Période ' || period_index end,
      'P' || period_index, period_index, period_start, period_end);
  end loop;
  return number_of_periods;
end;
$$;

create or replace function public.create_person_invitation(target_person_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare person_row public.people; raw_token text;
begin
  select * into person_row from public.people where id = target_person_id;
  if person_row.id is null or person_row.email is null then raise exception 'person_email_required'; end if;
  if not public.has_institution_role(person_row.institution_id, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  update public.person_invitations set status = 'cancelled' where person_id = target_person_id and status = 'pending';
  raw_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.person_invitations(institution_id, person_id, email, token_hash, expires_at)
  values(person_row.institution_id, person_row.id, person_row.email, encode(extensions.digest(raw_token, 'sha256'), 'hex'), now() + interval '7 days');
  return raw_token;
end;
$$;

create or replace function public.sync_all_academic_year_periods(target_year_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare cycle_row record; total_count integer := 0;
begin
  for cycle_row in select distinct cycle_id from public.academic_year_levels where academic_year_id = target_year_id loop
    total_count := total_count + public.sync_academic_year_periods(target_year_id, cycle_row.cycle_id);
  end loop;
  return total_count;
end;
$$;

create or replace function public.save_person(
  target_institution_id uuid, target_person_id uuid, person_first_name text,
  person_last_name text, person_email text, person_phone text,
  person_status text, assigned_roles public.app_role[]
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare saved_id uuid;
begin
  if not public.has_institution_role(target_institution_id, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if coalesce(array_length(assigned_roles, 1), 0) = 0 then raise exception 'person_role_required'; end if;
  if target_person_id is null then
    insert into public.people(institution_id, first_name, last_name, email, phone, status)
    values(target_institution_id, trim(person_first_name), trim(person_last_name), nullif(lower(trim(person_email)), ''), nullif(trim(person_phone), ''), person_status)
    returning id into saved_id;
  else
    update public.people set first_name=trim(person_first_name), last_name=trim(person_last_name),
      email=nullif(lower(trim(person_email)), ''), phone=nullif(trim(person_phone), ''), status=person_status
    where id=target_person_id and institution_id=target_institution_id returning id into saved_id;
    if saved_id is null then raise exception 'person_not_found'; end if;
  end if;
  delete from public.person_roles where person_id=saved_id;
  insert into public.person_roles(institution_id, person_id, role)
  select target_institution_id, saved_id, role from unnest(assigned_roles) role;
  return saved_id;
end;
$$;

create or replace function public.accept_person_invitation(raw_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invitation public.person_invitations; assigned_role public.app_role; membership_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  select * into invitation from public.person_invitations
  where token_hash = encode(extensions.digest(raw_token, 'sha256'), 'hex') and status = 'pending' and expires_at > now() for update;
  if invitation.id is null then raise exception 'invalid_or_expired_invitation'; end if;
  if lower(coalesce((select auth.jwt() ->> 'email'), '')) <> lower(invitation.email) then raise exception 'invitation_email_mismatch'; end if;
  update public.people set auth_user_id = (select auth.uid()) where id = invitation.person_id and auth_user_id is null;
  select role into assigned_role from public.person_roles where person_id = invitation.person_id
  order by case role::text when 'owner' then 1 when 'admin' then 2 when 'secretary' then 3 when 'finance' then 4 when 'teacher' then 5 when 'parent' then 6 else 7 end limit 1;
  if assigned_role is null then raise exception 'person_role_required'; end if;
  insert into public.memberships(institution_id, user_id, role)
  values(invitation.institution_id, (select auth.uid()), assigned_role)
  on conflict (institution_id, user_id) do update set status = 'active'
  returning id into membership_id;
  update public.person_invitations set status = 'accepted', accepted_at = now() where id = invitation.id;
  return membership_id;
end;
$$;

do $$ declare table_name text; begin
  foreach table_name in array array['people','person_roles','person_invitations','academic_periods'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I_select on public.%I for select to authenticated using (public.is_active_member(institution_id))', table_name, table_name);
    execute format('create policy %I_write on public.%I for all to authenticated using (public.has_institution_role(institution_id, array[''owner'',''admin'']::public.app_role[])) with check (public.has_institution_role(institution_id, array[''owner'',''admin'']::public.app_role[]))', table_name, table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('revoke all on public.%I from anon', table_name);
  end loop;
end $$;

revoke all on function public.sync_academic_year_periods(uuid, uuid) from public;
grant execute on function public.sync_academic_year_periods(uuid, uuid) to authenticated;
revoke all on function public.sync_all_academic_year_periods(uuid) from public;
grant execute on function public.sync_all_academic_year_periods(uuid) to authenticated;
revoke all on function public.create_person_invitation(uuid) from public;
grant execute on function public.create_person_invitation(uuid) to authenticated;
revoke all on function public.save_person(uuid, uuid, text, text, text, text, text, public.app_role[]) from public;
grant execute on function public.save_person(uuid, uuid, text, text, text, text, text, public.app_role[]) to authenticated;
revoke all on function public.accept_person_invitation(text) from public;
grant execute on function public.accept_person_invitation(text) to authenticated;


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607160008_open_year_structure_edits.sql
-- -----------------------------------------------------------------------------

create policy academic_cycles_delete_admin on public.academic_cycles for delete to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
create policy grade_levels_delete_admin on public.grade_levels for delete to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
grant delete on public.academic_cycles, public.grade_levels to authenticated;

create or replace function public.set_academic_year_cycle_levels(
  target_year_id uuid, target_cycle_id uuid, target_level_ids uuid[]
)
returns integer language plpgsql security definer set search_path = '' as $$
declare target_institution_id uuid; target_status public.academic_year_status; inserted_count integer;
begin
  select institution_id, status into target_institution_id, target_status from public.academic_years where id = target_year_id;
  if target_institution_id is null then raise exception 'academic_year_not_found'; end if;
  if not public.has_institution_role(target_institution_id, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if target_status in ('closed', 'archived') then raise exception 'academic_year_configuration_locked'; end if;
  if not exists (select 1 from public.academic_cycles where id = target_cycle_id and institution_id = target_institution_id) then raise exception 'cycle_not_found'; end if;
  delete from public.academic_year_levels where academic_year_id = target_year_id and cycle_id = target_cycle_id;
  insert into public.academic_year_levels(institution_id, academic_year_id, cycle_id, level_id, cycle_name_snapshot, level_name_snapshot)
  select target_institution_id, target_year_id, target_cycle_id, level.id, '', '' from public.grade_levels level
  where level.id = any(coalesce(target_level_ids, array[]::uuid[])) and level.cycle_id = target_cycle_id
    and level.institution_id = target_institution_id and level.is_active;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.ensure_open_year_period_write()
returns trigger language plpgsql set search_path = '' as $$
declare year_id uuid; year_status public.academic_year_status;
begin
  year_id := case when tg_op = 'DELETE' then old.academic_year_id else new.academic_year_id end;
  select status into year_status from public.academic_years where id = year_id;
  if year_status in ('closed','archived') then raise exception 'academic_year_configuration_locked'; end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
drop trigger academic_periods_lock on public.academic_periods;
create trigger academic_periods_lock before insert or update or delete on public.academic_periods
for each row execute function public.ensure_open_year_period_write();

drop trigger annual_subjects_lock on public.annual_subjects;
create trigger annual_subjects_lock before insert or update or delete on public.annual_subjects
for each row execute function public.ensure_open_year_period_write();

create or replace function public.set_annual_level_subjects(target_year_level_id uuid, target_subject_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare annual_level public.academic_year_levels; year_status public.academic_year_status; changed_count integer;
begin
  select * into annual_level from public.academic_year_levels where id=target_year_level_id;
  if annual_level.id is null then raise exception 'annual_level_not_found'; end if;
  select status into year_status from public.academic_years where id=annual_level.academic_year_id;
  if year_status in ('closed','archived') then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(annual_level.institution_id, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  delete from public.annual_subjects where academic_year_level_id=annual_level.id
    and not (subject_id = any(coalesce(target_subject_ids, array[]::uuid[])));
  insert into public.annual_subjects(institution_id, academic_year_id, academic_year_level_id, subject_id, subject_name_snapshot)
  select annual_level.institution_id, annual_level.academic_year_id, annual_level.id, subject.id, ''
  from public.subjects subject where subject.institution_id=annual_level.institution_id and subject.is_active
    and subject.id=any(coalesce(target_subject_ids, array[]::uuid[]))
  on conflict (academic_year_id, academic_year_level_id, subject_id) do nothing;
  get diagnostics changed_count = row_count;
  return changed_count;
end;
$$;
revoke all on function public.set_annual_level_subjects(uuid, uuid[]) from public;
grant execute on function public.set_annual_level_subjects(uuid, uuid[]) to authenticated;

create or replace function public.sync_academic_year_periods(target_year_id uuid, target_cycle_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare target_institution uuid; target_status public.academic_year_status; year_start date; year_end date;
declare system_name text; number_of_periods integer; period_index integer; period_start date; period_end date;
begin
  select institution_id, status, starts_on, ends_on into target_institution, target_status, year_start, year_end from public.academic_years where id = target_year_id;
  select period_system, period_count into system_name, number_of_periods from public.academic_cycles where id = target_cycle_id and institution_id = target_institution;
  if target_institution is null or system_name is null then raise exception 'invalid_year_or_cycle'; end if;
  if target_status in ('closed','archived') then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(target_institution, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  delete from public.academic_periods where academic_year_id = target_year_id and cycle_id = target_cycle_id;
  for period_index in 1..number_of_periods loop
    period_start := year_start + (((year_end - year_start + 1) * (period_index - 1)) / number_of_periods);
    period_end := case when period_index = number_of_periods then year_end else year_start + (((year_end - year_start + 1) * period_index) / number_of_periods) - 1 end;
    insert into public.academic_periods(institution_id, academic_year_id, cycle_id, name, code, sequence, starts_on, ends_on)
    values(target_institution, target_year_id, target_cycle_id,
      case system_name when 'term' then period_index || case when period_index = 1 then 'er trimestre' else 'e trimestre' end
      when 'semester' then period_index || case when period_index = 1 then 'er semestre' else 'e semestre' end else 'Période ' || period_index end,
      'P' || period_index, period_index, period_start, period_end);
  end loop;
  return number_of_periods;
end;
$$;


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607160009_annual_cycles_and_code_uniqueness.sql
-- -----------------------------------------------------------------------------

alter table public.academic_cycles drop constraint if exists academic_cycles_institution_id_name_key;
alter table public.academic_cycles drop constraint if exists academic_cycles_institution_id_code_key;
alter table public.grade_levels drop constraint if exists grade_levels_cycle_id_name_key;
alter table public.grade_levels drop constraint if exists grade_levels_cycle_id_code_key;
alter table public.subjects drop constraint if exists subjects_institution_id_name_key;
alter table public.assessment_types drop constraint if exists assessment_types_academic_year_id_name_key;
alter table public.grading_formulas drop constraint if exists grading_formulas_academic_year_id_name_key;

alter table public.grading_formulas add column code text;
update public.grading_formulas set code = 'F' || row_number from (
  select id, row_number() over (partition by academic_year_id order by created_at, id) from public.grading_formulas
) numbered where grading_formulas.id = numbered.id;
alter table public.grading_formulas alter column code set not null;
alter table public.grading_formulas add constraint grading_formulas_year_code_unique unique (academic_year_id, code);

create table public.academic_year_cycles (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  cycle_id uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 80),
  code text not null check (code ~ '^[A-Z0-9_-]{1,20}$'),
  sort_order smallint not null default 0 check (sort_order >= 0),
  period_system text not null default 'term' check (period_system in ('term','semester','custom')),
  period_count smallint not null default 3 check (period_count between 1 and 6),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint annual_cycles_year_fk foreign key (academic_year_id, institution_id)
    references public.academic_years(id, institution_id) on delete cascade,
  constraint annual_cycles_catalog_fk foreign key (cycle_id, institution_id)
    references public.academic_cycles(id, institution_id) on delete restrict,
  unique (academic_year_id, cycle_id),
  unique (academic_year_id, code),
  unique (id, academic_year_id, cycle_id)
);
create index academic_year_cycles_year_order_idx on public.academic_year_cycles(academic_year_id, sort_order, name);

insert into public.academic_year_cycles(institution_id, academic_year_id, cycle_id, name, code, sort_order, period_system, period_count)
select distinct levels.institution_id, levels.academic_year_id, levels.cycle_id,
  cycle.name, cycle.code, cycle.sort_order, cycle.period_system, cycle.period_count
from public.academic_year_levels levels join public.academic_cycles cycle on cycle.id=levels.cycle_id
on conflict (academic_year_id, cycle_id) do nothing;

alter table public.academic_year_levels add column academic_year_cycle_id uuid;
alter table public.academic_year_levels add column level_code_snapshot text;
update public.academic_year_levels levels set
  academic_year_cycle_id = cycle.id,
  level_code_snapshot = catalog.code
from public.academic_year_cycles cycle, public.grade_levels catalog
where cycle.academic_year_id=levels.academic_year_id and cycle.cycle_id=levels.cycle_id and catalog.id=levels.level_id;
alter table public.academic_year_levels alter column academic_year_cycle_id set not null;
alter table public.academic_year_levels alter column level_code_snapshot set not null;
alter table public.academic_year_levels add constraint annual_levels_annual_cycle_fk
  foreign key (academic_year_cycle_id, academic_year_id, cycle_id)
  references public.academic_year_cycles(id, academic_year_id, cycle_id) on delete cascade;
alter table public.academic_year_levels add constraint annual_levels_year_code_unique
  unique (academic_year_id, level_code_snapshot);

create or replace function public.prepare_academic_year_level()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cycle_row public.academic_cycles; level_row public.grade_levels; annual_cycle_id uuid;
begin
  select * into cycle_row from public.academic_cycles where id=new.cycle_id and institution_id=new.institution_id;
  select * into level_row from public.grade_levels where id=new.level_id and cycle_id=new.cycle_id and institution_id=new.institution_id;
  select id into annual_cycle_id from public.academic_year_cycles where academic_year_id=new.academic_year_id and cycle_id=new.cycle_id;
  if cycle_row.id is null or level_row.id is null or annual_cycle_id is null then raise exception 'invalid_academic_structure'; end if;
  new.academic_year_cycle_id := annual_cycle_id;
  new.cycle_name_snapshot := cycle_row.name;
  new.level_name_snapshot := level_row.name;
  new.level_code_snapshot := level_row.code;
  new.sort_order := level_row.sort_order;
  return new;
end;
$$;

create or replace function public.save_academic_year_cycle(
  target_year_id uuid, target_annual_cycle_id uuid, cycle_name text, cycle_code text,
  cycle_sort_order smallint, cycle_period_system text, cycle_period_count smallint, cycle_is_active boolean
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare institution uuid; year_status public.academic_year_status; catalog_id uuid; saved_id uuid;
begin
  select institution_id, status into institution, year_status from public.academic_years where id=target_year_id;
  if institution is null then raise exception 'academic_year_not_found'; end if;
  if year_status in ('closed','archived') then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(institution, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if target_annual_cycle_id is null then
    insert into public.academic_cycles(institution_id,name,code,sort_order,period_system,period_count,is_active)
    values(institution,trim(cycle_name),upper(trim(cycle_code)),cycle_sort_order,cycle_period_system,cycle_period_count,cycle_is_active)
    returning id into catalog_id;
    insert into public.academic_year_cycles(institution_id,academic_year_id,cycle_id,name,code,sort_order,period_system,period_count,is_active)
    values(institution,target_year_id,catalog_id,trim(cycle_name),upper(trim(cycle_code)),cycle_sort_order,cycle_period_system,cycle_period_count,cycle_is_active)
    returning id into saved_id;
  else
    update public.academic_year_cycles set name=trim(cycle_name),code=upper(trim(cycle_code)),sort_order=cycle_sort_order,
      period_system=cycle_period_system,period_count=cycle_period_count,is_active=cycle_is_active
    where id=target_annual_cycle_id and academic_year_id=target_year_id returning id,cycle_id into saved_id,catalog_id;
    if saved_id is null then raise exception 'annual_cycle_not_found'; end if;
    update public.academic_cycles set name=trim(cycle_name),code=upper(trim(cycle_code)),sort_order=cycle_sort_order,
      period_system=cycle_period_system,period_count=cycle_period_count,is_active=cycle_is_active where id=catalog_id;
  end if;
  return saved_id;
end;
$$;

create or replace function public.set_academic_year_cycle_levels(
  target_year_id uuid, target_cycle_id uuid, target_level_ids uuid[]
)
returns integer language plpgsql security definer set search_path = '' as $$
declare target_institution_id uuid; target_status public.academic_year_status; inserted_count integer;
begin
  select institution_id,status into target_institution_id,target_status from public.academic_years where id=target_year_id;
  if target_institution_id is null then raise exception 'academic_year_not_found'; end if;
  if target_status in ('closed','archived') then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(target_institution_id,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if not exists(select 1 from public.academic_year_cycles where academic_year_id=target_year_id and cycle_id=target_cycle_id)
    then raise exception 'annual_cycle_not_found'; end if;
  delete from public.academic_year_levels where academic_year_id=target_year_id and cycle_id=target_cycle_id;
  insert into public.academic_year_levels(institution_id,academic_year_id,cycle_id,level_id,cycle_name_snapshot,level_name_snapshot)
  select target_institution_id,target_year_id,target_cycle_id,level.id,'','' from public.grade_levels level
  where level.id=any(coalesce(target_level_ids,array[]::uuid[])) and level.cycle_id=target_cycle_id
    and level.institution_id=target_institution_id and level.is_active;
  get diagnostics inserted_count=row_count;
  return inserted_count;
end;
$$;

create or replace function public.clone_academic_year_levels(source_year_id uuid, target_year_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare source_institution uuid; target_institution uuid; target_status public.academic_year_status; inserted_count integer;
begin
  select institution_id into source_institution from public.academic_years where id=source_year_id;
  select institution_id,status into target_institution,target_status from public.academic_years where id=target_year_id;
  if source_institution is null or target_institution is null or source_institution<>target_institution then raise exception 'incompatible_academic_years'; end if;
  if target_status<>'preparation' then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(target_institution,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  insert into public.academic_year_cycles(institution_id,academic_year_id,cycle_id,name,code,sort_order,period_system,period_count,is_active)
  select institution_id,target_year_id,cycle_id,name,code,sort_order,period_system,period_count,is_active
  from public.academic_year_cycles where academic_year_id=source_year_id
  on conflict (academic_year_id,cycle_id) do nothing;
  insert into public.academic_year_levels(institution_id,academic_year_id,cycle_id,level_id,cycle_name_snapshot,level_name_snapshot,level_code_snapshot,academic_year_cycle_id,is_active,cloned_from_id)
  select levels.institution_id,target_year_id,levels.cycle_id,levels.level_id,levels.cycle_name_snapshot,levels.level_name_snapshot,
    levels.level_code_snapshot,target_cycle.id,levels.is_active,levels.id
  from public.academic_year_levels levels join public.academic_year_cycles target_cycle
    on target_cycle.academic_year_id=target_year_id and target_cycle.cycle_id=levels.cycle_id
  where levels.academic_year_id=source_year_id on conflict (academic_year_id,level_id) do nothing;
  get diagnostics inserted_count=row_count;
  return inserted_count;
end;
$$;

alter table public.academic_year_cycles enable row level security;
create policy annual_cycles_select on public.academic_year_cycles for select to authenticated using(public.is_active_member(institution_id));
create policy annual_cycles_write on public.academic_year_cycles for all to authenticated
using(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]))
with check(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]));
grant select,insert,update,delete on public.academic_year_cycles to authenticated;
revoke all on public.academic_year_cycles from anon;
revoke all on function public.save_academic_year_cycle(uuid,uuid,text,text,smallint,text,smallint,boolean) from public;
grant execute on function public.save_academic_year_cycle(uuid,uuid,text,text,smallint,text,smallint,boolean) to authenticated;
create trigger academic_year_cycles_lock before insert or update or delete on public.academic_year_cycles
for each row execute function public.ensure_open_year_period_write();

create or replace function public.sync_all_academic_year_periods(target_year_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare cycle_row record; total_count integer:=0;
begin
  for cycle_row in select cycle_id from public.academic_year_cycles
    where academic_year_id=target_year_id and is_active loop
    total_count:=total_count+public.sync_academic_year_periods(target_year_id,cycle_row.cycle_id);
  end loop;
  return total_count;
end;
$$;

drop trigger assessment_types_lock on public.assessment_types;
create trigger assessment_types_lock before insert or update or delete on public.assessment_types
for each row execute function public.ensure_open_year_period_write();
drop trigger grading_formulas_lock on public.grading_formulas;
create trigger grading_formulas_lock before insert or update or delete on public.grading_formulas
for each row execute function public.ensure_open_year_period_write();

create or replace function public.clone_academic_year_configuration(
  source_year_id uuid,target_year_id uuid,include_structure boolean default true,include_subjects boolean default true,
  include_assessments boolean default true,include_finance boolean default true,include_users boolean default true
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare source_institution uuid;target_institution uuid;target_status public.academic_year_status;
declare structure_count integer:=0;subjects_count integer:=0;assessments_count integer:=0;formulas_count integer:=0;finance_count integer:=0;users_count integer:=0;
begin
  select institution_id into source_institution from public.academic_years where id=source_year_id;
  select institution_id,status into target_institution,target_status from public.academic_years where id=target_year_id;
  if source_institution is null or target_institution is null or source_institution<>target_institution then raise exception 'incompatible_academic_years'; end if;
  if source_year_id=target_year_id then raise exception 'source_and_target_must_differ'; end if;
  if target_status<>'preparation' then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(target_institution,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if include_structure then select public.clone_academic_year_levels(source_year_id,target_year_id) into structure_count; end if;
  if include_subjects then
    insert into public.annual_subjects(institution_id,academic_year_id,academic_year_level_id,subject_id,subject_name_snapshot,coefficient,weekly_hours)
    select s.institution_id,target_year_id,target_level.id,s.subject_id,s.subject_name_snapshot,s.coefficient,s.weekly_hours
    from public.annual_subjects s join public.academic_year_levels source_level on source_level.id=s.academic_year_level_id
    join public.academic_year_levels target_level on target_level.academic_year_id=target_year_id and target_level.level_id=source_level.level_id
    where s.academic_year_id=source_year_id on conflict (academic_year_id,academic_year_level_id,subject_id) do nothing;
    get diagnostics subjects_count=row_count;
  end if;
  if include_assessments then
    insert into public.assessment_types(institution_id,academic_year_id,name,code,weight,is_active)
    select institution_id,target_year_id,name,code,weight,is_active from public.assessment_types where academic_year_id=source_year_id
    on conflict (academic_year_id,code) do nothing; get diagnostics assessments_count=row_count;
    insert into public.grading_formulas(institution_id,academic_year_id,name,code,expression,description,is_default)
    select institution_id,target_year_id,name,code,expression,description,is_default from public.grading_formulas where academic_year_id=source_year_id
    on conflict (academic_year_id,code) do nothing; get diagnostics formulas_count=row_count;
  end if;
  if include_finance then
    insert into public.financial_rules(institution_id,academic_year_id,name,code,amount,due_day,frequency,is_active)
    select institution_id,target_year_id,name,code,amount,due_day,frequency,is_active from public.financial_rules where academic_year_id=source_year_id
    on conflict (academic_year_id,code) do nothing; get diagnostics finance_count=row_count;
  end if;
  if include_users then
    insert into public.academic_year_user_assignments(institution_id,academic_year_id,membership_id,responsibility,is_active)
    select institution_id,target_year_id,membership_id,responsibility,is_active from public.academic_year_user_assignments where academic_year_id=source_year_id
    on conflict (academic_year_id,membership_id) do nothing; get diagnostics users_count=row_count;
  end if;
  return jsonb_build_object('structure',structure_count,'subjects',subjects_count,'assessments',assessments_count,'formulas',formulas_count,'finance',finance_count,'users',users_count);
end;
$$;


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607160010_finish_settings_business_rules.sql
-- -----------------------------------------------------------------------------

alter table public.academic_cycles
  add column subjects_period_scope text not null default 'all' check(subjects_period_scope in ('all','selectable')),
  add column grading_scale numeric(6,2) not null default 20 check(grading_scale>0),
  add column pass_average numeric(6,2) not null default 10 check(pass_average>=0 and pass_average<=grading_scale),
  add column ranking_enabled boolean not null default true,
  add column absences_on_report boolean not null default true;

alter table public.academic_year_cycles
  add column subjects_period_scope text not null default 'all' check(subjects_period_scope in ('all','selectable')),
  add column grading_scale numeric(6,2) not null default 20 check(grading_scale>0),
  add column pass_average numeric(6,2) not null default 10 check(pass_average>=0 and pass_average<=grading_scale),
  add column ranking_enabled boolean not null default true,
  add column absences_on_report boolean not null default true;

alter table public.grade_levels
  add column capacity integer check(capacity is null or capacity>0),
  add column next_level_id uuid references public.grade_levels(id) on delete set null,
  add column repeat_allowed boolean not null default true;

alter table public.annual_subjects
  add column applies_all_periods boolean not null default true,
  add column period_ids uuid[] not null default '{}';

alter table public.financial_rules
  add column fee_type text not null default 'other' check(fee_type in ('enrollment','reenrollment','tuition','other')),
  add column is_mandatory boolean not null default true,
  add column discount_allowed boolean not null default false,
  add column amount_editable boolean not null default false,
  add column installment_count smallint not null default 1 check(installment_count between 1 and 12);

drop function public.save_academic_year_cycle(uuid,uuid,text,text,smallint,text,smallint,boolean);
create function public.save_academic_year_cycle(
  target_year_id uuid,target_annual_cycle_id uuid,cycle_name text,cycle_code text,
  cycle_sort_order smallint,cycle_period_system text,cycle_period_count smallint,cycle_is_active boolean,
  cycle_subjects_period_scope text,cycle_grading_scale numeric,cycle_pass_average numeric,
  cycle_ranking_enabled boolean,cycle_absences_on_report boolean
)
returns uuid language plpgsql security definer set search_path='' as $$
declare institution uuid;year_status public.academic_year_status;catalog_id uuid;saved_id uuid;
begin
  select institution_id,status into institution,year_status from public.academic_years where id=target_year_id;
  if institution is null then raise exception 'academic_year_not_found'; end if;
  if year_status in ('closed','archived') then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(institution,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if target_annual_cycle_id is null then
    insert into public.academic_cycles(institution_id,name,code,sort_order,period_system,period_count,is_active,subjects_period_scope,grading_scale,pass_average,ranking_enabled,absences_on_report)
    values(institution,trim(cycle_name),upper(trim(cycle_code)),cycle_sort_order,cycle_period_system,cycle_period_count,cycle_is_active,cycle_subjects_period_scope,cycle_grading_scale,cycle_pass_average,cycle_ranking_enabled,cycle_absences_on_report)
    returning id into catalog_id;
    insert into public.academic_year_cycles(institution_id,academic_year_id,cycle_id,name,code,sort_order,period_system,period_count,is_active,subjects_period_scope,grading_scale,pass_average,ranking_enabled,absences_on_report)
    values(institution,target_year_id,catalog_id,trim(cycle_name),upper(trim(cycle_code)),cycle_sort_order,cycle_period_system,cycle_period_count,cycle_is_active,cycle_subjects_period_scope,cycle_grading_scale,cycle_pass_average,cycle_ranking_enabled,cycle_absences_on_report)
    returning id into saved_id;
  else
    update public.academic_year_cycles set name=trim(cycle_name),code=upper(trim(cycle_code)),sort_order=cycle_sort_order,period_system=cycle_period_system,
      period_count=cycle_period_count,is_active=cycle_is_active,subjects_period_scope=cycle_subjects_period_scope,grading_scale=cycle_grading_scale,
      pass_average=cycle_pass_average,ranking_enabled=cycle_ranking_enabled,absences_on_report=cycle_absences_on_report
    where id=target_annual_cycle_id and academic_year_id=target_year_id returning id,cycle_id into saved_id,catalog_id;
    if saved_id is null then raise exception 'annual_cycle_not_found'; end if;
    update public.academic_cycles set name=trim(cycle_name),code=upper(trim(cycle_code)),sort_order=cycle_sort_order,period_system=cycle_period_system,
      period_count=cycle_period_count,is_active=cycle_is_active,subjects_period_scope=cycle_subjects_period_scope,grading_scale=cycle_grading_scale,
      pass_average=cycle_pass_average,ranking_enabled=cycle_ranking_enabled,absences_on_report=cycle_absences_on_report where id=catalog_id;
  end if;
  return saved_id;
end; $$;
revoke all on function public.save_academic_year_cycle(uuid,uuid,text,text,smallint,text,smallint,boolean,text,numeric,numeric,boolean,boolean) from public;
grant execute on function public.save_academic_year_cycle(uuid,uuid,text,text,smallint,text,smallint,boolean,text,numeric,numeric,boolean,boolean) to authenticated;

create table public.financial_rule_levels(
  financial_rule_id uuid not null references public.financial_rules(id) on delete cascade,
  academic_year_level_id uuid not null references public.academic_year_levels(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  primary key(financial_rule_id,academic_year_level_id),
  constraint financial_rule_levels_year_fk foreign key(academic_year_id,institution_id)
    references public.academic_years(id,institution_id) on delete cascade
);
alter table public.financial_rule_levels enable row level security;
create policy financial_rule_levels_select on public.financial_rule_levels for select to authenticated
  using(public.is_active_member(institution_id));
create policy financial_rule_levels_write on public.financial_rule_levels for all to authenticated
  using(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]))
  with check(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]));
create trigger financial_rule_levels_lock before insert or update or delete on public.financial_rule_levels
  for each row execute function public.ensure_open_year_period_write();
grant select,insert,update,delete on public.financial_rule_levels to authenticated;
revoke all on public.financial_rule_levels from anon;

create or replace function public.set_financial_rule_levels(target_rule_id uuid,target_level_ids uuid[])
returns integer language plpgsql security definer set search_path='' as $$
declare rule public.financial_rules; changed integer;
begin
  select * into rule from public.financial_rules where id=target_rule_id;
  if rule.id is null then raise exception 'financial_rule_not_found'; end if;
  if not public.has_institution_role(rule.institution_id,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if (select status from public.academic_years where id=rule.academic_year_id) in ('closed','archived') then raise exception 'academic_year_configuration_locked'; end if;
  delete from public.financial_rule_levels where financial_rule_id=rule.id;
  insert into public.financial_rule_levels(financial_rule_id,academic_year_level_id,institution_id,academic_year_id)
  select rule.id,level.id,rule.institution_id,rule.academic_year_id from public.academic_year_levels level
  where level.id=any(coalesce(target_level_ids,'{}'::uuid[])) and level.academic_year_id=rule.academic_year_id;
  get diagnostics changed=row_count;
  return changed;
end; $$;
revoke all on function public.set_financial_rule_levels(uuid,uuid[]) from public;
grant execute on function public.set_financial_rule_levels(uuid,uuid[]) to authenticated;

create or replace function public.validate_annual_subject_periods()
returns trigger language plpgsql set search_path='' as $$
declare cycle_scope text; valid_count integer;
begin
  select cycle.subjects_period_scope into cycle_scope
  from public.academic_year_levels level join public.academic_year_cycles cycle
    on cycle.id=level.academic_year_cycle_id where level.id=new.academic_year_level_id;
  if cycle_scope='all' then new.applies_all_periods:=true; new.period_ids:='{}'; end if;
  if not new.applies_all_periods then
    select count(*) into valid_count from public.academic_periods period
    where period.id=any(new.period_ids) and period.academic_year_id=new.academic_year_id;
    if cardinality(new.period_ids)=0 or valid_count<>cardinality(new.period_ids) then raise exception 'invalid_subject_periods'; end if;
  else new.period_ids:='{}'; end if;
  return new;
end; $$;
create trigger annual_subjects_validate_periods before insert or update on public.annual_subjects
  for each row execute function public.validate_annual_subject_periods();

create or replace function public.clone_academic_year_levels(source_year_id uuid,target_year_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare source_institution uuid;target_institution uuid;target_status public.academic_year_status;inserted_count integer;
begin
  select institution_id into source_institution from public.academic_years where id=source_year_id;
  select institution_id,status into target_institution,target_status from public.academic_years where id=target_year_id;
  if source_institution is null or target_institution is null or source_institution<>target_institution then raise exception 'incompatible_academic_years'; end if;
  if target_status<>'preparation' then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(target_institution,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  insert into public.academic_year_cycles(institution_id,academic_year_id,cycle_id,name,code,sort_order,period_system,period_count,is_active,subjects_period_scope,grading_scale,pass_average,ranking_enabled,absences_on_report)
  select institution_id,target_year_id,cycle_id,name,code,sort_order,period_system,period_count,is_active,subjects_period_scope,grading_scale,pass_average,ranking_enabled,absences_on_report
  from public.academic_year_cycles where academic_year_id=source_year_id on conflict(academic_year_id,cycle_id) do nothing;
  insert into public.academic_year_levels(institution_id,academic_year_id,cycle_id,level_id,cycle_name_snapshot,level_name_snapshot,level_code_snapshot,academic_year_cycle_id,is_active,cloned_from_id)
  select levels.institution_id,target_year_id,levels.cycle_id,levels.level_id,levels.cycle_name_snapshot,levels.level_name_snapshot,levels.level_code_snapshot,target_cycle.id,levels.is_active,levels.id
  from public.academic_year_levels levels join public.academic_year_cycles target_cycle on target_cycle.academic_year_id=target_year_id and target_cycle.cycle_id=levels.cycle_id
  where levels.academic_year_id=source_year_id on conflict(academic_year_id,level_id) do nothing;
  get diagnostics inserted_count=row_count; return inserted_count;
end; $$;

create or replace function public.enforce_academic_year_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status='archived' and new.status<>old.status then raise exception 'archived_year_is_immutable'; end if;
  if old.status='closed' and new.status not in ('closed','archived') then raise exception 'closed_year_cannot_reopen'; end if;
  if new.status='open' and not exists(select 1 from public.academic_year_levels where academic_year_id=new.id and is_active)
    then raise exception 'academic_structure_required'; end if;
  return new;
end; $$;


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607170011_cycle_catalog.sql
-- -----------------------------------------------------------------------------

create table public.cycle_catalog(
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  code text not null unique check(code ~ '^[A-Z0-9_-]{2,20}$'),
  description text,
  icon text not null default 'pi-book',
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.cycle_catalog(name,code,description,icon,sort_order) values
('Préscolaire','PRESCOLAIRE','Premières années et préparation au primaire','pi-sparkles',10),
('Primaire','PRIMAIRE','Enseignement primaire','pi-pencil',20),
('Collège','COLLEGE','Premier cycle du secondaire','pi-book',30),
('Lycée','LYCEE','Second cycle du secondaire','pi-graduation-cap',40);

create table public.institution_cycles(
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  catalog_cycle_id uuid not null references public.cycle_catalog(id) on delete restrict,
  academic_cycle_id uuid references public.academic_cycles(id) on delete restrict,
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(institution_id,catalog_cycle_id),
  unique(institution_id,academic_cycle_id)
);

insert into public.institution_cycles(institution_id,catalog_cycle_id,academic_cycle_id,sort_order,is_active)
select cycle.institution_id,catalog.id,cycle.id,cycle.sort_order,cycle.is_active
from public.academic_cycles cycle join public.cycle_catalog catalog on catalog.code=cycle.code
on conflict(institution_id,catalog_cycle_id) do nothing;

alter table public.cycle_catalog enable row level security;
alter table public.institution_cycles enable row level security;
create policy cycle_catalog_read on public.cycle_catalog for select to authenticated using(is_active);
create policy institution_cycles_read on public.institution_cycles for select to authenticated using(public.is_active_member(institution_id));
create policy institution_cycles_write on public.institution_cycles for all to authenticated
using(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]))
with check(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]));
grant select on public.cycle_catalog to authenticated;
grant select,insert,update on public.institution_cycles to authenticated;
revoke all on public.cycle_catalog,public.institution_cycles from anon;

create or replace function public.set_institution_cycle(target_institution_id uuid,target_catalog_cycle_id uuid,target_active boolean,target_year_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare catalog public.cycle_catalog;catalog_cycle uuid;activation_id uuid;annual_id uuid;
begin
  if not public.has_institution_role(target_institution_id,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  select * into catalog from public.cycle_catalog where id=target_catalog_cycle_id and is_active;
  if catalog.id is null then raise exception 'catalog_cycle_not_found'; end if;
  select academic_cycle_id into catalog_cycle from public.institution_cycles where institution_id=target_institution_id and catalog_cycle_id=catalog.id;
  if catalog_cycle is null and target_active then
    insert into public.academic_cycles(institution_id,name,code,sort_order,is_active)
    values(target_institution_id,catalog.name,catalog.code,catalog.sort_order,true) returning id into catalog_cycle;
  end if;
  insert into public.institution_cycles(institution_id,catalog_cycle_id,academic_cycle_id,sort_order,is_active)
  values(target_institution_id,catalog.id,catalog_cycle,catalog.sort_order,target_active)
  on conflict(institution_id,catalog_cycle_id) do update set is_active=excluded.is_active
  returning id into activation_id;
  if catalog_cycle is not null then update public.academic_cycles set is_active=target_active where id=catalog_cycle; end if;
  if target_active and target_year_id is not null and not exists(select 1 from public.academic_year_cycles where academic_year_id=target_year_id and cycle_id=catalog_cycle) then
    insert into public.academic_year_cycles(institution_id,academic_year_id,cycle_id,name,code,sort_order)
    values(target_institution_id,target_year_id,catalog_cycle,catalog.name,catalog.code,catalog.sort_order) returning id into annual_id;
  end if;
  return activation_id;
end; $$;
revoke all on function public.set_institution_cycle(uuid,uuid,boolean,uuid) from public;
grant execute on function public.set_institution_cycle(uuid,uuid,boolean,uuid) to authenticated;
