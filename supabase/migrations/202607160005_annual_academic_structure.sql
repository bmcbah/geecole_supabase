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
