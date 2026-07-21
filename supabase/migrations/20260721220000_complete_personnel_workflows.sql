-- Complete the validated Personnel workflows without changing roles or RLS.
create table public.personnel_settings (
  institution_id uuid primary key references public.institutions(id) on delete cascade,
  employee_number_prefix text not null default 'PER',
  employee_number_year boolean not null default true,
  employee_number_digits smallint not null default 4 check (employee_number_digits between 3 and 8),
  employee_number_editable boolean not null default false,
  currency text not null default 'GNF' check (currency = 'GNF'),
  rounding_step integer not null default 1 check (rounding_step in (1, 5, 10, 100, 500, 1000)),
  contract_alert_days integer not null default 30 check (contract_alert_days between 0 and 365),
  document_alert_days integer not null default 30 check (document_alert_days between 0 and 365),
  default_payment_method text not null default 'cash',
  updated_at timestamptz not null default now()
);

alter table public.employee_contracts
  add column if not exists parent_contract_id uuid references public.employee_contracts(id),
  add column if not exists change_kind text not null default 'initial'
    check (change_kind in ('initial','renewal','amendment')),
  add column if not exists termination_reason text;

alter table public.leave_requests
  add column if not exists duration_unit text not null default 'day'
    check (duration_unit in ('day','half_day','hour')),
  add column if not exists duration_hours numeric(6,2) check (duration_hours is null or duration_hours > 0),
  add column if not exists impacts_payroll boolean not null default false,
  add column if not exists submitted_at timestamptz,
  add column if not exists decided_at timestamptz;

alter table public.salary_advances
  add column if not exists paid_on date,
  add column if not exists installment_amount numeric(14,2) check (installment_amount is null or installment_amount > 0),
  add column if not exists first_repayment_on date,
  add column if not exists decision_comment text,
  add column if not exists decided_by uuid,
  add column if not exists decided_at timestamptz;

alter table public.payroll_adjustments
  add column if not exists regularization_effect text
    check (regularization_effect in ('gain','deduction')),
  add column if not exists source_period_id uuid references public.payroll_periods(id);

alter table public.payroll_payments
  add column if not exists batch_reference text;

create table public.personnel_audit_events (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  actor_id uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.salary_advance_installments (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  advance_id uuid not null references public.salary_advances(id) on delete restrict,
  due_on date not null,
  amount numeric(14,2) not null check (amount > 0),
  repaid_amount numeric(14,2) not null default 0 check (repaid_amount >= 0 and repaid_amount <= amount),
  status text not null default 'planned' check (status in ('planned','partial','paid','suspended','cancelled')),
  payroll_entry_id uuid references public.payroll_entries(id),
  unique (advance_id, due_on)
);

create index personnel_audit_employee_idx on public.personnel_audit_events(institution_id, employee_id, created_at desc);
create index advance_installments_due_idx on public.salary_advance_installments(institution_id, due_on, status);

alter table public.personnel_settings enable row level security;
alter table public.personnel_audit_events enable row level security;
alter table public.salary_advance_installments enable row level security;

create policy personnel_settings_select on public.personnel_settings for select to authenticated
using (public.is_active_member(institution_id));
create policy personnel_settings_manage on public.personnel_settings for all to authenticated
using (public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]));
create policy personnel_audit_select on public.personnel_audit_events for select to authenticated
using (public.is_active_member(institution_id));
create policy personnel_audit_insert on public.personnel_audit_events for insert to authenticated
with check (public.has_institution_role(institution_id,array['owner','admin','secretary','finance']::public.app_role[]));
create policy advance_installments_select on public.salary_advance_installments for select to authenticated
using (public.is_active_member(institution_id));
create policy advance_installments_manage on public.salary_advance_installments for all to authenticated
using (public.has_institution_role(institution_id,array['owner','admin','finance']::public.app_role[]))
with check (public.has_institution_role(institution_id,array['owner','admin','finance']::public.app_role[]));

grant select,insert,update on public.personnel_settings, public.personnel_audit_events, public.salary_advance_installments to authenticated;

insert into public.personnel_settings(institution_id)
select id from public.institutions on conflict do nothing;

create or replace function public.assign_employee_number()
returns trigger language plpgsql set search_path='' as $$
declare s public.personnel_settings%rowtype; next_number integer; year_part text;
begin
  select * into s from public.personnel_settings where institution_id=new.institution_id;
  if not found then s.employee_number_prefix := 'PER'; s.employee_number_year := true; s.employee_number_digits := 4; end if;
  if new.employee_number is null or btrim(new.employee_number)='' then
    perform pg_advisory_xact_lock(hashtext(new.institution_id::text || ':employee-number'));
    select coalesce(max(nullif(substring(employee_number from '([0-9]+)$'),'')::integer),0)+1 into next_number
    from public.employees where institution_id=new.institution_id;
    year_part := case when s.employee_number_year then '-' || extract(year from current_date)::integer::text else '' end;
    new.employee_number := upper(s.employee_number_prefix) || year_part || '-' || lpad(next_number::text,s.employee_number_digits,'0');
  elsif tg_op='UPDATE' and new.employee_number is distinct from old.employee_number and not coalesce(s.employee_number_editable,false) then
    raise exception 'employee_number_not_editable';
  end if;
  return new;
end $$;

create or replace function public.exit_employee(target_employee_id uuid, exit_date date, exit_motive text)
returns void language plpgsql security definer set search_path='' as $$
declare e public.employees%rowtype;
begin
  select * into e from public.employees where id=target_employee_id for update;
  if not found then raise exception 'employee_not_found'; end if;
  if not public.has_institution_role(e.institution_id,array['owner','admin']::public.app_role[]) then raise exception 'forbidden'; end if;
  if exit_date < e.hired_on then raise exception 'invalid_exit_date'; end if;
  update public.employees set status='exited',exited_on=exit_date,exit_reason=exit_motive where id=e.id;
  update public.employee_functions set is_active=false,ends_on=coalesce(ends_on,exit_date) where employee_id=e.id and is_active;
  update public.employee_contracts set status='ended',ends_on=coalesce(ends_on,exit_date) where employee_id=e.id and status in ('draft','active');
  insert into public.personnel_audit_events(institution_id,employee_id,entity_type,entity_id,action,reason)
  values(e.institution_id,e.id,'employee',e.id,'exit',exit_motive);
end $$;

create or replace function public.transition_contract(target_contract_id uuid, target_status public.contract_status, motive text default null)
returns void language plpgsql security definer set search_path='' as $$
declare c public.employee_contracts%rowtype;
begin
  select * into c from public.employee_contracts where id=target_contract_id for update;
  if not found then raise exception 'contract_not_found'; end if;
  if not public.has_institution_role(c.institution_id,array['owner','admin']::public.app_role[]) then raise exception 'forbidden'; end if;
  if not ((c.status='draft' and target_status='active') or (c.status='active' and target_status in ('ended','terminated'))) then raise exception 'invalid_contract_transition'; end if;
  update public.employee_contracts set status=target_status,termination_reason=case when target_status='terminated' then motive else termination_reason end where id=c.id;
  insert into public.personnel_audit_events(institution_id,employee_id,entity_type,entity_id,action,reason,metadata)
  values(c.institution_id,c.employee_id,'contract',c.id,'status_changed',motive,jsonb_build_object('from',c.status,'to',target_status));
end $$;

create or replace function public.transition_salary_advance(target_advance_id uuid, target_status text, approved_amount numeric default null, comment text default null)
returns void language plpgsql security definer set search_path='' as $$
declare a public.salary_advances%rowtype;
begin
  select * into a from public.salary_advances where id=target_advance_id for update;
  if not found then raise exception 'advance_not_found'; end if;
  if not public.has_institution_role(a.institution_id,array['owner','admin','finance']::public.app_role[]) then raise exception 'forbidden'; end if;
  if not ((a.status='requested' and target_status in ('approved','rejected','cancelled')) or (a.status='approved' and target_status in ('paid','cancelled')) or (a.status='paid' and target_status='settled')) then raise exception 'invalid_advance_transition'; end if;
  if target_status='approved' and (approved_amount is null or approved_amount<=0 or approved_amount>a.amount_requested) then raise exception 'invalid_approved_amount'; end if;
  update public.salary_advances set status=target_status,amount_approved=case when target_status='approved' then approved_amount else amount_approved end,
    granted_on=case when target_status='paid' then current_date else granted_on end,paid_on=case when target_status='paid' then current_date else paid_on end,
    decision_comment=comment,decided_by=auth.uid(),decided_at=now() where id=a.id;
  insert into public.personnel_audit_events(institution_id,employee_id,entity_type,entity_id,action,reason,metadata)
  values(a.institution_id,a.employee_id,'salary_advance',a.id,'status_changed',comment,jsonb_build_object('from',a.status,'to',target_status));
end $$;

create or replace function public.guard_closed_payroll_mutation()
returns trigger language plpgsql set search_path='' as $$
declare period_status public.payroll_status; target_period_id uuid;
begin
  target_period_id := case when tg_op='DELETE' then old.period_id else new.period_id end;
  select p.status into period_status from public.payroll_periods p
  where p.id=target_period_id;
  if period_status='closed' then raise exception 'closed_payroll_is_immutable'; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
create trigger payroll_entries_immutable before update or delete on public.payroll_entries for each row execute function public.guard_closed_payroll_mutation();

create or replace view public.personnel_operational_alerts with (security_invoker=true) as
select e.institution_id,e.id employee_id,'contract_expiring'::text alert_type,c.ends_on due_on,
       e.first_name||' '||e.last_name title,'Contrat arrivant à échéance'::text detail
from public.employees e join public.employee_contracts c on c.employee_id=e.id and c.status='active'
join public.personnel_settings s on s.institution_id=e.institution_id
where c.ends_on between current_date and current_date+s.contract_alert_days
union all
select e.institution_id,e.id,'document_expiring',d.expires_on,e.first_name||' '||e.last_name,'Document arrivant à expiration'
from public.employees e join public.employee_documents d on d.employee_id=e.id
join public.personnel_settings s on s.institution_id=e.institution_id
where d.expires_on between current_date and current_date+s.document_alert_days
union all
select l.institution_id,l.employee_id,'leave_pending',l.starts_on,e.first_name||' '||e.last_name,'Congé en attente de décision'
from public.leave_requests l join public.employees e on e.id=l.employee_id where l.status='submitted';

grant select on public.personnel_operational_alerts to authenticated;
grant execute on function public.exit_employee(uuid,date,text), public.transition_contract(uuid,public.contract_status,text), public.transition_salary_advance(uuid,text,numeric,text) to authenticated;
