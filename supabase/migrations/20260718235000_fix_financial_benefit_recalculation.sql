-- Corrige l'attribution des avantages et rend le recalcul explicite et transactionnel.
-- Les encaissements restent immuables ; seules les échéances encore ouvertes sont redistribuées.

create or replace function public.recalculate_financial_item_after_adjustment(
  target_financial_item_id uuid
) returns void
language plpgsql
security definer
set search_path = public as $$
declare
  selected_item public.student_financial_items%rowtype;
  selected_account public.student_financial_accounts%rowtype;
  total_adjustments numeric(14, 2);
  item_paid numeric(14, 2);
  new_net_amount numeric(14, 2);
  remaining_to_allocate numeric(14, 2);
  open_weight numeric(14, 4);
  open_count integer;
  open_index integer := 0;
  allocated numeric(14, 2) := 0;
  installment_record record;
  next_balance numeric(14, 2);
  next_amount numeric(14, 2);
  account_total numeric(14, 2);
  account_paid numeric(14, 2);
begin
  select * into selected_item
  from public.student_financial_items
  where id = target_financial_item_id
  for update;

  if selected_item.id is null then
    raise exception 'financial_item_not_found';
  end if;

  select * into selected_account
  from public.student_financial_accounts
  where id = selected_item.financial_account_id
  for update;

  select coalesce(sum(calculated_amount), 0)
  into total_adjustments
  from public.student_financial_adjustments
  where financial_item_id = selected_item.id
    and status = 'active';

  total_adjustments := least(total_adjustments, selected_item.amount);
  new_net_amount := selected_item.amount - total_adjustments;

  select coalesce(sum(paid_amount), 0)
  into item_paid
  from public.student_financial_installments
  where financial_item_id = selected_item.id;

  if new_net_amount < item_paid then
    raise exception 'adjustment_below_paid_amount';
  end if;

  remaining_to_allocate := new_net_amount - item_paid;

  select coalesce(sum(percentage_snapshot), 0), count(*)
  into open_weight, open_count
  from public.student_financial_installments
  where financial_item_id = selected_item.id
    and amount > paid_amount;

  if remaining_to_allocate > 0 and open_count = 0 then
    raise exception 'no_open_installments_for_recalculation';
  end if;

  -- Autorise uniquement les mutations réalisées par ce moteur métier.
  perform set_config('app.financial_adjustment_recalculation', 'on', true);

  update public.student_financial_items
  set adjustment_amount = total_adjustments,
      net_amount = new_net_amount
  where id = selected_item.id;

  for installment_record in
    select id, paid_amount, percentage_snapshot
    from public.student_financial_installments
    where financial_item_id = selected_item.id
      and amount > paid_amount
    order by sequence, id
  loop
    open_index := open_index + 1;

    if open_index = open_count then
      next_balance := remaining_to_allocate - allocated;
    elsif open_weight > 0 then
      next_balance := round(
        remaining_to_allocate * installment_record.percentage_snapshot / open_weight,
        0
      );
      allocated := allocated + next_balance;
    else
      next_balance := round(remaining_to_allocate / open_count, 0);
      allocated := allocated + next_balance;
    end if;

    next_amount := installment_record.paid_amount + greatest(next_balance, 0);

    update public.student_financial_installments
    set amount = next_amount
    where id = installment_record.id;
  end loop;

  select coalesce(sum(net_amount), 0)
  into account_total
  from public.student_financial_items
  where financial_account_id = selected_account.id;

  select coalesce(sum(paid_amount), 0)
  into account_paid
  from public.student_financial_installments
  where financial_account_id = selected_account.id;

  update public.student_financial_accounts
  set total_amount = account_total,
      paid_amount = account_paid,
      status = case
        when account_total = account_paid then 'settled'::public.financial_account_status
        else 'active'::public.financial_account_status
      end
  where id = selected_account.id;
end;
$$;

create or replace function public.grant_student_financial_benefit(
  target_financial_item_id uuid,
  target_template_id uuid,
  target_value numeric default null,
  target_reason text default null,
  target_external_reference text default null
) returns uuid
language plpgsql
security definer
set search_path = public as $$
declare
  selected_item public.student_financial_items%rowtype;
  selected_account public.student_financial_accounts%rowtype;
  selected_enrollment public.enrollments%rowtype;
  selected_template public.financial_benefit_templates%rowtype;
  effective_value numeric(14, 2);
  benefit_amount numeric(14, 2);
  adjustment_id uuid;
  active_non_stackable integer;
  active_adjustments integer;
begin
  select * into selected_item
  from public.student_financial_items
  where id = target_financial_item_id
  for update;

  if selected_item.id is null then
    raise exception 'financial_item_not_found';
  end if;

  select * into selected_account
  from public.student_financial_accounts
  where id = selected_item.financial_account_id
  for update;

  if selected_account.id is null then
    raise exception 'financial_account_not_found';
  end if;

  if not public.has_institution_role(
    selected_item.institution_id,
    array['owner','admin']::public.app_role[]
  ) then
    raise exception 'permission_denied';
  end if;

  if selected_account.status not in ('active', 'draft', 'settled') then
    raise exception 'financial_account_not_adjustable';
  end if;

  select * into selected_template
  from public.financial_benefit_templates
  where id = target_template_id
    and institution_id = selected_item.institution_id
    and is_active;

  if selected_template.id is null then
    raise exception 'financial_benefit_template_not_found';
  end if;

  select * into selected_enrollment
  from public.enrollments
  where id = selected_account.enrollment_id;

  if cardinality(selected_template.fee_type_ids) > 0
    and not selected_item.fee_type_id = any(selected_template.fee_type_ids) then
    raise exception 'financial_benefit_not_applicable_to_fee';
  end if;

  if selected_template.scope = 'cycle'
    and not selected_enrollment.academic_year_cycle_id = any(selected_template.cycle_ids) then
    raise exception 'financial_benefit_not_applicable_to_cycle';
  end if;

  if selected_template.scope = 'level'
    and not selected_enrollment.academic_year_level_id = any(selected_template.level_ids) then
    raise exception 'financial_benefit_not_applicable_to_level';
  end if;

  if exists (
    select 1
    from public.student_financial_adjustments adjustment
    where adjustment.financial_item_id = selected_item.id
      and adjustment.template_id = selected_template.id
      and adjustment.status = 'active'
  ) then
    raise exception 'financial_benefit_template_already_applied';
  end if;

  effective_value := coalesce(target_value, selected_template.default_value);

  if effective_value <= 0 then
    raise exception 'positive_financial_benefit_value_required';
  end if;

  if selected_template.calculation_type = 'percentage' and effective_value > 100 then
    raise exception 'financial_benefit_percentage_exceeds_100';
  end if;

  select count(*), count(*) filter (where not is_stackable_snapshot)
  into active_adjustments, active_non_stackable
  from public.student_financial_adjustments
  where financial_item_id = selected_item.id
    and status = 'active';

  if active_non_stackable > 0
    or (not selected_template.is_stackable and active_adjustments > 0) then
    raise exception 'financial_benefit_not_stackable';
  end if;

  benefit_amount := case selected_template.calculation_type
    when 'percentage' then round(selected_item.amount * effective_value / 100, 0)
    else effective_value
  end;

  benefit_amount := least(benefit_amount, selected_item.net_amount);

  if benefit_amount <= 0 then
    raise exception 'financial_item_already_fully_adjusted';
  end if;

  insert into public.student_financial_adjustments (
    institution_id,
    academic_year_id,
    financial_account_id,
    financial_item_id,
    template_id,
    benefit_type,
    calculation_type,
    value,
    calculated_amount,
    reason,
    external_reference,
    is_stackable_snapshot,
    granted_by
  ) values (
    selected_item.institution_id,
    selected_item.academic_year_id,
    selected_item.financial_account_id,
    selected_item.id,
    selected_template.id,
    selected_template.benefit_type,
    selected_template.calculation_type,
    effective_value,
    benefit_amount,
    coalesce(nullif(trim(target_reason), ''), selected_template.name),
    nullif(trim(target_external_reference), ''),
    selected_template.is_stackable,
    auth.uid()
  ) returning id into adjustment_id;

  perform public.recalculate_financial_item_after_adjustment(selected_item.id);
  return adjustment_id;
end;
$$;

revoke all on function public.recalculate_financial_item_after_adjustment(uuid) from public;
revoke all on function public.grant_student_financial_benefit(uuid, uuid, numeric, text, text) from public;
grant execute on function public.grant_student_financial_benefit(uuid, uuid, numeric, text, text) to authenticated;

comment on function public.recalculate_financial_item_after_adjustment(uuid)
is 'Recalcule de manière transactionnelle le net du frais et redistribue le reste uniquement sur les échéances ouvertes.';
