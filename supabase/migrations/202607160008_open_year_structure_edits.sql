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
