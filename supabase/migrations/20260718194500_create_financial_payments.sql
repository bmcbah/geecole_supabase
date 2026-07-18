create type public.payment_method as enum ('cash', 'card', 'bank_transfer', 'mobile_money', 'cheque', 'other');
create type public.financial_payment_status as enum ('posted', 'cancelled');

create table public.financial_payments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  financial_account_id uuid not null references public.student_financial_accounts(id) on delete restrict,
  receipt_number text not null,
  payment_date date not null default current_date,
  amount numeric(14, 2) not null check (amount > 0),
  method public.payment_method not null,
  external_reference text,
  note text,
  status public.financial_payment_status not null default 'posted',
  created_by uuid references auth.users(id),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id),
  cancellation_reason text,
  created_at timestamptz not null default now(),
  unique (institution_id, receipt_number)
);

create table public.financial_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.financial_payments(id) on delete restrict,
  installment_id uuid not null references public.student_financial_installments(id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (payment_id, installment_id)
);

create index financial_payments_account_date_idx on public.financial_payments(financial_account_id, payment_date desc);
create index financial_payment_allocations_payment_idx on public.financial_payment_allocations(payment_id);

alter table public.financial_payments enable row level security;
alter table public.financial_payment_allocations enable row level security;

create policy financial_payments_select_member on public.financial_payments for select to authenticated
using (public.is_active_member(institution_id));

create policy financial_payment_allocations_select_member on public.financial_payment_allocations for select to authenticated
using (exists (
  select 1 from public.financial_payments payment
  where payment.id = payment_id and public.is_active_member(payment.institution_id)
));

grant select on public.financial_payments, public.financial_payment_allocations to authenticated;
revoke all on public.financial_payments, public.financial_payment_allocations from anon;

create sequence public.financial_receipt_number_seq;

create or replace function public.register_financial_payment(
  target_financial_account_id uuid,
  target_amount numeric,
  target_method public.payment_method,
  target_payment_date date default current_date,
  target_external_reference text default null,
  target_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  selected_account public.student_financial_accounts%rowtype;
  payment_id uuid;
  amount_remaining numeric(14, 2);
  allocation_amount numeric(14, 2);
  installment_record record;
  receipt text;
begin
  select * into selected_account
  from public.student_financial_accounts
  where id = target_financial_account_id
  for update;

  if selected_account.id is null then raise exception 'financial_account_not_found'; end if;
  if not public.has_institution_role(selected_account.institution_id, array['owner','admin','secretary']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  if selected_account.status not in ('active', 'draft') then raise exception 'financial_account_not_payable'; end if;
  if target_amount is null or target_amount <= 0 then raise exception 'positive_payment_amount_required'; end if;
  if target_amount > selected_account.balance_amount then raise exception 'payment_exceeds_balance'; end if;

  receipt := 'REC-' || to_char(coalesce(target_payment_date, current_date), 'YYYY') || '-' || lpad(nextval('public.financial_receipt_number_seq')::text, 8, '0');

  insert into public.financial_payments (
    institution_id, academic_year_id, financial_account_id, receipt_number,
    payment_date, amount, method, external_reference, note, created_by
  ) values (
    selected_account.institution_id, selected_account.academic_year_id, selected_account.id, receipt,
    coalesce(target_payment_date, current_date), target_amount, target_method,
    nullif(trim(target_external_reference), ''), nullif(trim(target_note), ''), auth.uid()
  ) returning id into payment_id;

  amount_remaining := target_amount;
  for installment_record in
    select id, balance_amount
    from public.student_financial_installments
    where financial_account_id = selected_account.id and balance_amount > 0
    order by due_date, sequence
    for update
  loop
    exit when amount_remaining <= 0;
    allocation_amount := least(amount_remaining, installment_record.balance_amount);

    insert into public.financial_payment_allocations(payment_id, installment_id, amount)
    values (payment_id, installment_record.id, allocation_amount);

    update public.student_financial_installments
    set paid_amount = paid_amount + allocation_amount
    where id = installment_record.id;

    amount_remaining := amount_remaining - allocation_amount;
  end loop;

  if amount_remaining <> 0 then raise exception 'payment_allocation_failed'; end if;

  update public.student_financial_accounts
  set paid_amount = paid_amount + target_amount,
      status = case when paid_amount + target_amount = total_amount then 'settled' else 'active' end
  where id = selected_account.id;

  return payment_id;
end;
$$;

revoke all on function public.register_financial_payment(uuid, numeric, public.payment_method, date, text, text) from public;
grant execute on function public.register_financial_payment(uuid, numeric, public.payment_method, date, text, text) to authenticated;

comment on table public.financial_payments is 'Encaissements immuables enregistrés sur les dossiers financiers.';
comment on table public.financial_payment_allocations is 'Ventilation d’un encaissement sur les échéances ouvertes les plus anciennes.';
