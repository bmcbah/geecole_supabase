create or replace function public.cancel_financial_payment(
  target_payment_id uuid,
  target_reason text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  selected_payment public.financial_payments%rowtype;
  selected_account public.student_financial_accounts%rowtype;
  allocation_record record;
begin
  select * into selected_payment
  from public.financial_payments
  where id = target_payment_id
  for update;

  if selected_payment.id is null then raise exception 'financial_payment_not_found'; end if;
  if selected_payment.status = 'cancelled' then return selected_payment.id; end if;
  if nullif(trim(target_reason), '') is null then raise exception 'cancellation_reason_required'; end if;

  select * into selected_account
  from public.student_financial_accounts
  where id = selected_payment.financial_account_id
  for update;

  if not public.has_institution_role(
    selected_payment.institution_id,
    array['owner','admin']::public.app_role[]
  ) then
    raise exception 'permission_denied';
  end if;

  for allocation_record in
    select installment_id, amount
    from public.financial_payment_allocations
    where payment_id = selected_payment.id
    order by created_at desc
  loop
    update public.student_financial_installments
    set paid_amount = paid_amount - allocation_record.amount
    where id = allocation_record.installment_id
      and paid_amount >= allocation_record.amount;

    if not found then raise exception 'payment_cancellation_allocation_failed'; end if;
  end loop;

  update public.student_financial_accounts
  set paid_amount = paid_amount - selected_payment.amount,
      status = case
        when paid_amount - selected_payment.amount <= 0 then 'active'
        when paid_amount - selected_payment.amount < total_amount then 'active'
        else status
      end
  where id = selected_payment.financial_account_id
    and paid_amount >= selected_payment.amount;

  if not found then raise exception 'payment_cancellation_account_failed'; end if;

  update public.financial_payments
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = auth.uid(),
      cancellation_reason = trim(target_reason)
  where id = selected_payment.id;

  return selected_payment.id;
end;
$$;

revoke all on function public.cancel_financial_payment(uuid, text) from public;
grant execute on function public.cancel_financial_payment(uuid, text) to authenticated;

comment on function public.cancel_financial_payment(uuid, text)
is 'Annule un encaissement, restaure les échéances et recalcule le solde du dossier.';
