-- GeEcole V1 — Frais scolaires, échéanciers, paiements et avantages
-- Baseline consolidée le 2026-07-22.
-- Les marqueurs "Source consolidée" conservent la traçabilité Git.

-- -----------------------------------------------------------------------------
-- Source consolidée : 20260718143000_create_school_fee_schedules.sql
-- -----------------------------------------------------------------------------

create type public.fee_scope as enum ('institution', 'cycle', 'level');

create table public.fee_types (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fee_types_name_not_blank check (length(trim(name)) > 0),
  constraint fee_types_code_not_blank check (length(trim(code)) > 0),
  constraint fee_types_institution_code_key unique (institution_id, code)
);

create table public.fee_schedules (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fee_schedules_institution_year_key unique (institution_id, academic_year_id)
);

create table public.fee_schedule_items (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  fee_schedule_id uuid not null references public.fee_schedules(id) on delete cascade,
  fee_type_id uuid not null references public.fee_types(id) on delete restrict,
  scope public.fee_scope not null,
  amount numeric(14, 2) not null,
  cycle_ids uuid[] not null default '{}',
  level_ids uuid[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fee_schedule_items_amount_positive check (amount >= 0),
  constraint fee_schedule_items_scope_targets check (
    (scope = 'institution' and cardinality(cycle_ids) = 0 and cardinality(level_ids) = 0)
    or (scope = 'cycle' and cardinality(cycle_ids) > 0 and cardinality(level_ids) = 0)
    or (scope = 'level' and cardinality(level_ids) > 0 and cardinality(cycle_ids) = 0)
  )
);

create index fee_types_institution_idx on public.fee_types(institution_id);
create index fee_schedule_items_year_idx on public.fee_schedule_items(academic_year_id);
create index fee_schedule_items_fee_type_idx on public.fee_schedule_items(fee_type_id);
create index fee_schedule_items_cycle_ids_idx on public.fee_schedule_items using gin(cycle_ids);
create index fee_schedule_items_level_ids_idx on public.fee_schedule_items using gin(level_ids);

create or replace function public.validate_fee_schedule_item()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  has_conflict boolean;
begin
  if exists (
    select 1
    from public.fee_schedules schedule
    where schedule.id = new.fee_schedule_id
      and schedule.institution_id = new.institution_id
      and schedule.academic_year_id = new.academic_year_id
  ) is false then
    raise exception 'La grille tarifaire ne correspond pas à l’établissement et à l’année scolaire.';
  end if;

  if exists (
    select 1
    from public.fee_types fee_type
    where fee_type.id = new.fee_type_id
      and fee_type.institution_id = new.institution_id
      and fee_type.archived_at is null
  ) is false then
    raise exception 'Le type de frais ne correspond pas à l’établissement ou est archivé.';
  end if;

  select exists (
    select 1
    from public.fee_schedule_items current_item
    where current_item.id <> coalesce(new.id, gen_random_uuid())
      and current_item.fee_schedule_id = new.fee_schedule_id
      and current_item.fee_type_id = new.fee_type_id
      and current_item.is_active
      and new.is_active
      and (
        current_item.scope = 'institution'
        or new.scope = 'institution'
        or (
          current_item.scope = 'cycle'
          and new.scope = 'cycle'
          and current_item.cycle_ids && new.cycle_ids
        )
        or (
          current_item.scope = 'level'
          and new.scope = 'level'
          and current_item.level_ids && new.level_ids
        )
      )
  ) into has_conflict;

  if has_conflict then
    raise exception 'Un tarif actif existe déjà pour ce type de frais et cette cible.';
  end if;

  return new;
end;
$$;

create trigger validate_fee_schedule_item_before_write
before insert or update on public.fee_schedule_items
for each row execute function public.validate_fee_schedule_item();

create or replace function public.duplicate_fee_schedule(
  target_institution_id uuid,
  source_academic_year_id uuid,
  target_academic_year_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_schedule_id uuid;
begin
  if source_academic_year_id = target_academic_year_id then
    raise exception 'Les années source et cible doivent être différentes.';
  end if;

  insert into public.fee_schedules (institution_id, academic_year_id)
  values (target_institution_id, target_academic_year_id)
  on conflict (institution_id, academic_year_id)
  do update set updated_at = now()
  returning id into target_schedule_id;

  if exists (
    select 1 from public.fee_schedule_items
    where institution_id = target_institution_id
      and academic_year_id = target_academic_year_id
  ) then
    raise exception 'La grille cible contient déjà des tarifs.';
  end if;

  insert into public.fee_schedule_items (
    institution_id,
    academic_year_id,
    fee_schedule_id,
    fee_type_id,
    scope,
    amount,
    cycle_ids,
    level_ids,
    is_active
  )
  select
    target_institution_id,
    target_academic_year_id,
    target_schedule_id,
    item.fee_type_id,
    item.scope,
    item.amount,
    '{}',
    '{}',
    item.is_active
  from public.fee_schedule_items item
  where item.institution_id = target_institution_id
    and item.academic_year_id = source_academic_year_id
    and item.scope = 'institution';

  return target_schedule_id;
end;
$$;

alter table public.fee_types enable row level security;
alter table public.fee_schedules enable row level security;
alter table public.fee_schedule_items enable row level security;

create policy fee_types_select_member
on public.fee_types for select to authenticated
using (public.is_active_member(institution_id));

create policy fee_types_manage_finance
on public.fee_types for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin','finance']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin','finance']::public.app_role[]));

create policy fee_schedules_select_member
on public.fee_schedules for select to authenticated
using (public.is_active_member(institution_id));

create policy fee_schedules_manage_finance
on public.fee_schedules for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin','finance']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin','finance']::public.app_role[]));

create policy fee_schedule_items_select_member
on public.fee_schedule_items for select to authenticated
using (public.is_active_member(institution_id));

create policy fee_schedule_items_manage_finance
on public.fee_schedule_items for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin','finance']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin','finance']::public.app_role[]));

comment on table public.fee_types is 'Catalogue permanent des types de frais d’un établissement.';
comment on table public.fee_schedules is 'Grille tarifaire unique d’un établissement pour une année scolaire.';
comment on table public.fee_schedule_items is 'Tarifs annuels ciblant l’établissement, des cycles ou des niveaux.';


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260718152000_grant_school_fee_privileges.sql
-- -----------------------------------------------------------------------------

-- PostgreSQL checks object privileges before evaluating row-level security policies.
-- The authenticated role therefore needs explicit CRUD privileges on the
-- school-fee tables introduced by Lot 1.

grant select, insert, update, delete
on table public.fee_types
 to authenticated;

grant select, insert, update, delete
on table public.fee_schedules
 to authenticated;

grant select, insert, update, delete
on table public.fee_schedule_items
 to authenticated;

-- The application invokes this RPC through Supabase.
grant execute on function public.duplicate_fee_schedule(uuid, uuid, uuid)
 to authenticated;

-- Keep anonymous users explicitly excluded from this administrative module.
revoke all on table public.fee_types from anon;
revoke all on table public.fee_schedules from anon;
revoke all on table public.fee_schedule_items from anon;
revoke execute on function public.duplicate_fee_schedule(uuid, uuid, uuid) from anon;


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260718170000_create_payment_plans.sql
-- -----------------------------------------------------------------------------

create type public.payment_plan_kind as enum ('cash', 'installments', 'monthly', 'custom');

create table public.payment_plans (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  name text not null,
  code text not null,
  kind public.payment_plan_kind not null,
  fee_type_ids uuid[] not null default '{}',
  scope public.fee_scope not null default 'institution',
  cycle_ids uuid[] not null default '{}',
  level_ids uuid[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_plans_name_not_blank check (length(trim(name)) > 0),
  constraint payment_plans_code_not_blank check (length(trim(code)) > 0),
  constraint payment_plans_fee_types_required check (cardinality(fee_type_ids) > 0),
  constraint payment_plans_scope_targets check (
    (scope = 'institution' and cardinality(cycle_ids) = 0 and cardinality(level_ids) = 0)
    or (scope = 'cycle' and cardinality(cycle_ids) > 0 and cardinality(level_ids) = 0)
    or (scope = 'level' and cardinality(level_ids) > 0 and cardinality(cycle_ids) = 0)
  ),
  constraint payment_plans_institution_year_code_key unique (institution_id, academic_year_id, code)
);

create table public.payment_plan_installments (
  id uuid primary key default gen_random_uuid(),
  payment_plan_id uuid not null references public.payment_plans(id) on delete cascade,
  sequence integer not null,
  label text not null,
  percentage numeric(5, 2) not null,
  due_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_plan_installments_sequence_positive check (sequence > 0),
  constraint payment_plan_installments_label_not_blank check (length(trim(label)) > 0),
  constraint payment_plan_installments_percentage_range check (percentage > 0 and percentage <= 100),
  constraint payment_plan_installments_plan_sequence_key unique (payment_plan_id, sequence)
);

create index payment_plans_institution_year_idx on public.payment_plans(institution_id, academic_year_id);
create index payment_plans_fee_type_ids_idx on public.payment_plans using gin(fee_type_ids);
create index payment_plans_cycle_ids_idx on public.payment_plans using gin(cycle_ids);
create index payment_plans_level_ids_idx on public.payment_plans using gin(level_ids);
create index payment_plan_installments_plan_idx on public.payment_plan_installments(payment_plan_id, sequence);

alter table public.payment_plans enable row level security;
alter table public.payment_plan_installments enable row level security;

create policy payment_plans_select_member
on public.payment_plans for select to authenticated
using (public.is_active_member(institution_id));

create policy payment_plans_manage_finance
on public.payment_plans for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin','finance']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin','finance']::public.app_role[]));

create policy payment_plan_installments_select_member
on public.payment_plan_installments for select to authenticated
using (
  exists (
    select 1
    from public.payment_plans plan
    where plan.id = payment_plan_installments.payment_plan_id
      and public.is_active_member(plan.institution_id)
  )
);

create policy payment_plan_installments_manage_finance
on public.payment_plan_installments for all to authenticated
using (
  exists (
    select 1
    from public.payment_plans plan
    where plan.id = payment_plan_installments.payment_plan_id
      and public.has_institution_role(plan.institution_id, array['owner','admin','finance']::public.app_role[])
  )
)
with check (
  exists (
    select 1
    from public.payment_plans plan
    where plan.id = payment_plan_installments.payment_plan_id
      and public.has_institution_role(plan.institution_id, array['owner','admin','finance']::public.app_role[])
  )
);

comment on table public.payment_plans is 'Modèles annuels de répartition des frais scolaires.';
comment on table public.payment_plan_installments is 'Échéances en pourcentage associées à un plan de paiement.';


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260718171000_grant_payment_plan_privileges.sql
-- -----------------------------------------------------------------------------

grant select, insert, update, delete
on table public.payment_plans
 to authenticated;

grant select, insert, update, delete
on table public.payment_plan_installments
 to authenticated;

revoke all on table public.payment_plans from anon;
revoke all on table public.payment_plan_installments from anon;


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260718190000_create_student_financial_accounts.sql
-- -----------------------------------------------------------------------------

create type public.financial_account_status as enum ('draft', 'active', 'settled', 'cancelled');
create type public.financial_item_origin as enum ('fee_schedule', 'manual_adjustment');

create table public.student_financial_accounts (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  payment_plan_id uuid references public.payment_plans(id) on delete restrict,
  status public.financial_account_status not null default 'draft',
  currency_code text not null default 'GNF',
  total_amount numeric(14, 2) not null default 0,
  paid_amount numeric(14, 2) not null default 0,
  balance_amount numeric(14, 2) generated always as (total_amount - paid_amount) stored,
  student_name_snapshot text not null,
  matricule_snapshot text not null,
  level_name_snapshot text not null,
  cycle_name_snapshot text not null,
  payment_plan_name_snapshot text,
  generated_at timestamptz,
  generated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_amount >= 0 and paid_amount >= 0 and paid_amount <= total_amount),
  unique (enrollment_id),
  unique (institution_id, academic_year_id, student_id)
);

create table public.student_financial_items (
  id uuid primary key default gen_random_uuid(),
  financial_account_id uuid not null references public.student_financial_accounts(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  fee_type_id uuid references public.fee_types(id) on delete restrict,
  fee_schedule_item_id uuid references public.fee_schedule_items(id) on delete restrict,
  origin public.financial_item_origin not null default 'fee_schedule',
  code_snapshot text not null,
  label_snapshot text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create table public.student_financial_installments (
  id uuid primary key default gen_random_uuid(),
  financial_account_id uuid not null references public.student_financial_accounts(id) on delete cascade,
  payment_plan_installment_id uuid references public.payment_plan_installments(id) on delete restrict,
  sequence integer not null check (sequence > 0),
  label_snapshot text not null,
  percentage_snapshot numeric(5, 2) not null check (percentage_snapshot > 0 and percentage_snapshot <= 100),
  due_date date not null,
  amount numeric(14, 2) not null check (amount >= 0),
  paid_amount numeric(14, 2) not null default 0,
  balance_amount numeric(14, 2) generated always as (amount - paid_amount) stored,
  created_at timestamptz not null default now(),
  check (paid_amount >= 0 and paid_amount <= amount),
  unique (financial_account_id, sequence)
);

create index student_financial_accounts_year_status_idx on public.student_financial_accounts(institution_id, academic_year_id, status);
create index student_financial_accounts_student_idx on public.student_financial_accounts(student_id, academic_year_id);
create index student_financial_items_account_idx on public.student_financial_items(financial_account_id);
create index student_financial_installments_account_due_idx on public.student_financial_installments(financial_account_id, due_date);

create trigger student_financial_accounts_set_updated_at before update on public.student_financial_accounts
for each row execute function public.set_updated_at();

create or replace function public.protect_financial_snapshot()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'financial_snapshot_is_immutable';
end;
$$;

create trigger protect_student_financial_items_snapshot before update or delete on public.student_financial_items
for each row execute function public.protect_financial_snapshot();
create trigger protect_student_financial_installments_snapshot before update or delete on public.student_financial_installments
for each row execute function public.protect_financial_snapshot();

alter table public.student_financial_accounts enable row level security;
alter table public.student_financial_items enable row level security;
alter table public.student_financial_installments enable row level security;

create policy student_financial_accounts_select_member on public.student_financial_accounts for select to authenticated
using (public.is_active_member(institution_id));
create policy student_financial_accounts_manage_authorized on public.student_financial_accounts for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]));

create policy student_financial_items_select_member on public.student_financial_items for select to authenticated
using (public.is_active_member(institution_id));
create policy student_financial_items_insert_authorized on public.student_financial_items for insert to authenticated
with check (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]));

create policy student_financial_installments_select_member on public.student_financial_installments for select to authenticated
using (exists (
  select 1 from public.student_financial_accounts account
  where account.id = financial_account_id and public.is_active_member(account.institution_id)
));
create policy student_financial_installments_insert_authorized on public.student_financial_installments for insert to authenticated
with check (exists (
  select 1 from public.student_financial_accounts account
  where account.id = financial_account_id
    and public.has_institution_role(account.institution_id, array['owner','admin','secretary']::public.app_role[])
));

grant select, insert, update on public.student_financial_accounts to authenticated;
grant select, insert on public.student_financial_items, public.student_financial_installments to authenticated;
revoke all on public.student_financial_accounts, public.student_financial_items, public.student_financial_installments from anon;

comment on table public.student_financial_accounts is 'Dossier financier annuel et figé d’un élève, créé depuis une inscription.';
comment on table public.student_financial_items is 'Frais figés composant un dossier financier annuel.';
comment on table public.student_financial_installments is 'Échéancier monétaire figé d’un dossier financier annuel.';


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260718193000_generate_student_financial_account.sql
-- -----------------------------------------------------------------------------

create or replace function public.guard_student_financial_installment_snapshot()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'financial_snapshot_is_immutable'; end if;
  if new.financial_account_id <> old.financial_account_id
    or new.payment_plan_installment_id is distinct from old.payment_plan_installment_id
    or new.sequence <> old.sequence
    or new.label_snapshot <> old.label_snapshot
    or new.percentage_snapshot <> old.percentage_snapshot
    or new.due_date <> old.due_date
    or new.amount <> old.amount
    or new.created_at <> old.created_at then
    raise exception 'financial_snapshot_is_immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_student_financial_installments_snapshot on public.student_financial_installments;
create trigger protect_student_financial_installments_snapshot
before update or delete on public.student_financial_installments
for each row execute function public.guard_student_financial_installment_snapshot();

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
  select * into selected_enrollment from public.enrollments where id = target_enrollment_id;
  if selected_enrollment.id is null then raise exception 'enrollment_not_found'; end if;

  if not public.has_institution_role(
    selected_enrollment.institution_id,
    array['owner','admin','secretary']::public.app_role[]
  ) then raise exception 'permission_denied'; end if;

  if selected_enrollment.status <> 'confirmed' then raise exception 'confirmed_enrollment_required'; end if;

  select id into existing_account_id
  from public.student_financial_accounts
  where enrollment_id = selected_enrollment.id;
  if existing_account_id is not null then return existing_account_id; end if;

  select * into selected_student
  from public.students
  where id = selected_enrollment.student_id
    and institution_id = selected_enrollment.institution_id;
  if selected_student.id is null then raise exception 'student_not_found'; end if;

  select * into selected_level
  from public.academic_year_levels
  where id = selected_enrollment.academic_year_level_id
    and institution_id = selected_enrollment.institution_id
    and academic_year_id = selected_enrollment.academic_year_id;
  if selected_level.id is null then raise exception 'annual_level_not_found'; end if;

  select * into selected_plan
  from public.payment_plans
  where id = target_payment_plan_id
    and institution_id = selected_enrollment.institution_id
    and academic_year_id = selected_enrollment.academic_year_id
    and is_active;
  if selected_plan.id is null then raise exception 'active_payment_plan_not_found'; end if;

  if not (
    selected_plan.scope = 'institution'
    or (selected_plan.scope = 'cycle' and selected_level.academic_year_cycle_id = any(selected_plan.cycle_ids))
    or (selected_plan.scope = 'level' and selected_level.id = any(selected_plan.level_ids))
  ) then raise exception 'payment_plan_not_applicable_to_level'; end if;

  select coalesce(sum(resolved.amount), 0) into total_fees
  from (
    select distinct on (item.fee_type_id) item.fee_type_id, item.amount
    from public.fee_schedule_items item
    where item.institution_id = selected_enrollment.institution_id
      and item.academic_year_id = selected_enrollment.academic_year_id
      and item.is_active
      and (
        item.scope = 'institution'
        or (item.scope = 'cycle' and selected_level.academic_year_cycle_id = any(item.cycle_ids))
        or (item.scope = 'level' and selected_level.id = any(item.level_ids))
      )
    order by item.fee_type_id,
      case item.scope when 'level' then 1 when 'cycle' then 2 else 3 end,
      item.created_at desc
  ) resolved;
  if total_fees <= 0 then raise exception 'no_applicable_fees'; end if;

  if exists (
    select 1
    from (
      select distinct on (item.fee_type_id) item.fee_type_id
      from public.fee_schedule_items item
      where item.institution_id = selected_enrollment.institution_id
        and item.academic_year_id = selected_enrollment.academic_year_id
        and item.is_active
        and (
          item.scope = 'institution'
          or (item.scope = 'cycle' and selected_level.academic_year_cycle_id = any(item.cycle_ids))
          or (item.scope = 'level' and selected_level.id = any(item.level_ids))
        )
      order by item.fee_type_id,
        case item.scope when 'level' then 1 when 'cycle' then 2 else 3 end,
        item.created_at desc
    ) resolved
    where not (resolved.fee_type_id = any(selected_plan.fee_type_ids))
  ) then raise exception 'payment_plan_does_not_cover_all_fees'; end if;

  select coalesce(sum(percentage), 0), count(*)
  into installment_total, installment_count
  from public.payment_plan_installments
  where payment_plan_id = selected_plan.id;
  if installment_count = 0 or abs(installment_total - 100) > 0.001 then
    raise exception 'invalid_payment_plan_installments';
  end if;

  insert into public.student_financial_accounts (
    institution_id, academic_year_id, enrollment_id, student_id, payment_plan_id,
    status, currency_code, total_amount, paid_amount, student_name_snapshot,
    matricule_snapshot, level_name_snapshot, cycle_name_snapshot,
    payment_plan_name_snapshot, generated_at, generated_by
  ) values (
    selected_enrollment.institution_id, selected_enrollment.academic_year_id,
    selected_enrollment.id, selected_enrollment.student_id, selected_plan.id,
    'active', 'GNF', total_fees, 0,
    trim(selected_student.first_name || ' ' || selected_student.last_name),
    selected_student.matricule, selected_enrollment.level_name_snapshot,
    selected_enrollment.cycle_name_snapshot, selected_plan.name, now(), auth.uid()
  ) returning id into new_account_id;

  for fee_record in
    select distinct on (item.fee_type_id)
      item.id, item.fee_type_id, item.amount, fee_type.code, fee_type.name
    from public.fee_schedule_items item
    join public.fee_types fee_type on fee_type.id = item.fee_type_id
    where item.institution_id = selected_enrollment.institution_id
      and item.academic_year_id = selected_enrollment.academic_year_id
      and item.is_active
      and (
        item.scope = 'institution'
        or (item.scope = 'cycle' and selected_level.academic_year_cycle_id = any(item.cycle_ids))
        or (item.scope = 'level' and selected_level.id = any(item.level_ids))
      )
    order by item.fee_type_id,
      case item.scope when 'level' then 1 when 'cycle' then 2 else 3 end,
      item.created_at desc
  loop
    insert into public.student_financial_items (
      financial_account_id, institution_id, academic_year_id, fee_type_id,
      fee_schedule_item_id, origin, code_snapshot, label_snapshot, amount
    ) values (
      new_account_id, selected_enrollment.institution_id,
      selected_enrollment.academic_year_id, fee_record.fee_type_id,
      fee_record.id, 'fee_schedule', fee_record.code, fee_record.name, fee_record.amount
    );
  end loop;

  for installment_record in
    select * from public.payment_plan_installments
    where payment_plan_id = selected_plan.id order by sequence
  loop
    current_installment := current_installment + 1;
    if current_installment = installment_count then
      current_amount := total_fees - allocated_amount;
    else
      current_amount := round(total_fees * installment_record.percentage / 100, 0);
      allocated_amount := allocated_amount + current_amount;
    end if;

    insert into public.student_financial_installments (
      financial_account_id, payment_plan_installment_id, sequence,
      label_snapshot, percentage_snapshot, due_date, amount, paid_amount
    ) values (
      new_account_id, installment_record.id, installment_record.sequence,
      installment_record.label, installment_record.percentage,
      installment_record.due_date, current_amount, 0
    );
  end loop;

  return new_account_id;
end;
$$;

revoke all on function public.generate_student_financial_account(uuid, uuid) from public;
grant execute on function public.generate_student_financial_account(uuid, uuid) to authenticated;

comment on function public.generate_student_financial_account(uuid, uuid)
is 'Génère de manière idempotente le dossier financier figé d’une inscription confirmée.';


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260718194500_create_financial_payments.sql
-- -----------------------------------------------------------------------------

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
      status = case
        when paid_amount + target_amount = total_amount
          then 'settled'::public.financial_account_status
        else 'active'::public.financial_account_status
      end
  where id = selected_account.id;

  return payment_id;
end;
$$;

revoke all on function public.register_financial_payment(uuid, numeric, public.payment_method, date, text, text) from public;
grant execute on function public.register_financial_payment(uuid, numeric, public.payment_method, date, text, text) to authenticated;

comment on table public.financial_payments is 'Encaissements immuables enregistrés sur les dossiers financiers.';
comment on table public.financial_payment_allocations is 'Ventilation d’un encaissement sur les échéances ouvertes les plus anciennes.';


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260718200000_cancel_financial_payment.sql
-- -----------------------------------------------------------------------------

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
      status = 'active'::public.financial_account_status
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


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260718203000_auto_resolve_fee_payment_plans.sql
-- -----------------------------------------------------------------------------

alter table public.student_financial_items
  add column if not exists payment_plan_id uuid references public.payment_plans(id) on delete restrict,
  add column if not exists payment_plan_name_snapshot text;

alter table public.student_financial_installments
  add column if not exists financial_item_id uuid references public.student_financial_items(id) on delete restrict;

create index if not exists student_financial_installments_item_idx
  on public.student_financial_installments(financial_item_id, due_date);

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
    or new.amount <> old.amount
    or new.created_at <> old.created_at then
    raise exception 'financial_snapshot_is_immutable';
  end if;
  return new;
end;
$$;

drop function if exists public.generate_student_financial_account(uuid, uuid);

create or replace function public.generate_student_financial_account(
  target_enrollment_id uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  selected_enrollment public.enrollments%rowtype;
  selected_student public.students%rowtype;
  selected_level public.academic_year_levels%rowtype;
  existing_account_id uuid;
  new_account_id uuid;
  new_item_id uuid;
  total_fees numeric(14, 2);
  fee_record record;
  selected_plan record;
  installment_record record;
  installment_total numeric(8, 2);
  installment_count integer;
  installment_index integer;
  global_sequence integer := 0;
  allocated_amount numeric(14, 2);
  current_amount numeric(14, 2);
  best_priority integer;
  candidate_count integer;
begin
  select * into selected_enrollment
  from public.enrollments
  where id = target_enrollment_id;

  if selected_enrollment.id is null then raise exception 'enrollment_not_found'; end if;

  if not public.has_institution_role(
    selected_enrollment.institution_id,
    array['owner','admin','secretary']::public.app_role[]
  ) then raise exception 'permission_denied'; end if;

  if selected_enrollment.status <> 'confirmed' then
    raise exception 'confirmed_enrollment_required';
  end if;

  select id into existing_account_id
  from public.student_financial_accounts
  where enrollment_id = selected_enrollment.id;

  if existing_account_id is not null then return existing_account_id; end if;

  select * into selected_student
  from public.students
  where id = selected_enrollment.student_id
    and institution_id = selected_enrollment.institution_id;

  if selected_student.id is null then raise exception 'student_not_found'; end if;

  select * into selected_level
  from public.academic_year_levels
  where id = selected_enrollment.academic_year_level_id
    and institution_id = selected_enrollment.institution_id
    and academic_year_id = selected_enrollment.academic_year_id;

  if selected_level.id is null then raise exception 'annual_level_not_found'; end if;

  select coalesce(sum(resolved.amount), 0) into total_fees
  from (
    select distinct on (item.fee_type_id)
      item.fee_type_id,
      item.amount
    from public.fee_schedule_items item
    where item.institution_id = selected_enrollment.institution_id
      and item.academic_year_id = selected_enrollment.academic_year_id
      and item.is_active
      and (
        item.scope = 'institution'
        or (item.scope = 'cycle' and selected_level.academic_year_cycle_id = any(item.cycle_ids))
        or (item.scope = 'level' and selected_level.id = any(item.level_ids))
      )
    order by item.fee_type_id,
      case item.scope when 'level' then 1 when 'cycle' then 2 else 3 end,
      item.created_at desc
  ) resolved;

  if total_fees <= 0 then raise exception 'no_applicable_fees'; end if;

  insert into public.student_financial_accounts (
    institution_id, academic_year_id, enrollment_id, student_id,
    payment_plan_id, status, currency_code, total_amount, paid_amount,
    student_name_snapshot, matricule_snapshot, level_name_snapshot,
    cycle_name_snapshot, payment_plan_name_snapshot, generated_at, generated_by
  ) values (
    selected_enrollment.institution_id,
    selected_enrollment.academic_year_id,
    selected_enrollment.id,
    selected_enrollment.student_id,
    null,
    'active'::public.financial_account_status,
    'GNF',
    total_fees,
    0,
    trim(selected_student.first_name || ' ' || selected_student.last_name),
    selected_student.matricule,
    selected_enrollment.level_name_snapshot,
    selected_enrollment.cycle_name_snapshot,
    null,
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
      and (
        item.scope = 'institution'
        or (item.scope = 'cycle' and selected_level.academic_year_cycle_id = any(item.cycle_ids))
        or (item.scope = 'level' and selected_level.id = any(item.level_ids))
      )
    order by item.fee_type_id,
      case item.scope when 'level' then 1 when 'cycle' then 2 else 3 end,
      item.created_at desc
  loop
    select min(case plan.scope when 'level' then 1 when 'cycle' then 2 else 3 end)
    into best_priority
    from public.payment_plans plan
    where plan.institution_id = selected_enrollment.institution_id
      and plan.academic_year_id = selected_enrollment.academic_year_id
      and plan.is_active
      and fee_record.fee_type_id = any(plan.fee_type_ids)
      and (
        plan.scope = 'institution'
        or (plan.scope = 'cycle' and selected_level.academic_year_cycle_id = any(plan.cycle_ids))
        or (plan.scope = 'level' and selected_level.id = any(plan.level_ids))
      );

    if best_priority is null then
      raise exception 'missing_payment_plan_for_fee_type:%', fee_record.name;
    end if;

    select count(*) into candidate_count
    from public.payment_plans plan
    where plan.institution_id = selected_enrollment.institution_id
      and plan.academic_year_id = selected_enrollment.academic_year_id
      and plan.is_active
      and fee_record.fee_type_id = any(plan.fee_type_ids)
      and case plan.scope when 'level' then 1 when 'cycle' then 2 else 3 end = best_priority
      and (
        plan.scope = 'institution'
        or (plan.scope = 'cycle' and selected_level.academic_year_cycle_id = any(plan.cycle_ids))
        or (plan.scope = 'level' and selected_level.id = any(plan.level_ids))
      );

    if candidate_count > 1 then
      raise exception 'duplicate_payment_plan_for_fee_type:%', fee_record.name;
    end if;

    select plan.* into selected_plan
    from public.payment_plans plan
    where plan.institution_id = selected_enrollment.institution_id
      and plan.academic_year_id = selected_enrollment.academic_year_id
      and plan.is_active
      and fee_record.fee_type_id = any(plan.fee_type_ids)
      and case plan.scope when 'level' then 1 when 'cycle' then 2 else 3 end = best_priority
      and (
        plan.scope = 'institution'
        or (plan.scope = 'cycle' and selected_level.academic_year_cycle_id = any(plan.cycle_ids))
        or (plan.scope = 'level' and selected_level.id = any(plan.level_ids))
      )
    limit 1;

    select coalesce(sum(percentage), 0), count(*)
    into installment_total, installment_count
    from public.payment_plan_installments
    where payment_plan_id = selected_plan.id;

    if installment_count = 0 or abs(installment_total - 100) > 0.001 then
      raise exception 'invalid_payment_plan_installments:%', selected_plan.name;
    end if;

    insert into public.student_financial_items (
      financial_account_id, institution_id, academic_year_id, fee_type_id,
      fee_schedule_item_id, payment_plan_id, payment_plan_name_snapshot,
      origin, code_snapshot, label_snapshot, amount
    ) values (
      new_account_id,
      selected_enrollment.institution_id,
      selected_enrollment.academic_year_id,
      fee_record.fee_type_id,
      fee_record.id,
      selected_plan.id,
      selected_plan.name,
      'fee_schedule',
      fee_record.code,
      fee_record.name,
      fee_record.amount
    ) returning id into new_item_id;

    installment_index := 0;
    allocated_amount := 0;

    for installment_record in
      select *
      from public.payment_plan_installments
      where payment_plan_id = selected_plan.id
      order by sequence
    loop
      installment_index := installment_index + 1;
      global_sequence := global_sequence + 1;

      if installment_index = installment_count then
        current_amount := fee_record.amount - allocated_amount;
      else
        current_amount := round(fee_record.amount * installment_record.percentage / 100, 0);
        allocated_amount := allocated_amount + current_amount;
      end if;

      insert into public.student_financial_installments (
        financial_account_id, financial_item_id, payment_plan_installment_id,
        sequence, label_snapshot, percentage_snapshot, due_date,
        amount, paid_amount
      ) values (
        new_account_id,
        new_item_id,
        installment_record.id,
        global_sequence,
        fee_record.name || ' — ' || installment_record.label,
        installment_record.percentage,
        installment_record.due_date,
        current_amount,
        0
      );
    end loop;
  end loop;

  return new_account_id;
end;
$$;

revoke all on function public.generate_student_financial_account(uuid) from public;
grant execute on function public.generate_student_financial_account(uuid) to authenticated;

comment on function public.generate_student_financial_account(uuid)
is 'Génère automatiquement un dossier financier en résolvant les frais et le plan de chaque frais selon niveau, cycle puis établissement.';


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260718213000_register_targeted_financial_payment.sql
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260718215900_prepare_financial_benefit_backfill.sql
-- -----------------------------------------------------------------------------

-- Les lignes de frais sont des snapshots immuables en exploitation.
-- Le backfill technique du Lot 5 doit toutefois initialiser net_amount sur les lignes existantes.
-- On suspend donc uniquement les triggers utilisateur pendant la migration de structure.
alter table public.student_financial_items disable trigger user;


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260718220000_create_financial_benefits.sql
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260718220100_restore_financial_item_triggers.sql
-- -----------------------------------------------------------------------------

-- Réactive les protections d'immutabilité immédiatement après le backfill du Lot 5.
alter table public.student_financial_items enable trigger user;


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260718233000_harden_financial_benefit_rules.sql
-- -----------------------------------------------------------------------------

create or replace function public.validate_student_financial_adjustment_scope()
returns trigger
language plpgsql
set search_path = public as $$
declare
  selected_template public.financial_benefit_templates%rowtype;
  selected_account public.student_financial_accounts%rowtype;
  selected_enrollment public.enrollments%rowtype;
  selected_level public.academic_year_levels%rowtype;
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

  select * into selected_level
  from public.academic_year_levels
  where id = selected_enrollment.academic_year_level_id;

  if selected_template.scope = 'cycle'
    and not selected_level.academic_year_cycle_id = any(selected_template.cycle_ids) then
    raise exception 'financial_benefit_not_applicable_to_cycle';
  end if;

  if selected_template.scope = 'level'
    and not selected_level.id = any(selected_template.level_ids) then
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

comment on function public.validate_student_financial_adjustment_scope()
is 'Valide la portée cycle/niveau et empêche la double attribution active du même modèle sur un frais.';


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260718234000_grant_financial_benefit_privileges.sql
-- -----------------------------------------------------------------------------

grant select, insert, update on table public.financial_benefit_templates to authenticated;
grant select on table public.student_financial_adjustments to authenticated;

comment on table public.student_financial_adjustments is
'Ajustements financiers individuels. Les écritures passent par les RPC métier ; authenticated dispose uniquement de SELECT direct pour les vues et historiques.';


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260718235000_fix_financial_benefit_recalculation.sql
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260718235500_fix_financial_generation_and_bulk_reapply.sql
-- -----------------------------------------------------------------------------

do $$
declare
  function_oid oid;
  function_definition text;
begin
  select p.oid
  into function_oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'generate_student_financial_account'
  order by p.oid
  limit 1;

  if function_oid is null then
    raise exception 'generate_student_financial_account_not_found';
  end if;

  function_definition := pg_get_functiondef(function_oid);

  if position('selected_enrollment.academic_year_cycle_id' in function_definition) > 0 then
    function_definition := replace(
      function_definition,
      'selected_enrollment.academic_year_cycle_id',
      '(select ayl.academic_year_cycle_id from public.academic_year_levels ayl where ayl.id = selected_enrollment.academic_year_level_id)'
    );
    execute function_definition;
  end if;
end
$$;

create or replace function public.reapply_all_student_financial_accounts(
  target_institution_id uuid,
  target_academic_year_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  enrollment_record record;
  existing_account record;
  generated_count integer := 0;
  regenerated_count integer := 0;
  skipped_paid_count integer := 0;
  failed_count integer := 0;
begin
  if not public.has_institution_role(
    target_institution_id,
    array['owner','admin']::public.app_role[]
  ) then
    raise exception 'permission_denied';
  end if;

  for enrollment_record in
    select e.id
    from public.enrollments e
    where e.institution_id = target_institution_id
      and e.academic_year_id = target_academic_year_id
      and e.status = 'confirmed'
    order by e.created_at
  loop
    begin
      existing_account := null;

      select a.id, a.paid_amount
      into existing_account
      from public.student_financial_accounts a
      where a.enrollment_id = enrollment_record.id
      limit 1;

      if existing_account.id is null then
        perform public.generate_student_financial_account(enrollment_record.id);
        generated_count := generated_count + 1;
      elsif coalesce(existing_account.paid_amount, 0) > 0 then
        skipped_paid_count := skipped_paid_count + 1;
      else
        delete from public.student_financial_installments where financial_account_id = existing_account.id;
        delete from public.student_financial_adjustments where financial_account_id = existing_account.id;
        delete from public.student_financial_items where financial_account_id = existing_account.id;
        delete from public.student_financial_accounts where id = existing_account.id;
        perform public.generate_student_financial_account(enrollment_record.id);
        regenerated_count := regenerated_count + 1;
      end if;
    exception when others then
      failed_count := failed_count + 1;
    end;
  end loop;

  return jsonb_build_object(
    'generated', generated_count,
    'regenerated', regenerated_count,
    'skippedPaid', skipped_paid_count,
    'failed', failed_count
  );
end;
$$;

grant execute on function public.reapply_all_student_financial_accounts(uuid, uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260718235900_add_detailed_financial_generation_errors.sql
-- -----------------------------------------------------------------------------

create or replace function public.reapply_all_student_financial_accounts(
  target_institution_id uuid,
  target_academic_year_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  enrollment_record record;
  existing_account record;
  generated_count integer := 0;
  regenerated_count integer := 0;
  skipped_paid_count integer := 0;
  failed_count integer := 0;
  error_list jsonb := '[]'::jsonb;
  error_message text;
  error_detail text;
  error_hint text;
  error_context text;
  error_sqlstate text;
begin
  if not public.has_institution_role(
    target_institution_id,
    array['owner','admin']::public.app_role[]
  ) then
    raise exception 'permission_denied';
  end if;

  for enrollment_record in
    select
      e.id,
      e.student_id,
      e.level_name_snapshot,
      e.cycle_name_snapshot,
      concat_ws(' ', s.first_name, s.last_name) as student_name,
      s.matricule
    from public.enrollments e
    join public.students s on s.id = e.student_id
    where e.institution_id = target_institution_id
      and e.academic_year_id = target_academic_year_id
      and e.status = 'confirmed'
    order by e.created_at
  loop
    begin
      existing_account := null;

      select a.id, a.paid_amount
      into existing_account
      from public.student_financial_accounts a
      where a.enrollment_id = enrollment_record.id
      limit 1;

      if existing_account.id is null then
        perform public.generate_student_financial_account(enrollment_record.id);
        generated_count := generated_count + 1;
      elsif coalesce(existing_account.paid_amount, 0) > 0 then
        skipped_paid_count := skipped_paid_count + 1;
      else
        delete from public.student_financial_installments where financial_account_id = existing_account.id;
        delete from public.student_financial_adjustments where financial_account_id = existing_account.id;
        delete from public.student_financial_items where financial_account_id = existing_account.id;
        delete from public.student_financial_accounts where id = existing_account.id;
        perform public.generate_student_financial_account(enrollment_record.id);
        regenerated_count := regenerated_count + 1;
      end if;
    exception when others then
      get stacked diagnostics
        error_message = message_text,
        error_detail = pg_exception_detail,
        error_hint = pg_exception_hint,
        error_context = pg_exception_context,
        error_sqlstate = returned_sqlstate;

      failed_count := failed_count + 1;
      error_list := error_list || jsonb_build_array(jsonb_build_object(
        'enrollmentId', enrollment_record.id,
        'studentId', enrollment_record.student_id,
        'studentName', enrollment_record.student_name,
        'matricule', enrollment_record.matricule,
        'levelName', enrollment_record.level_name_snapshot,
        'cycleName', enrollment_record.cycle_name_snapshot,
        'code', error_sqlstate,
        'message', error_message,
        'detail', nullif(error_detail, ''),
        'hint', nullif(error_hint, ''),
        'context', nullif(error_context, '')
      ));
    end;
  end loop;

  return jsonb_build_object(
    'generated', generated_count,
    'regenerated', regenerated_count,
    'skippedPaid', skipped_paid_count,
    'failed', failed_count,
    'errors', error_list
  );
end;
$$;

grant execute on function public.reapply_all_student_financial_accounts(uuid, uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260719000500_initialize_financial_item_net_amount.sql
-- -----------------------------------------------------------------------------

-- Garantit que tout frais financier créé après l'ajout des avantages possède
-- immédiatement un montant net cohérent avec son montant initial.

create or replace function public.initialize_student_financial_item_amounts()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.adjustment_amount := coalesce(new.adjustment_amount, 0);

  if new.net_amount is null then
    new.net_amount := new.amount - new.adjustment_amount;
  end if;

  if new.net_amount <> new.amount - new.adjustment_amount then
    raise exception 'invalid_financial_item_net_amount'
      using detail = format(
        'amount=%s adjustment_amount=%s net_amount=%s',
        new.amount,
        new.adjustment_amount,
        new.net_amount
      );
  end if;

  return new;
end;
$$;

drop trigger if exists initialize_student_financial_item_amounts_trigger
  on public.student_financial_items;

create trigger initialize_student_financial_item_amounts_trigger
before insert on public.student_financial_items
for each row
execute function public.initialize_student_financial_item_amounts();

comment on function public.initialize_student_financial_item_amounts()
is 'Initialise adjustment_amount et net_amount lors de la création d’un frais financier et vérifie la cohérence amount - adjustment_amount = net_amount.';


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260719001500_fix_remaining_financial_cycle_references.sql
-- -----------------------------------------------------------------------------

-- Corrige uniquement les fonctions PL/pgSQL ordinaires encore compilées avec
-- l'ancien champ enrollments.academic_year_cycle_id. Le filtrage par prokind
-- évite d'appeler pg_get_functiondef sur des agrégats, ce qui faisait échouer
-- la migration avant même l'entrée dans la boucle.
do $$
declare
  function_record record;
  function_definition text;
begin
  for function_record in
    with plpgsql_functions as materialized (
      select p.oid
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      join pg_language l on l.oid = p.prolang
      where n.nspname = 'public'
        and l.lanname = 'plpgsql'
        and p.prokind = 'f'
    )
    select f.oid, pg_get_functiondef(f.oid) as definition
    from plpgsql_functions f
  loop
    function_definition := function_record.definition;

    if position('selected_enrollment.academic_year_cycle_id' in function_definition) > 0 then
      function_definition := replace(
        function_definition,
        'selected_enrollment.academic_year_cycle_id',
        '(select ayl.academic_year_cycle_id from public.academic_year_levels ayl where ayl.id = selected_enrollment.academic_year_level_id)'
      );
      execute function_definition;
    end if;
  end loop;
end
$$;
