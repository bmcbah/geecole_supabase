create or replace function public.save_cycle_responsibility(
  target_id uuid,
  target_institution_id uuid,
  target_year_id uuid,
  target_cycle_id uuid,
  target_type_id uuid,
  target_person_id uuid,
  target_capacity text,
  target_starts_on date,
  target_ends_on date,
  target_replaced_person_id uuid
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare saved_id uuid;
begin
  if not public.has_institution_role(target_institution_id, array['owner','admin']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  if target_capacity not in ('holder', 'acting', 'deputy') then
    raise exception 'invalid_responsibility_capacity';
  end if;
  if target_ends_on is not null and target_ends_on < target_starts_on then
    raise exception 'invalid_responsibility_dates';
  end if;
  if target_capacity = 'acting' and target_replaced_person_id is null then
    raise exception 'replaced_person_required';
  end if;
  if target_capacity <> 'acting' and target_replaced_person_id is not null then
    raise exception 'replaced_person_not_allowed';
  end if;

  if target_capacity = 'holder' then
    update public.cycle_responsibilities
       set status = 'closed',
           ends_on = greatest(starts_on, target_starts_on - 1)
     where institution_id = target_institution_id
       and academic_year_id = target_year_id
       and cycle_id = target_cycle_id
       and responsibility_type_id = target_type_id
       and capacity = 'holder'
       and status = 'active'
       and id is distinct from target_id;
  end if;

  if target_id is null then
    insert into public.cycle_responsibilities(
      institution_id, academic_year_id, cycle_id, responsibility_type_id,
      person_id, capacity, starts_on, ends_on, replaced_person_id, status
    ) values (
      target_institution_id, target_year_id, target_cycle_id, target_type_id,
      target_person_id, target_capacity, target_starts_on, target_ends_on,
      case when target_capacity = 'acting' then target_replaced_person_id end,
      'active'
    ) returning id into saved_id;
  else
    update public.cycle_responsibilities
       set cycle_id = target_cycle_id,
           responsibility_type_id = target_type_id,
           person_id = target_person_id,
           capacity = target_capacity,
           starts_on = target_starts_on,
           ends_on = target_ends_on,
           replaced_person_id = case when target_capacity = 'acting' then target_replaced_person_id end,
           status = 'active'
     where id = target_id
       and institution_id = target_institution_id
       and academic_year_id = target_year_id
    returning id into saved_id;
  end if;

  if saved_id is null then raise exception 'cycle_responsibility_not_found'; end if;
  return saved_id;
end;
$$;

grant execute on function public.save_cycle_responsibility(uuid,uuid,uuid,uuid,uuid,uuid,text,date,date,uuid) to authenticated;
