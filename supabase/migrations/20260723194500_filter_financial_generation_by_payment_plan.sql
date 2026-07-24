create or replace function public.generate_student_financial_account(
  target_enrollment_id uuid,
  target_payment_plan_id uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  selected_enrollment public.enrollments%rowtype;
  selected_student public.students%rowtype;
  selected_level public.academic_year_levels%rowtype;
  selected_plan public.payment_plans%rowtype;
  existing_account_id uuid;
  new_account_id uuid;
  total_fees numeric(14, 2);
  installment_total numeric(8, 2);
  installment_count integer;
  current_installment integer := 0;
  allocated_amount numeric(14, 2) := 0;
  current_amount numeric(14, 2);
  fee_record record;
  installment_record record;
begin
  select * into selected_enrollment
  from public.enrollments
  where id = target_enrollment_id;

  if selected_enrollment.id is null then
    raise exception 'enrollment_not_found';
  end if;

  if not public.has_institution_role(
    selected_enrollment.institution_id,
    array['owner','admin','secretary']::public.app_role[]
  ) then
    raise exception 'permission_denied';
  end if;

  if selected_enrollment.status <> 'confirmed' then
    raise exception 'confirmed_enrollment_required';
  end if;

  select id into existing_account_id
  from public.student_financial_accounts
  where enrollment_id = selected_enrollment.id;

  if existing_account_id is not null then
    return existing_account_id;
  end if;

  select * into selected_student
  from public.students
  where id = selected_enrollment.student_id
    and institution_id = selected_enrollment.institution_id;

  if selected_student.id is null then
    raise exception 'student_not_found';
  end if;

  select * into selected_level
  from public.academic_year_levels
  where id = selected_enrollment.academic_year_level_id
    and institution_id = selected_enrollment.institution_id
    and academic_year_id = selected_enrollment.academic_year_id;

  if selected_level.id is null then
    raise exception 'annual_level_not_found';
  end if;

  select * into selected_plan
  from public.payment_plans
  where id = target_payment_plan_id
    and institution_id = selected_enrollment.institution_id
    and academic_year_id = selected_enrollment.academic_year_id
    and is_active;

  if selected_plan.id is null then
    raise exception 'active_payment_plan_not_found';
  end if;

  if not (
    selected_plan.scope = 'institution'
    or (
      selected_plan.scope = 'cycle'
      and selected_level.academic_year_cycle_id = any(selected_plan.cycle_ids)
    )
    or (
      selected_plan.scope = 'level'
      and selected_level.id = any(selected_plan.level_ids)
    )
  ) then
    raise exception 'payment_plan_not_applicable_to_level';
  end if;

  select coalesce(sum(resolved.amount), 0)
  into total_fees
  from (
    select distinct on (item.fee_type_id)
      item.fee_type_id,
      item.amount
    from public.fee_schedule_items item
    where item.institution_id = selected_enrollment.institution_id
      and item.academic_year_id = selected_enrollment.academic_year_id
      and item.is_active
      and item.fee_type_id = any(selected_plan.fee_type_ids)
      and (
        item.scope = 'institution'
        or (
          item.scope = 'cycle'
          and selected_level.academic_year_cycle_id = any(item.cycle_ids)
        )
        or (
          item.scope = 'level'
          and selected_level.id = any(item.level_ids)
        )
      )
    order by
      item.fee_type_id,
      case item.scope when 'level' then 1 when 'cycle' then 2 else 3 end,
      item.created_at desc
  ) resolved;

  if total_fees <= 0 then
    raise exception 'payment_plan_has_no_applicable_fees';
  end if;

  select coalesce(sum(percentage), 0), count(*)
  into installment_total, installment_count
  from public.payment_plan_installments
  where payment_plan_id = selected_plan.id;

  if installment_count = 0 or abs(installment_total - 100) > 0.001 then
    raise exception 'invalid_payment_plan_installments';
  end if;

  insert into public.student_financial_accounts (
    institution_id,
    academic_year_id,
    enrollment_id,
    student_id,
    payment_plan_id,
    status,
    currency_code,
    total_amount,
    paid_amount,
    student_name_snapshot,
    matricule_snapshot,
    level_name_snapshot,
    cycle_name_snapshot,
    payment_plan_name_snapshot,
    generated_at,
    generated_by
  ) values (
    selected_enrollment.institution_id,
    selected_enrollment.academic_year_id,
    selected_enrollment.id,
    selected_enrollment.student_id,
    selected_plan.id,
    'active',
    'GNF',
    total_fees,
    0,
    trim(selected_student.first_name || ' ' || selected_student.last_name),
    selected_student.matricule,
    selected_enrollment.level_name_snapshot,
    selected_enrollment.cycle_name_snapshot,
    selected_plan.name,
    now(),
    auth.uid()
  ) returning id into new_account_id;

  for fee_record in
    select distinct on (item.fee_type_id)
      item.id,
      item.fee_type_id,
      item.amount,
      fee_type.code,
      fee_type.name
    from public.fee_schedule_items item
    join public.fee_types fee_type on fee_type.id = item.fee_type_id
    where item.institution_id = selected_enrollment.institution_id
      and item.academic_year_id = selected_enrollment.academic_year_id
      and item.is_active
      and item.fee_type_id = any(selected_plan.fee_type_ids)
      and (
        item.scope = 'institution'
        or (
          item.scope = 'cycle'
          and selected_level.academic_year_cycle_id = any(item.cycle_ids)
        )
        or (
          item.scope = 'level'
          and selected_level.id = any(item.level_ids)
        )
      )
    order by
      item.fee_type_id,
      case item.scope when 'level' then 1 when 'cycle' then 2 else 3 end,
      item.created_at desc
  loop
    insert into public.student_financial_items (
      financial_account_id,
      institution_id,
      academic_year_id,
      fee_type_id,
      fee_schedule_item_id,
      origin,
      code_snapshot,
      label_snapshot,
      amount
    ) values (
      new_account_id,
      selected_enrollment.institution_id,
      selected_enrollment.academic_year_id,
      fee_record.fee_type_id,
      fee_record.id,
      'fee_schedule',
      fee_record.code,
      fee_record.name,
      fee_record.amount
    );
  end loop;

  for installment_record in
    select *
    from public.payment_plan_installments
    where payment_plan_id = selected_plan.id
    order by sequence
  loop
    current_installment := current_installment + 1;

    if current_installment = installment_count then
      current_amount := total_fees - allocated_amount;
    else
      current_amount := round(total_fees * installment_record.percentage / 100, 0);
      allocated_amount := allocated_amount + current_amount;
    end if;

    insert into public.student_financial_installments (
      financial_account_id,
      payment_plan_installment_id,
      sequence,
      label_snapshot,
      percentage_snapshot,
      due_date,
      amount,
      paid_amount
    ) values (
      new_account_id,
      installment_record.id,
      installment_record.sequence,
      installment_record.label,
      installment_record.percentage,
      installment_record.due_date,
      current_amount,
      0
    );
  end loop;

  return new_account_id;
end;
$$;

revoke all on function public.generate_student_financial_account(uuid, uuid) from public;
grant execute on function public.generate_student_financial_account(uuid, uuid) to authenticated;

comment on function public.generate_student_financial_account(uuid, uuid)
is 'Génère de manière idempotente un dossier financier à partir des seuls frais couverts par le plan sélectionné.';
