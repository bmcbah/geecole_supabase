create or replace function public.validate_student_financial_adjustment_scope()
returns trigger
language plpgsql
set search_path = public as $$
declare
  selected_template public.financial_benefit_templates%rowtype;
  selected_account public.student_financial_accounts%rowtype;
  selected_enrollment public.enrollments%rowtype;
begin
  if new.template_id is null then return new; end if;

  select * into selected_template
  from public.financial_benefit_templates
  where id = new.template_id;

  if selected_template.id is null or not selected_template.is_active then
    raise exception 'financial_benefit_template_not_found';
  end if;

  select * into selected_account
  from public.student_financial_accounts
  where id = new.financial_account_id;

  select * into selected_enrollment
  from public.enrollments
  where id = selected_account.enrollment_id;

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
    where adjustment.financial_item_id = new.financial_item_id
      and adjustment.template_id = new.template_id
      and adjustment.status = 'active'
  ) then
    raise exception 'financial_benefit_template_already_applied';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_student_financial_adjustment_scope_trigger
  on public.student_financial_adjustments;

create trigger validate_student_financial_adjustment_scope_trigger
before insert on public.student_financial_adjustments
for each row execute function public.validate_student_financial_adjustment_scope();

create or replace function public.ensure_financial_item_recalculation_is_allocated()
returns trigger
language plpgsql
set search_path = public as $$
declare
  open_count integer;
  target_balance numeric(14, 2);
begin
  if coalesce(current_setting('app.financial_adjustment_recalculation', true), 'off') <> 'on' then
    return new;
  end if;

  select count(*) into open_count
  from public.student_financial_installments
  where financial_item_id = new.financial_item_id
    and amount > paid_amount;

  select greatest(item.net_amount - coalesce(sum(installment.paid_amount), 0), 0)
  into target_balance
  from public.student_financial_items item
  left join public.student_financial_installments installment
    on installment.financial_item_id = item.id
  where item.id = new.financial_item_id
  group by item.net_amount;

  if target_balance > 0 and open_count = 0 then
    raise exception 'no_open_installments_for_recalculation';
  end if;

  return new;
end;
$$;

comment on function public.validate_student_financial_adjustment_scope()
is 'Valide la portée cycle/niveau, la catégorie de frais et les doublons avant attribution d’un avantage.';

comment on function public.ensure_financial_item_recalculation_is_allocated()
is 'Protège le moteur contre un reste à payer qui ne pourrait être réparti sur aucune échéance ouverte.';
