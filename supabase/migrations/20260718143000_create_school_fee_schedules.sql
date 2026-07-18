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

create policy "fee_types_authenticated_access"
on public.fee_types
for all
to authenticated
using (true)
with check (true);

create policy "fee_schedules_authenticated_access"
on public.fee_schedules
for all
to authenticated
using (true)
with check (true);

create policy "fee_schedule_items_authenticated_access"
on public.fee_schedule_items
for all
to authenticated
using (true)
with check (true);

comment on table public.fee_types is 'Catalogue permanent des types de frais d’un établissement.';
comment on table public.fee_schedules is 'Grille tarifaire unique d’un établissement pour une année scolaire.';
comment on table public.fee_schedule_items is 'Tarifs annuels ciblant l’établissement, des cycles ou des niveaux.';
