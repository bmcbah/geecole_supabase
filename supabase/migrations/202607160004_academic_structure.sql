create table public.academic_cycles (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  code text not null check (code ~ '^[A-Z0-9_-]{2,20}$'),
  sort_order smallint not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, name),
  unique (institution_id, code),
  unique (id, institution_id)
);

create table public.grade_levels (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  cycle_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 80),
  code text not null check (code ~ '^[A-Z0-9_-]{1,20}$'),
  sort_order smallint not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grade_levels_cycle_fk foreign key (cycle_id, institution_id)
    references public.academic_cycles(id, institution_id) on delete restrict,
  unique (cycle_id, name),
  unique (cycle_id, code)
);

create index academic_cycles_institution_order_idx on public.academic_cycles(institution_id, sort_order, name);
create index grade_levels_cycle_order_idx on public.grade_levels(cycle_id, sort_order, name);

create trigger academic_cycles_set_updated_at before update on public.academic_cycles
for each row execute function public.set_updated_at();
create trigger grade_levels_set_updated_at before update on public.grade_levels
for each row execute function public.set_updated_at();

alter table public.academic_cycles enable row level security;
alter table public.grade_levels enable row level security;

create policy academic_cycles_select_member on public.academic_cycles for select to authenticated
using (public.is_active_member(institution_id));
create policy academic_cycles_insert_admin on public.academic_cycles for insert to authenticated
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
create policy academic_cycles_update_admin on public.academic_cycles for update to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

create policy grade_levels_select_member on public.grade_levels for select to authenticated
using (public.is_active_member(institution_id));
create policy grade_levels_insert_admin on public.grade_levels for insert to authenticated
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
create policy grade_levels_update_admin on public.grade_levels for update to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

grant select, insert, update on public.academic_cycles, public.grade_levels to authenticated;
revoke all on public.academic_cycles, public.grade_levels from anon;
