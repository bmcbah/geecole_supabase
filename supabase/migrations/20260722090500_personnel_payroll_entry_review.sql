-- Per-person payroll review. Profiles and RLS remain unchanged in this lot.
create or replace function public.transition_payroll_entries(
  target_entry_ids uuid[],
  new_status public.payroll_status
) returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  changed integer;
begin
  if coalesce(array_length(target_entry_ids, 1), 0) = 0 then
    raise exception 'payroll_entries_required';
  end if;
  if new_status not in ('calculated', 'validated') then
    raise exception 'invalid_payroll_entry_status';
  end if;

  if exists (
    select 1
    from public.payroll_entries entry
    join public.payroll_periods period on period.id = entry.period_id
    where entry.id = any(target_entry_ids)
      and (
        period.status <> 'calculated'
        or entry.status not in ('calculated', 'validated')
        or entry.paid_amount > 0
      )
  ) then
    raise exception 'payroll_entry_not_reviewable';
  end if;

  update public.payroll_entries
  set status = new_status
  where id = any(target_entry_ids)
    and status in ('calculated', 'validated');
  get diagnostics changed = row_count;

  if changed <> array_length(target_entry_ids, 1) then
    raise exception 'payroll_entry_not_found_or_forbidden';
  end if;
  return changed;
end;
$$;

revoke all on function public.transition_payroll_entries(uuid[], public.payroll_status) from public;
grant execute on function public.transition_payroll_entries(uuid[], public.payroll_status) to authenticated;

create or replace function public.transition_payroll_period(
  target_period_id uuid,
  new_status public.payroll_status
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare p public.payroll_periods%rowtype;
begin
  select * into p from public.payroll_periods where id = target_period_id for update;
  if p.id is null then raise exception 'payroll_period_not_found'; end if;
  if not ((p.status = 'calculated' and new_status = 'validated') or (p.status in ('validated','paid') and new_status = 'closed')) then
    raise exception 'invalid_payroll_transition';
  end if;
  if new_status = 'validated' and exists (
    select 1 from public.payroll_entries where period_id = p.id and status <> 'validated'
  ) then
    raise exception 'payroll_entries_not_all_validated';
  end if;
  update public.payroll_periods
  set status = new_status,
      validated_by = case when new_status = 'validated' then auth.uid() else validated_by end,
      validated_at = case when new_status = 'validated' then now() else validated_at end,
      closed_by = case when new_status = 'closed' then auth.uid() else closed_by end,
      closed_at = case when new_status = 'closed' then now() else closed_at end
  where id = p.id;
  update public.payroll_entries set status = new_status where period_id = p.id;
end;
$$;
