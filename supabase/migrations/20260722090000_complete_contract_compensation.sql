-- Preserve legacy incomplete contracts while enforcing complete new writes.
alter table public.employee_contracts
  add constraint employee_contracts_complete_compensation_check
  check (
    (compensation_mode = 'unpaid' and fixed_amount = 0 and hourly_rate = 0 and session_rate = 0)
    or (compensation_mode in ('fixed', 'flat_rate') and fixed_amount > 0)
    or (compensation_mode = 'session' and session_rate > 0)
    or (compensation_mode = 'hourly' and hourly_rate > 0 and weekly_hours > 0)
    or (compensation_mode = 'mixed' and fixed_amount > 0 and hourly_rate > 0 and weekly_hours > 0)
  ) not valid;

comment on constraint employee_contracts_complete_compensation_check on public.employee_contracts is
  'Requires the complete remuneration basis for each compensation mode.';
