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
