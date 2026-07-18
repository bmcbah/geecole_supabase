create or replace function public.register_targeted_financial_payment(
  target_financial_account_id uuid,
  target_allocations jsonb,
  target_method public.payment_method,
  target_payment_date date default current_date,
  target_external_reference text default null,
  target_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  selected_account public.student_financial_accounts%rowtype;
  payment_id uuid;
  target_amount numeric(14, 2);
  allocation_record record;
  selected_installment public.student_financial_installments%rowtype;
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
  if target_allocations is null or jsonb_typeof(target_allocations) <> 'array' or jsonb_array_length(target_allocations) = 0 then
    raise exception 'payment_allocations_required';
  end if;

  select coalesce(sum((entry->>'amount')::numeric), 0)
  into target_amount
  from jsonb_array_elements(target_allocations) entry;

  if target_amount <= 0 then raise exception 'positive_payment_amount_required'; end if;
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

  for allocation_record in
    select
      (entry->>'installment_id')::uuid as installment_id,
      (entry->>'amount')::numeric(14, 2) as amount
    from jsonb_array_elements(target_allocations) entry
  loop
    if allocation_record.amount <= 0 then raise exception 'positive_allocation_amount_required'; end if;

    select * into selected_installment
    from public.student_financial_installments
    where id = allocation_record.installment_id
      and financial_account_id = selected_account.id
    for update;

    if selected_installment.id is null then raise exception 'installment_not_found'; end if;
    if allocation_record.amount > selected_installment.balance_amount then
      raise exception 'allocation_exceeds_installment_balance';
    end if;

    insert into public.financial_payment_allocations(payment_id, installment_id, amount)
    values (payment_id, selected_installment.id, allocation_record.amount);

    update public.student_financial_installments
    set paid_amount = paid_amount + allocation_record.amount
    where id = selected_installment.id;
  end loop;

  update public.student_financial_accounts
  set paid_amount = paid_amount + target_amount,
      status = case
        when paid_amount + target_amount = total_amount
          then 'settled'::public.financial_account_status
        else 'active'::public.financial_account_status
      end
  where id = selected_account.id;

  return payment_id;
end;
$$;

revoke all on function public.register_targeted_financial_payment(uuid, jsonb, public.payment_method, date, text, text) from public;
grant execute on function public.register_targeted_financial_payment(uuid, jsonb, public.payment_method, date, text, text) to authenticated;

comment on function public.register_targeted_financial_payment(uuid, jsonb, public.payment_method, date, text, text)
is 'Enregistre un encaissement et applique les montants explicitement saisis aux échéances choisies.';