create type public.financial_benefit_type as enum (
  'discount',
  'scholarship',
  'exemption',
  'sponsorship'
);

create type public.financial_benefit_calculation as enum (
  'fixed',
  'percentage'
);

create type public.financial_adjustment_status as enum (
  'active',
  'cancelled'
);

create table public.financial_benefit_templates (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  benefit_type public.financial_benefit_type not null,
  calculation_type public.financial_benefit_calculation not null,
  default_value numeric(14, 2) not null,
  fee_type_ids uuid[] not null default '{}',
  scope public.fee_scope not null default 'institution',
  cycle_ids uuid[] not null default '{}',
  level_ids uuid[] not null default '{}',
  is_stackable boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  constraint financial_benefit_templates_code_unique unique (institution_id, code),
  constraint financial_benefit_templates_value_check check (
    default_value > 0
    and (
      calculation_type = 'fixed'
      or (calculation_type = 'percentage' and default_value <= 100)
    )
  ),
  constraint financial_benefit_templates_scope_check check (
    (scope = 'institution' and cardinality(cycle_ids) = 0 and cardinality(level_ids) = 0)
    or (scope = 'cycle' and cardinality(cycle_ids) > 0 and cardinality(level_ids) = 0)
    or (scope = 'level' and cardinality(level_ids) > 0 and cardinality(cycle_ids) = 0)
  )
);

create index financial_benefit_templates_institution_idx
  on public.financial_benefit_templates(institution_id, is_active);

create table public.student_financial_adjustments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  financial_account_id uuid not null references public.student_financial_accounts(id) on delete restrict,
  financial_item_id uuid not null references public.student_financial_items(id) on delete restrict,
  template_id uuid references public.financial_benefit_templates(id) on delete restrict,
  benefit_type public.financial_benefit_type not null,
  calculation_type public.financial_benefit_calculation not null,
  value numeric(14, 2) not null,
  calculated_amount numeric(14, 2) not null,
  reason text not null,
  external_reference text,
  is_stackable_snapshot boolean not null default true,
  status public.financial_adjustment_status not null default 'active',
  granted_at timestamptz not null default now(),
  granted_by uuid not null references auth.users(id),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id),
  cancellation_reason text,
  constraint student_financial_adjustments_value_check check (
    value > 0
    and calculated_amount > 0
    and (
      calculation_type = 'fixed'
      or (calculation_type = 'percentage' and value <= 100)
    )
  ),
  constraint student_financial_adjustments_cancel_check check (
    (status = 'active' and cancelled_at is null and cancelled_by is null and cancellation_reason is null)
    or (status = 'cancelled' and cancelled_at is not null and cancelled_by is not null and length(trim(cancellation_reason)) > 0)
  )
);

create index student_financial_adjustments_item_idx
  on public.student_financial_adjustments(financial_item_id, status, granted_at);

alter table public.student_financial_items
  add column if not exists adjustment_amount numeric(14, 2) not null default 0,
  add column if not exists net_amount numeric(14, 2);

update public.student_financial_items
set net_amount = amount
where net_amount is null;

alter table public.student_financial_items
  alter column net_amount set not null,
  add constraint student_financial_items_adjustment_check
    check (adjustment_amount >= 0 and net_amount >= 0 and net_amount = amount - adjustment_amount);

create or replace function public.guard_student_financial_installment_snapshot()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'financial_snapshot_is_immutable'; end if;

  if new.financial_account_id <> old.financial_account_id
    or new.financial_item_id is distinct from old.financial_item_id
    or new.payment_plan_installment_id is distinct from old.payment_plan_installment_id
    or new.sequence <> old.sequence
    or new.label_snapshot <> old.label_snapshot
    or new.percentage_snapshot <> old.percentage_snapshot
    or new.due_date <> old.due_date
    or new.created_at <> old.created_at then
    raise exception 'financial_snapshot_is_immutable';
  end if;

  if new.amount <> old.amount
    and coalesce(current_setting('app.financial_adjustment_recalculation', true), 'off') <> 'on' then
    raise exception 'financial_snapshot_is_immutable';
  end if;

  return new;
end;
$$;

create or replace function public.recalculate_financial_item_after_adjustment(
  target_financial_item_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare
  selected_item public.student_financial_items%rowtype;
  selected_account public.student_financial_accounts%rowtype;
  total_adjustments numeric(14, 2);
  item_paid numeric(14, 2);
  remaining_to_allocate numeric(14, 2);
  open_weight numeric(14, 4);
  allocated numeric(14, 2) := 0;
  open_count integer;
  open_index integer := 0;
  installment_record record;
  next_amount numeric(14, 2);
  account_total numeric(14, 2);
  account_paid numeric(14, 2);
begin
  select * into selected_item
  from public.student_financial_items
  where id = target_financial_item_id
  for update;

  if selected_item.id is null then raise exception 'financial_item_not_found'; end if;

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

  select coalesce(sum(paid_amount), 0)
  into item_paid
  from public.student_financial_installments
  where financial_item_id = selected_item.id;

  if selected_item.amount - total_adjustments < item_paid then
    raise exception 'adjustment_below_paid_amount';
  end if;

  update public.student_financial_items
  set adjustment_amount = total_adjustments,
      net_amount = amount - total_adjustments
  where id = selected_item.id;

  remaining_to_allocate := selected_item.amount - total_adjustments - item_paid;

  select coalesce(sum(percentage_snapshot), 0), count(*)
  into open_weight, open_count
  from public.student_financial_installments
  where financial_item_id = selected_item.id
    and amount > paid_amount;

  perform set_config('app.financial_adjustment_recalculation', 'on', true);

  for installment_record in
    select id, paid_amount, percentage_snapshot
    from public.student_financial_installments
    where financial_item_id = selected_item.id
    order by sequence
  loop
    if installment_record.id in (
      select id from public.student_financial_installments
      where financial_item_id = selected_item.id and amount > paid_amount
    ) then
      open_index := open_index + 1;
      if open_index = open_count then
        next_amount := installment_record.paid_amount + (remaining_to_allocate - allocated);
      else
        next_amount := installment_record.paid_amount
          + round(remaining_to_allocate * installment_record.percentage_snapshot / nullif(open_weight, 0), 0);
        allocated := allocated + (next_amount - installment_record.paid_amount);
      end if;
    else
      next_amount := installment_record.paid_amount;
    end if;

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
        when account_paid = account_total then 'settled'::public.financial_account_status
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
language plpgsql security definer set search_path = public as $$
declare
  selected_item public.student_financial_items%rowtype;
  selected_account public.student_financial_accounts%rowtype;
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

  if selected_item.id is null then raise exception 'financial_item_not_found'; end if;

  select * into selected_account
  from public.student_financial_accounts
  where id = selected_item.financial_account_id;

  if not public.has_institution_role(
    selected_item.institution_id,
    array['owner','admin']::public.app_role[]
  ) then raise exception 'permission_denied'; end if;

  if selected_account.status not in ('active', 'draft') then
    raise exception 'financial_account_not_adjustable';
  end if;

  select * into selected_template
  from public.financial_benefit_templates
  where id = target_template_id
    and institution_id = selected_item.institution_id
    and is_active;

  if selected_template.id is null then raise exception 'financial_benefit_template_not_found'; end if;

  if cardinality(selected_template.fee_type_ids) > 0
    and not selected_item.fee_type_id = any(selected_template.fee_type_ids) then
    raise exception 'financial_benefit_not_applicable_to_fee';
  end if;

  effective_value := coalesce(target_value, selected_template.default_value);
  if effective_value <= 0 then raise exception 'positive_financial_benefit_value_required'; end if;
  if selected_template.calculation_type = 'percentage' and effective_value > 100 then
    raise exception 'financial_benefit_percentage_exceeds_100';
  end if;

  select count(*), count(*) filter (where not is_stackable_snapshot)
  into active_adjustments, active_non_stackable
  from public.student_financial_adjustments
  where financial_item_id = selected_item.id
    and status = 'active';

  if active_non_stackable > 0 or (not selected_template.is_stackable and active_adjustments > 0) then
    raise exception 'financial_benefit_not_stackable';
  end if;

  benefit_amount := case selected_template.calculation_type
    when 'percentage' then round(selected_item.amount * effective_value / 100, 0)
    else effective_value
  end;

  benefit_amount := least(benefit_amount, selected_item.amount - selected_item.adjustment_amount);
  if benefit_amount <= 0 then raise exception 'financial_item_already_fully_adjusted'; end if;

  insert into public.student_financial_adjustments (
    institution_id, academic_year_id, financial_account_id, financial_item_id,
    template_id, benefit_type, calculation_type, value, calculated_amount,
    reason, external_reference, is_stackable_snapshot, granted_by
  ) values (
    selected_item.institution_id, selected_item.academic_year_id,
    selected_item.financial_account_id, selected_item.id,
    selected_template.id, selected_template.benefit_type,
    selected_template.calculation_type, effective_value, benefit_amount,
    coalesce(nullif(trim(target_reason), ''), selected_template.name),
    nullif(trim(target_external_reference), ''), selected_template.is_stackable,
    auth.uid()
  ) returning id into adjustment_id;

  perform public.recalculate_financial_item_after_adjustment(selected_item.id);
  return adjustment_id;
end;
$$;

create or replace function public.cancel_student_financial_benefit(
  target_adjustment_id uuid,
  target_reason text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  selected_adjustment public.student_financial_adjustments%rowtype;
begin
  select * into selected_adjustment
  from public.student_financial_adjustments
  where id = target_adjustment_id
  for update;

  if selected_adjustment.id is null then raise exception 'financial_adjustment_not_found'; end if;
  if selected_adjustment.status = 'cancelled' then raise exception 'financial_adjustment_already_cancelled'; end if;
  if length(trim(coalesce(target_reason, ''))) = 0 then raise exception 'cancellation_reason_required'; end if;

  if not public.has_institution_role(
    selected_adjustment.institution_id,
    array['owner','admin']::public.app_role[]
  ) then raise exception 'permission_denied'; end if;

  update public.student_financial_adjustments
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = auth.uid(),
      cancellation_reason = trim(target_reason)
  where id = selected_adjustment.id;

  perform public.recalculate_financial_item_after_adjustment(selected_adjustment.financial_item_id);
end;
$$;

alter table public.financial_benefit_templates enable row level security;
alter table public.student_financial_adjustments enable row level security;

create policy financial_benefit_templates_read
  on public.financial_benefit_templates for select to authenticated
  using (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]));

create policy financial_benefit_templates_manage
  on public.financial_benefit_templates for all to authenticated
  using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
  with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

create policy student_financial_adjustments_read
  on public.student_financial_adjustments for select to authenticated
  using (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]));

revoke all on function public.recalculate_financial_item_after_adjustment(uuid) from public;
revoke all on function public.grant_student_financial_benefit(uuid, uuid, numeric, text, text) from public;
revoke all on function public.cancel_student_financial_benefit(uuid, text) from public;

grant execute on function public.grant_student_financial_benefit(uuid, uuid, numeric, text, text) to authenticated;
grant execute on function public.cancel_student_financial_benefit(uuid, text) to authenticated;

comment on function public.recalculate_financial_item_after_adjustment(uuid)
is 'Recalcule le montant net du frais et répartit le nouveau reste sur les échéances ouvertes sans toucher aux encaissements.';

comment on function public.grant_student_financial_benefit(uuid, uuid, numeric, text, text)
is 'Accorde un avantage financier individuel et recalcule transactionnellement le frais, ses échéances et le dossier.';

comment on function public.cancel_student_financial_benefit(uuid, text)
is 'Annule un avantage financier avec audit puis recalcule le frais, ses échéances et le dossier.';
