-- Atomic write operations used by the payroll forms.
alter table public.salary_advances add column if not exists advance_type_item_id uuid references public.personnel_catalog_items(id);

alter table public.personnel_catalog_items drop constraint if exists personnel_catalog_items_category_check;
alter table public.personnel_catalog_items add constraint personnel_catalog_items_category_check check(category in ('function','contract_type','work_type','bonus_type','deduction_type','advance_type','leave_type','sanction_type','document_type'));

create table public.employee_documents(
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  document_type_item_id uuid references public.personnel_catalog_items(id), name text not null,
  file_path text not null, issued_on date, expires_on date, notes text,
  created_by uuid default auth.uid(), created_at timestamptz not null default now(),
  check(expires_on is null or issued_on is null or expires_on>=issued_on)
);
alter table public.employee_documents enable row level security;
create policy employee_documents_select on public.employee_documents for select to authenticated using(public.is_active_member(institution_id));
create policy employee_documents_manage on public.employee_documents for all to authenticated using(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[])) with check(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[]));
grant select,insert,update on public.employee_documents to authenticated;

insert into public.personnel_catalog_items(institution_id,category,code,default_label,is_system,is_active,display_order)
select id,'document_type',v.code,v.label,true,true,v.ord from public.institutions cross join(values
('IDENTITY','Pièce d’identité',10),('CONTRACT','Contrat signé',20),('DIPLOMA','Diplôme ou attestation',30),('PHOTO','Photo d’identité',40),('OTHER','Autre document',90)
)v(code,label,ord) on conflict do nothing;

create or replace function public.add_payroll_adjustment(
  target_entry_id uuid, adjustment_kind text, adjustment_label text,
  adjustment_amount numeric, target_catalog_item_id uuid default null,
  adjustment_notes text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare entry_row public.payroll_entries%rowtype; adjustment_id uuid;
begin
  select * into entry_row from public.payroll_entries where id=target_entry_id for update;
  if not found or not public.has_institution_role(entry_row.institution_id,array['owner','admin','finance']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if entry_row.status not in ('calculated') then raise exception 'payroll_entry_not_editable'; end if;
  if adjustment_kind not in ('gain','deduction') or adjustment_amount<=0 or nullif(trim(adjustment_label),'') is null then raise exception 'invalid_adjustment'; end if;
  insert into public.payroll_adjustments(institution_id,payroll_entry_id,kind,catalog_item_id,label,amount,notes)
  values(entry_row.institution_id,target_entry_id,adjustment_kind,target_catalog_item_id,trim(adjustment_label),adjustment_amount,nullif(trim(adjustment_notes),'')) returning id into adjustment_id;
  update public.payroll_entries set
    gains=gains+case when adjustment_kind='gain' then adjustment_amount else 0 end,
    deductions=deductions+case when adjustment_kind='deduction' then adjustment_amount else 0 end
  where id=target_entry_id;
  return adjustment_id;
end $$;

create or replace function public.record_payroll_payment(
  target_entry_id uuid, payment_amount numeric, payment_date date,
  payment_method text, payment_reference text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare entry_row public.payroll_entries%rowtype; payment_id uuid; new_paid numeric;
begin
  select * into entry_row from public.payroll_entries where id=target_entry_id for update;
  if not found or not public.has_institution_role(entry_row.institution_id,array['owner','admin','finance']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if entry_row.status not in ('validated','partially_paid','paid') then raise exception 'payroll_entry_not_payable'; end if;
  if payment_amount<=0 or entry_row.paid_amount+payment_amount>entry_row.net_amount then raise exception 'invalid_payment_amount'; end if;
  insert into public.payroll_payments(institution_id,payroll_entry_id,amount,paid_on,method,reference,created_by)
  values(entry_row.institution_id,target_entry_id,payment_amount,payment_date,trim(payment_method),nullif(trim(payment_reference),''),auth.uid()) returning id into payment_id;
  new_paid:=entry_row.paid_amount+payment_amount;
  update public.payroll_entries set paid_amount=new_paid,status=case when new_paid=net_amount then 'paid'::public.payroll_status else 'partially_paid'::public.payroll_status end where id=target_entry_id;
  update public.payroll_periods p set status=case
    when not exists(select 1 from public.payroll_entries e where e.period_id=p.id and e.paid_amount<e.net_amount) then 'paid'::public.payroll_status
    else 'partially_paid'::public.payroll_status end where p.id=entry_row.period_id and p.status<>'closed';
  return payment_id;
end $$;
revoke all on function public.add_payroll_adjustment(uuid,text,text,numeric,uuid,text),public.record_payroll_payment(uuid,numeric,date,text,text) from public;
grant execute on function public.add_payroll_adjustment(uuid,text,text,numeric,uuid,text),public.record_payroll_payment(uuid,numeric,date,text,text) to authenticated;
