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

create policy "payment_plans_authenticated_access"
on public.payment_plans for all to authenticated
using (true) with check (true);

create policy "payment_plan_installments_authenticated_access"
on public.payment_plan_installments for all to authenticated
using (true) with check (true);

comment on table public.payment_plans is 'Modèles annuels de répartition des frais scolaires.';
comment on table public.payment_plan_installments is 'Échéances en pourcentage associées à un plan de paiement.';