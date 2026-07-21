-- Final Personnel workflow actions and payroll calculation fix.
-- Security roles/RLS are intentionally unchanged pending the dedicated security design.

create or replace function public.transition_employee_status(
  target_employee_id uuid,
  target_status public.employee_status,
  effective_on date default current_date,
  motive text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare employee_row public.employees%rowtype;
begin
  select * into employee_row from public.employees where id = target_employee_id for update;
  if not found then raise exception 'employee_not_found'; end if;
  if not public.has_institution_role(employee_row.institution_id,array['owner','admin']::public.app_role[]) then raise exception 'forbidden'; end if;
  if employee_row.status = target_status then raise exception 'employee_status_unchanged'; end if;
  if not (
    (employee_row.status = 'active' and target_status in ('suspended','exited')) or
    (employee_row.status = 'suspended' and target_status in ('active','exited'))
  ) then raise exception 'invalid_employee_status_transition'; end if;
  if target_status = 'exited' and (motive is null or char_length(btrim(motive)) < 3) then raise exception 'exit_reason_required'; end if;
  if effective_on < employee_row.hired_on then raise exception 'invalid_effective_date'; end if;

  update public.employees
  set status = target_status,
      exited_on = case when target_status = 'exited' then effective_on else null end,
      exit_reason = case when target_status = 'exited' then btrim(motive) else null end
  where id = employee_row.id;

  if target_status = 'exited' then
    update public.employee_functions set is_active = false, ends_on = coalesce(ends_on,effective_on)
      where employee_id = employee_row.id and is_active;
    update public.employee_contracts set status = 'ended', ends_on = coalesce(ends_on,effective_on)
      where employee_id = employee_row.id and status in ('draft','active');
  end if;

  insert into public.personnel_audit_events(institution_id,employee_id,entity_type,entity_id,action,reason,metadata)
  values(employee_row.institution_id,employee_row.id,'employee',employee_row.id,'status_changed',motive,
    jsonb_build_object('from',employee_row.status,'to',target_status,'effective_on',effective_on));
end $$;

create or replace function public.transition_employee_sanction(
  target_sanction_id uuid,
  target_status text,
  decision_text text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare sanction_row public.employee_sanctions%rowtype;
begin
  select * into sanction_row from public.employee_sanctions where id = target_sanction_id for update;
  if not found then raise exception 'sanction_not_found'; end if;
  if not public.has_institution_role(sanction_row.institution_id,array['owner','admin']::public.app_role[]) then raise exception 'forbidden'; end if;
  if not (
    (sanction_row.status = 'draft' and target_status in ('notified','cancelled')) or
    (sanction_row.status = 'notified' and target_status in ('contested','closed','cancelled')) or
    (sanction_row.status = 'contested' and target_status in ('closed','cancelled'))
  ) then raise exception 'invalid_sanction_transition'; end if;
  if target_status in ('notified','closed','cancelled') and (decision_text is null or char_length(btrim(decision_text)) < 3) then
    raise exception 'sanction_decision_required';
  end if;

  update public.employee_sanctions
  set status = target_status,
      decision = coalesce(nullif(btrim(decision_text),''),decision),
      decided_on = case when target_status in ('closed','cancelled') then current_date else decided_on end
  where id = sanction_row.id;

  insert into public.personnel_audit_events(institution_id,employee_id,entity_type,entity_id,action,reason,metadata)
  values(sanction_row.institution_id,sanction_row.employee_id,'employee_sanction',sanction_row.id,'status_changed',decision_text,
    jsonb_build_object('from',sanction_row.status,'to',target_status));
end $$;

create or replace function public.calculate_payroll_period(target_period_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  period_row public.payroll_periods%rowtype;
  contract_row public.employee_contracts%rowtype;
  new_entry uuid;
  count_entries integer := 0;
  variable_total numeric(14,2);
begin
  select * into period_row from public.payroll_periods where id = target_period_id for update;
  if not found then raise exception 'payroll_period_not_found'; end if;
  if not public.has_institution_role(period_row.institution_id,array['owner','admin','finance']::public.app_role[]) then raise exception 'forbidden'; end if;
  if period_row.status not in ('draft','calculated') then raise exception 'payroll_period_not_editable'; end if;

  update public.work_entries set payroll_entry_id = null
    where payroll_entry_id in (select id from public.payroll_entries where period_id = period_row.id);
  delete from public.payroll_entries where period_id = period_row.id;

  for contract_row in
    select contract.*
    from public.employee_contracts contract
    join public.employees employee on employee.id = contract.employee_id
    where contract.institution_id = period_row.institution_id
      and contract.status = 'active' and employee.status = 'active'
      and contract.starts_on <= period_row.ends_on
      and (contract.ends_on is null or contract.ends_on >= period_row.starts_on)
  loop
    select coalesce(sum(
      case when contract_row.compensation_mode = 'session'
        then work.quantity * coalesce(work.rate,contract_row.session_rate)
        else (work.minutes::numeric / 60) * coalesce(work.rate,contract_row.hourly_rate,0)
      end),0)
    into variable_total
    from public.work_entries work
    where work.contract_id = contract_row.id and work.status = 'validated'
      and work.work_date between period_row.starts_on and period_row.ends_on
      and work.payroll_entry_id is null;

    insert into public.payroll_entries(institution_id,period_id,employee_id,contract_id,fixed_amount,variable_amount,status)
    values(period_row.institution_id,period_row.id,contract_row.employee_id,contract_row.id,
      case when contract_row.compensation_mode in ('fixed','mixed','flat_rate') then contract_row.fixed_amount else 0 end,
      variable_total,'calculated') returning id into new_entry;
    update public.work_entries set payroll_entry_id = new_entry
      where contract_id = contract_row.id and status = 'validated'
        and work_date between period_row.starts_on and period_row.ends_on and payroll_entry_id is null;
    count_entries := count_entries + 1;
  end loop;
  update public.payroll_periods set status = 'calculated' where id = period_row.id;
  return count_entries;
end $$;

revoke all on function public.transition_employee_status(uuid,public.employee_status,date,text), public.transition_employee_sanction(uuid,text,text), public.calculate_payroll_period(uuid) from public;
grant execute on function public.transition_employee_status(uuid,public.employee_status,date,text), public.transition_employee_sanction(uuid,text,text), public.calculate_payroll_period(uuid) to authenticated;
