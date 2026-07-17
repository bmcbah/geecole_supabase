create or replace function public.enforce_academic_year_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'preparation' and new.status = 'open') or
    (old.status = 'open' and new.status = 'closed') or
    (old.status = 'closed' and new.status = 'archived')
  ) then
    raise exception 'invalid_academic_year_transition';
  end if;

  if new.status = 'open' and not exists (
    select 1
    from public.academic_year_levels
    where academic_year_id = new.id and is_active
  ) then
    raise exception 'academic_structure_required';
  end if;

  return new;
end;
$$;

create or replace function public.set_institution_cycle(
  target_institution_id uuid,
  target_catalog_cycle_id uuid,
  target_active boolean,
  target_year_id uuid
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  catalog public.cycle_catalog%rowtype;
  selected_year public.academic_years%rowtype;
  catalog_cycle uuid;
  activation_id uuid;
  annual_cycle_id uuid;
begin
  if not public.has_institution_role(
    target_institution_id,
    array['owner','admin']::public.app_role[]
  ) then
    raise exception 'permission_denied';
  end if;

  if target_year_id is null then
    raise exception 'academic_year_required';
  end if;

  select * into selected_year
  from public.academic_years
  where id = target_year_id
    and institution_id = target_institution_id;

  if selected_year.id is null then
    raise exception 'academic_year_not_found';
  end if;

  if selected_year.status in ('closed', 'archived') then
    raise exception 'academic_year_configuration_locked';
  end if;

  select * into catalog
  from public.cycle_catalog
  where id = target_catalog_cycle_id
    and is_active;

  if catalog.id is null then
    raise exception 'catalog_cycle_not_found';
  end if;

  select academic_cycle_id, id
  into catalog_cycle, activation_id
  from public.institution_cycles
  where institution_id = target_institution_id
    and catalog_cycle_id = catalog.id;

  if catalog_cycle is null then
    insert into public.academic_cycles(
      institution_id,
      name,
      code,
      sort_order,
      is_active
    ) values (
      target_institution_id,
      catalog.name,
      catalog.code,
      catalog.sort_order,
      true
    )
    returning id into catalog_cycle;
  end if;

  insert into public.institution_cycles(
    institution_id,
    catalog_cycle_id,
    academic_cycle_id,
    sort_order,
    is_active
  ) values (
    target_institution_id,
    catalog.id,
    catalog_cycle,
    catalog.sort_order,
    true
  )
  on conflict(institution_id, catalog_cycle_id) do update
    set academic_cycle_id = excluded.academic_cycle_id,
        sort_order = excluded.sort_order,
        is_active = true
  returning id into activation_id;

  select id into annual_cycle_id
  from public.academic_year_cycles
  where academic_year_id = target_year_id
    and cycle_id = catalog_cycle;

  if target_active then
    if annual_cycle_id is null then
      insert into public.academic_year_cycles(
        institution_id,
        academic_year_id,
        cycle_id,
        name,
        code,
        sort_order
      ) values (
        target_institution_id,
        target_year_id,
        catalog_cycle,
        catalog.name,
        catalog.code,
        catalog.sort_order
      );
    end if;
  elsif annual_cycle_id is not null then
    if exists (
      select 1
      from public.academic_year_levels
      where academic_year_cycle_id = annual_cycle_id
    ) then
      raise exception 'annual_cycle_not_empty';
    end if;

    delete from public.academic_year_cycles
    where id = annual_cycle_id;
  end if;

  return activation_id;
end;
$$;

revoke all on function public.set_institution_cycle(uuid,uuid,boolean,uuid) from public;
grant execute on function public.set_institution_cycle(uuid,uuid,boolean,uuid) to authenticated;
