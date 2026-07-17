create table public.cycle_catalog(
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  code text not null unique check(code ~ '^[A-Z0-9_-]{2,20}$'),
  description text,
  icon text not null default 'pi-book',
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.cycle_catalog(name,code,description,icon,sort_order) values
('Préscolaire','PRESCOLAIRE','Premières années et préparation au primaire','pi-sparkles',10),
('Primaire','PRIMAIRE','Enseignement primaire','pi-pencil',20),
('Collège','COLLEGE','Premier cycle du secondaire','pi-book',30),
('Lycée','LYCEE','Second cycle du secondaire','pi-graduation-cap',40);

create table public.institution_cycles(
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  catalog_cycle_id uuid not null references public.cycle_catalog(id) on delete restrict,
  academic_cycle_id uuid references public.academic_cycles(id) on delete restrict,
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(institution_id,catalog_cycle_id),
  unique(institution_id,academic_cycle_id)
);

insert into public.institution_cycles(institution_id,catalog_cycle_id,academic_cycle_id,sort_order,is_active)
select cycle.institution_id,catalog.id,cycle.id,cycle.sort_order,cycle.is_active
from public.academic_cycles cycle join public.cycle_catalog catalog on catalog.code=cycle.code
on conflict(institution_id,catalog_cycle_id) do nothing;

alter table public.cycle_catalog enable row level security;
alter table public.institution_cycles enable row level security;
create policy cycle_catalog_read on public.cycle_catalog for select to authenticated using(is_active);
create policy institution_cycles_read on public.institution_cycles for select to authenticated using(public.is_active_member(institution_id));
create policy institution_cycles_write on public.institution_cycles for all to authenticated
using(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]))
with check(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]));
grant select on public.cycle_catalog to authenticated;
grant select,insert,update on public.institution_cycles to authenticated;
revoke all on public.cycle_catalog,public.institution_cycles from anon;

create or replace function public.set_institution_cycle(target_institution_id uuid,target_catalog_cycle_id uuid,target_active boolean,target_year_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare catalog public.cycle_catalog;catalog_cycle uuid;activation_id uuid;annual_id uuid;
begin
  if not public.has_institution_role(target_institution_id,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  select * into catalog from public.cycle_catalog where id=target_catalog_cycle_id and is_active;
  if catalog.id is null then raise exception 'catalog_cycle_not_found'; end if;
  select academic_cycle_id into catalog_cycle from public.institution_cycles where institution_id=target_institution_id and catalog_cycle_id=catalog.id;
  if catalog_cycle is null and target_active then
    insert into public.academic_cycles(institution_id,name,code,sort_order,is_active)
    values(target_institution_id,catalog.name,catalog.code,catalog.sort_order,true) returning id into catalog_cycle;
  end if;
  insert into public.institution_cycles(institution_id,catalog_cycle_id,academic_cycle_id,sort_order,is_active)
  values(target_institution_id,catalog.id,catalog_cycle,catalog.sort_order,target_active)
  on conflict(institution_id,catalog_cycle_id) do update set is_active=excluded.is_active
  returning id into activation_id;
  if catalog_cycle is not null then update public.academic_cycles set is_active=target_active where id=catalog_cycle; end if;
  if target_active and target_year_id is not null and not exists(select 1 from public.academic_year_cycles where academic_year_id=target_year_id and cycle_id=catalog_cycle) then
    insert into public.academic_year_cycles(institution_id,academic_year_id,cycle_id,name,code,sort_order)
    values(target_institution_id,target_year_id,catalog_cycle,catalog.name,catalog.code,catalog.sort_order) returning id into annual_id;
  end if;
  return activation_id;
end; $$;
revoke all on function public.set_institution_cycle(uuid,uuid,boolean,uuid) from public;
grant execute on function public.set_institution_cycle(uuid,uuid,boolean,uuid) to authenticated;
