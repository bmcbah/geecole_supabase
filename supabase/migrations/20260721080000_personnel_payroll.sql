create type public.employee_status as enum ('active', 'suspended', 'exited');
create type public.compensation_mode as enum ('fixed', 'hourly', 'session', 'flat_rate', 'mixed', 'unpaid');
create type public.contract_status as enum ('draft', 'active', 'ended', 'terminated');
create type public.work_entry_status as enum ('planned', 'completed', 'validated', 'rejected', 'paid');
create type public.payroll_status as enum ('draft', 'calculated', 'validated', 'partially_paid', 'paid', 'closed', 'cancelled');

create table public.personnel_catalog_items (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid references public.institutions(id) on delete cascade,
  category text not null check (category in ('function','contract_type','work_type','bonus_type','deduction_type','advance_type','leave_type','sanction_type')),
  code text not null, default_label text not null, local_label text, is_system boolean not null default false,
  is_active boolean not null default true, display_order integer not null default 0, created_at timestamptz not null default now(),
  unique nulls not distinct (institution_id, category, code)
);

create table public.employees (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  membership_id uuid references public.memberships(id) on delete set null, employee_number text not null,
  first_name text not null, last_name text not null, gender text, birth_date date, birth_place text, nationality text,
  phone text, secondary_phone text, email text, address text, emergency_contact_name text, emergency_contact_phone text,
  identity_type text, identity_number text, identity_expires_on date, hired_on date not null default current_date,
  status public.employee_status not null default 'active', exited_on date, exit_reason text, notes text,
  created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (institution_id, employee_number), check ((status <> 'exited') or exited_on is not null)
);

create table public.employee_functions (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  function_item_id uuid not null references public.personnel_catalog_items(id), is_primary boolean not null default false,
  responsibility text, starts_on date not null, ends_on date, is_active boolean not null default true,
  created_at timestamptz not null default now(), check (ends_on is null or ends_on >= starts_on)
);
create unique index employee_one_primary_function_idx on public.employee_functions(employee_id) where is_primary and is_active;

create table public.employee_contracts (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict, contract_type_item_id uuid references public.personnel_catalog_items(id),
  reference text, starts_on date not null, ends_on date, status public.contract_status not null default 'draft',
  compensation_mode public.compensation_mode not null, fixed_amount numeric(14,2) not null default 0 check (fixed_amount >= 0),
  hourly_rate numeric(14,2) not null default 0 check (hourly_rate >= 0), session_rate numeric(14,2) not null default 0 check (session_rate >= 0),
  payment_frequency text not null default 'monthly', weekly_hours numeric(6,2), payment_method text, document_path text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (ends_on is null or ends_on >= starts_on)
);
create unique index employee_one_active_contract_idx on public.employee_contracts(institution_id, employee_id) where status = 'active';

create table public.work_entries (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict, contract_id uuid references public.employee_contracts(id),
  work_type_item_id uuid references public.personnel_catalog_items(id), work_date date not null, started_at time, ended_at time,
  minutes integer not null check (minutes > 0), quantity numeric(8,2) not null default 1 check (quantity > 0),
  rate numeric(14,2) check (rate is null or rate >= 0), source text not null default 'manual', status public.work_entry_status not null default 'completed',
  notes text, validated_by uuid, validated_at timestamptz, payroll_entry_id uuid, created_at timestamptz not null default now()
);

create table public.leave_requests (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict, leave_type_item_id uuid references public.personnel_catalog_items(id),
  starts_on date not null, ends_on date not null, reason text, document_path text,
  status text not null default 'draft' check (status in ('draft','submitted','approved','rejected','cancelled')),
  decided_by uuid, decision_comment text, created_at timestamptz not null default now(), check (ends_on >= starts_on)
);

create table public.payroll_periods (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null, starts_on date not null, ends_on date not null, status public.payroll_status not null default 'draft',
  validated_by uuid, validated_at timestamptz, closed_by uuid, closed_at timestamptz, created_at timestamptz not null default now(),
  unique (institution_id, starts_on, ends_on), check (ends_on >= starts_on)
);

create table public.payroll_entries (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  period_id uuid not null references public.payroll_periods(id) on delete restrict, employee_id uuid not null references public.employees(id) on delete restrict,
  contract_id uuid references public.employee_contracts(id), fixed_amount numeric(14,2) not null default 0,
  variable_amount numeric(14,2) not null default 0, gains numeric(14,2) not null default 0, deductions numeric(14,2) not null default 0,
  advance_repayments numeric(14,2) not null default 0, gross_amount numeric(14,2) generated always as (fixed_amount + variable_amount + gains) stored,
  net_amount numeric(14,2) generated always as (fixed_amount + variable_amount + gains - deductions - advance_repayments) stored,
  paid_amount numeric(14,2) not null default 0, status public.payroll_status not null default 'draft', created_at timestamptz not null default now(),
  unique (period_id, employee_id)
);
alter table public.work_entries add constraint work_entries_payroll_entry_fk foreign key (payroll_entry_id) references public.payroll_entries(id);

create table public.payroll_adjustments (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  payroll_entry_id uuid not null references public.payroll_entries(id) on delete cascade,
  kind text not null check (kind in ('gain','deduction','regularization')), catalog_item_id uuid references public.personnel_catalog_items(id),
  label text not null, amount numeric(14,2) not null check (amount > 0), notes text, created_at timestamptz not null default now()
);

create table public.salary_advances (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict, amount_requested numeric(14,2) not null check (amount_requested > 0),
  amount_approved numeric(14,2) check (amount_approved >= 0), repaid_amount numeric(14,2) not null default 0 check (repaid_amount >= 0),
  requested_on date not null default current_date, granted_on date, reason text,
  status text not null default 'requested' check (status in ('requested','approved','rejected','paid','settled','cancelled')), created_at timestamptz not null default now()
);

create table public.employee_sanctions (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict, sanction_type_item_id uuid references public.personnel_catalog_items(id),
  incident_on date not null, decided_on date, reason text not null, description text, decision text,
  status text not null default 'draft' check (status in ('draft','notified','contested','closed','cancelled')),
  created_by uuid default auth.uid(), created_at timestamptz not null default now()
);

create table public.payroll_payments (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  payroll_entry_id uuid not null references public.payroll_entries(id) on delete restrict, amount numeric(14,2) not null check (amount > 0),
  paid_on date not null default current_date, method text not null, reference text, created_by uuid default auth.uid(), created_at timestamptz not null default now()
);

create index employees_institution_status_idx on public.employees(institution_id, status);
create index work_entries_validation_idx on public.work_entries(institution_id, work_date, status);
create index payroll_entries_period_idx on public.payroll_entries(period_id, status);

create or replace function public.assign_employee_number()
returns trigger language plpgsql set search_path = '' as $$
declare next_number integer;
begin
  if new.employee_number is null or btrim(new.employee_number) = '' then
    perform pg_advisory_xact_lock(hashtext(new.institution_id::text || ':employee-number'));
    select coalesce(max(nullif(substring(employee_number from '([0-9]+)$'), '')::integer), 0) + 1
      into next_number from public.employees where institution_id = new.institution_id;
    new.employee_number := 'PER-' || extract(year from current_date)::integer || '-' || lpad(next_number::text, 4, '0');
  end if;
  return new;
end $$;
create trigger employees_assign_number before insert on public.employees for each row execute function public.assign_employee_number();

create trigger employees_updated_at before update on public.employees for each row execute function public.set_updated_at();
create trigger employee_contracts_updated_at before update on public.employee_contracts for each row execute function public.set_updated_at();

do $$ declare t text; begin
  foreach t in array array['personnel_catalog_items','employees','employee_functions','employee_contracts','work_entries','leave_requests','payroll_periods','payroll_entries','payroll_adjustments','salary_advances','employee_sanctions','payroll_payments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_active_member(institution_id))', t || '_select', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.has_institution_role(institution_id, array[''owner'',''admin'']::public.app_role[])) with check (public.has_institution_role(institution_id, array[''owner'',''admin'']::public.app_role[]))', t || '_admin', t);
  end loop;
end $$;

create policy work_entries_secretary on public.work_entries for all to authenticated
using (public.has_institution_role(institution_id, array['secretary']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['secretary']::public.app_role[]));
create policy leave_requests_secretary on public.leave_requests for all to authenticated
using (public.has_institution_role(institution_id, array['secretary']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['secretary']::public.app_role[]));
create policy payroll_entries_finance on public.payroll_entries for all to authenticated
using (public.has_institution_role(institution_id, array['finance']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['finance']::public.app_role[]));
create policy payroll_payments_finance on public.payroll_payments for all to authenticated
using (public.has_institution_role(institution_id, array['finance']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['finance']::public.app_role[]));

grant select, insert, update, delete on public.personnel_catalog_items, public.employees, public.employee_functions,
public.employee_contracts, public.work_entries, public.leave_requests, public.payroll_periods, public.payroll_entries,
public.payroll_adjustments, public.salary_advances, public.employee_sanctions, public.payroll_payments to authenticated;

create or replace function public.calculate_payroll_period(target_period_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare p public.payroll_periods; c record; new_entry uuid; count_entries integer := 0; variable_total numeric(14,2);
begin
  select * into p from public.payroll_periods where id=target_period_id for update;
  if p.id is null then raise exception 'payroll_period_not_found'; end if;
  if not public.has_institution_role(p.institution_id,array['owner','admin','finance']::public.app_role[]) then raise exception 'forbidden'; end if;
  if p.status not in ('draft','calculated') then raise exception 'payroll_period_not_editable'; end if;
  update public.work_entries set payroll_entry_id=null where payroll_entry_id in (select id from public.payroll_entries where period_id=p.id);
  delete from public.payroll_entries where period_id=p.id;
  for c in select c.* from public.employee_contracts c join public.employees e on e.id=c.employee_id where c.institution_id=p.institution_id and c.status='active' and e.status='active' and c.starts_on<=p.ends_on and (c.ends_on is null or c.ends_on>=p.starts_on)
  loop
    select coalesce(sum(case when c.compensation_mode='session' then w.quantity*coalesce(w.rate,c.session_rate) else (w.minutes::numeric/60)*coalesce(w.rate,c.hourly_rate) end),0) into variable_total from public.work_entries w where w.contract_id=c.id and w.status='validated' and w.work_date between p.starts_on and p.ends_on and w.payroll_entry_id is null;
    insert into public.payroll_entries(institution_id,period_id,employee_id,contract_id,fixed_amount,variable_amount,status) values(p.institution_id,p.id,c.employee_id,c.id,case when c.compensation_mode in ('fixed','mixed','flat_rate') then c.fixed_amount else 0 end,variable_total,'calculated') returning id into new_entry;
    update public.work_entries set payroll_entry_id=new_entry where contract_id=c.id and status='validated' and work_date between p.starts_on and p.ends_on and payroll_entry_id is null;
    count_entries:=count_entries+1;
  end loop;
  update public.payroll_periods set status='calculated' where id=p.id;
  return count_entries;
end $$;

create or replace function public.transition_payroll_period(target_period_id uuid,new_status public.payroll_status)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.payroll_periods;
begin
  select * into p from public.payroll_periods where id=target_period_id for update;
  if p.id is null then raise exception 'payroll_period_not_found'; end if;
  if not public.has_institution_role(p.institution_id,array['owner','admin','finance']::public.app_role[]) then raise exception 'forbidden'; end if;
  if not ((p.status='calculated' and new_status='validated') or (p.status in ('validated','paid') and new_status='closed')) then raise exception 'invalid_payroll_transition'; end if;
  if new_status='closed' and exists(select 1 from public.payroll_entries where period_id=p.id and paid_amount<net_amount) then raise exception 'payroll_has_unpaid_balance'; end if;
  update public.payroll_periods set status=new_status,validated_by=case when new_status='validated' then auth.uid() else validated_by end,validated_at=case when new_status='validated' then now() else validated_at end,closed_by=case when new_status='closed' then auth.uid() else closed_by end,closed_at=case when new_status='closed' then now() else closed_at end where id=p.id;
  update public.payroll_entries set status=new_status where period_id=p.id;
end $$;

revoke all on function public.calculate_payroll_period(uuid), public.transition_payroll_period(uuid,public.payroll_status) from public;
grant execute on function public.calculate_payroll_period(uuid), public.transition_payroll_period(uuid,public.payroll_status) to authenticated;
