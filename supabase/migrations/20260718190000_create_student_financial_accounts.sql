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