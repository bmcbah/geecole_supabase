alter table public.academic_cycles drop constraint if exists academic_cycles_institution_id_name_key;
alter table public.academic_cycles drop constraint if exists academic_cycles_institution_id_code_key;
alter table public.grade_levels drop constraint if exists grade_levels_cycle_id_name_key;
alter table public.grade_levels drop constraint if exists grade_levels_cycle_id_code_key;
alter table public.subjects drop constraint if exists subjects_institution_id_name_key;
alter table public.assessment_types drop constraint if exists assessment_types_academic_year_id_name_key;
alter table public.grading_formulas drop constraint if exists grading_formulas_academic_year_id_name_key;

alter table public.grading_formulas add column code text;
update public.grading_formulas set code = 'F' || row_number from (
  select id, row_number() over (partition by academic_year_id order by created_at, id) from public.grading_formulas
) numbered where grading_formulas.id = numbered.id;
alter table public.grading_formulas alter column code set not null;
alter table public.grading_formulas add constraint grading_formulas_year_code_unique unique (academic_year_id, code);

create table public.academic_year_cycles (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  cycle_id uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 80),
  code text not null check (code ~ '^[A-Z0-9_-]{1,20}$'),
  sort_order smallint not null default 0 check (sort_order >= 0),
  period_system text not null default 'term' check (period_system in ('term','semester','custom')),
  period_count smallint not null default 3 check (period_count between 1 and 6),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint annual_cycles_year_fk foreign key (academic_year_id, institution_id)
    references public.academic_years(id, institution_id) on delete cascade,
  constraint annual_cycles_catalog_fk foreign key (cycle_id, institution_id)
    references public.academic_cycles(id, institution_id) on delete restrict,
  unique (academic_year_id, cycle_id),
  unique (academic_year_id, code),
  unique (id, academic_year_id, cycle_id)
);
create index academic_year_cycles_year_order_idx on public.academic_year_cycles(academic_year_id, sort_order, name);

insert into public.academic_year_cycles(institution_id, academic_year_id, cycle_id, name, code, sort_order, period_system, period_count)
select distinct levels.institution_id, levels.academic_year_id, levels.cycle_id,
  cycle.name, cycle.code, cycle.sort_order, cycle.period_system, cycle.period_count
from public.academic_year_levels levels join public.academic_cycles cycle on cycle.id=levels.cycle_id
on conflict (academic_year_id, cycle_id) do nothing;

alter table public.academic_year_levels add column academic_year_cycle_id uuid;
alter table public.academic_year_levels add column level_code_snapshot text;
update public.academic_year_levels levels set
  academic_year_cycle_id = cycle.id,
  level_code_snapshot = catalog.code
from public.academic_year_cycles cycle, public.grade_levels catalog
where cycle.academic_year_id=levels.academic_year_id and cycle.cycle_id=levels.cycle_id and catalog.id=levels.level_id;
alter table public.academic_year_levels alter column academic_year_cycle_id set not null;
alter table public.academic_year_levels alter column level_code_snapshot set not null;
alter table public.academic_year_levels add constraint annual_levels_annual_cycle_fk
  foreign key (academic_year_cycle_id, academic_year_id, cycle_id)
  references public.academic_year_cycles(id, academic_year_id, cycle_id) on delete cascade;
alter table public.academic_year_levels add constraint annual_levels_year_code_unique
  unique (academic_year_id, level_code_snapshot);

create or replace function public.prepare_academic_year_level()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cycle_row public.academic_cycles; level_row public.grade_levels; annual_cycle_id uuid;
begin
  select * into cycle_row from public.academic_cycles where id=new.cycle_id and institution_id=new.institution_id;
  select * into level_row from public.grade_levels where id=new.level_id and cycle_id=new.cycle_id and institution_id=new.institution_id;
  select id into annual_cycle_id from public.academic_year_cycles where academic_year_id=new.academic_year_id and cycle_id=new.cycle_id;
  if cycle_row.id is null or level_row.id is null or annual_cycle_id is null then raise exception 'invalid_academic_structure'; end if;
  new.academic_year_cycle_id := annual_cycle_id;
  new.cycle_name_snapshot := cycle_row.name;
  new.level_name_snapshot := level_row.name;
  new.level_code_snapshot := level_row.code;
  new.sort_order := level_row.sort_order;
  return new;
end;
$$;

create or replace function public.save_academic_year_cycle(
  target_year_id uuid, target_annual_cycle_id uuid, cycle_name text, cycle_code text,
  cycle_sort_order smallint, cycle_period_system text, cycle_period_count smallint, cycle_is_active boolean
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare institution uuid; year_status public.academic_year_status; catalog_id uuid; saved_id uuid;
begin
  select institution_id, status into institution, year_status from public.academic_years where id=target_year_id;
  if institution is null then raise exception 'academic_year_not_found'; end if;
  if year_status in ('closed','archived') then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(institution, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if target_annual_cycle_id is null then
    insert into public.academic_cycles(institution_id,name,code,sort_order,period_system,period_count,is_active)
    values(institution,trim(cycle_name),upper(trim(cycle_code)),cycle_sort_order,cycle_period_system,cycle_period_count,cycle_is_active)
    returning id into catalog_id;
    insert into public.academic_year_cycles(institution_id,academic_year_id,cycle_id,name,code,sort_order,period_system,period_count,is_active)
    values(institution,target_year_id,catalog_id,trim(cycle_name),upper(trim(cycle_code)),cycle_sort_order,cycle_period_system,cycle_period_count,cycle_is_active)
    returning id into saved_id;
  else
    update public.academic_year_cycles set name=trim(cycle_name),code=upper(trim(cycle_code)),sort_order=cycle_sort_order,
      period_system=cycle_period_system,period_count=cycle_period_count,is_active=cycle_is_active
    where id=target_annual_cycle_id and academic_year_id=target_year_id returning id,cycle_id into saved_id,catalog_id;
    if saved_id is null then raise exception 'annual_cycle_not_found'; end if;
    update public.academic_cycles set name=trim(cycle_name),code=upper(trim(cycle_code)),sort_order=cycle_sort_order,
      period_system=cycle_period_system,period_count=cycle_period_count,is_active=cycle_is_active where id=catalog_id;
  end if;
  return saved_id;
end;
$$;

create or replace function public.set_academic_year_cycle_levels(
  target_year_id uuid, target_cycle_id uuid, target_level_ids uuid[]
)
returns integer language plpgsql security definer set search_path = '' as $$
declare target_institution_id uuid; target_status public.academic_year_status; inserted_count integer;
begin
  select institution_id,status into target_institution_id,target_status from public.academic_years where id=target_year_id;
  if target_institution_id is null then raise exception 'academic_year_not_found'; end if;
  if target_status in ('closed','archived') then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(target_institution_id,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if not exists(select 1 from public.academic_year_cycles where academic_year_id=target_year_id and cycle_id=target_cycle_id)
    then raise exception 'annual_cycle_not_found'; end if;
  delete from public.academic_year_levels where academic_year_id=target_year_id and cycle_id=target_cycle_id;
  insert into public.academic_year_levels(institution_id,academic_year_id,cycle_id,level_id,cycle_name_snapshot,level_name_snapshot)
  select target_institution_id,target_year_id,target_cycle_id,level.id,'','' from public.grade_levels level
  where level.id=any(coalesce(target_level_ids,array[]::uuid[])) and level.cycle_id=target_cycle_id
    and level.institution_id=target_institution_id and level.is_active;
  get diagnostics inserted_count=row_count;
  return inserted_count;
end;
$$;

create or replace function public.clone_academic_year_levels(source_year_id uuid, target_year_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare source_institution uuid; target_institution uuid; target_status public.academic_year_status; inserted_count integer;
begin
  select institution_id into source_institution from public.academic_years where id=source_year_id;
  select institution_id,status into target_institution,target_status from public.academic_years where id=target_year_id;
  if source_institution is null or target_institution is null or source_institution<>target_institution then raise exception 'incompatible_academic_years'; end if;
  if target_status<>'preparation' then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(target_institution,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  insert into public.academic_year_cycles(institution_id,academic_year_id,cycle_id,name,code,sort_order,period_system,period_count,is_active)
  select institution_id,target_year_id,cycle_id,name,code,sort_order,period_system,period_count,is_active
  from public.academic_year_cycles where academic_year_id=source_year_id
  on conflict (academic_year_id,cycle_id) do nothing;
  insert into public.academic_year_levels(institution_id,academic_year_id,cycle_id,level_id,cycle_name_snapshot,level_name_snapshot,level_code_snapshot,academic_year_cycle_id,is_active,cloned_from_id)
  select levels.institution_id,target_year_id,levels.cycle_id,levels.level_id,levels.cycle_name_snapshot,levels.level_name_snapshot,
    levels.level_code_snapshot,target_cycle.id,levels.is_active,levels.id
  from public.academic_year_levels levels join public.academic_year_cycles target_cycle
    on target_cycle.academic_year_id=target_year_id and target_cycle.cycle_id=levels.cycle_id
  where levels.academic_year_id=source_year_id on conflict (academic_year_id,level_id) do nothing;
  get diagnostics inserted_count=row_count;
  return inserted_count;
end;
$$;

alter table public.academic_year_cycles enable row level security;
create policy annual_cycles_select on public.academic_year_cycles for select to authenticated using(public.is_active_member(institution_id));
create policy annual_cycles_write on public.academic_year_cycles for all to authenticated
using(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]))
with check(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]));
grant select,insert,update,delete on public.academic_year_cycles to authenticated;
revoke all on public.academic_year_cycles from anon;
revoke all on function public.save_academic_year_cycle(uuid,uuid,text,text,smallint,text,smallint,boolean) from public;
grant execute on function public.save_academic_year_cycle(uuid,uuid,text,text,smallint,text,smallint,boolean) to authenticated;
create trigger academic_year_cycles_lock before insert or update or delete on public.academic_year_cycles
for each row execute function public.ensure_open_year_period_write();

create or replace function public.sync_all_academic_year_periods(target_year_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare cycle_row record; total_count integer:=0;
begin
  for cycle_row in select cycle_id from public.academic_year_cycles
    where academic_year_id=target_year_id and is_active loop
    total_count:=total_count+public.sync_academic_year_periods(target_year_id,cycle_row.cycle_id);
  end loop;
  return total_count;
end;
$$;

drop trigger assessment_types_lock on public.assessment_types;
create trigger assessment_types_lock before insert or update or delete on public.assessment_types
for each row execute function public.ensure_open_year_period_write();
drop trigger grading_formulas_lock on public.grading_formulas;
create trigger grading_formulas_lock before insert or update or delete on public.grading_formulas
for each row execute function public.ensure_open_year_period_write();

create or replace function public.clone_academic_year_configuration(
  source_year_id uuid,target_year_id uuid,include_structure boolean default true,include_subjects boolean default true,
  include_assessments boolean default true,include_finance boolean default true,include_users boolean default true
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare source_institution uuid;target_institution uuid;target_status public.academic_year_status;
declare structure_count integer:=0;subjects_count integer:=0;assessments_count integer:=0;formulas_count integer:=0;finance_count integer:=0;users_count integer:=0;
begin
  select institution_id into source_institution from public.academic_years where id=source_year_id;
  select institution_id,status into target_institution,target_status from public.academic_years where id=target_year_id;
  if source_institution is null or target_institution is null or source_institution<>target_institution then raise exception 'incompatible_academic_years'; end if;
  if source_year_id=target_year_id then raise exception 'source_and_target_must_differ'; end if;
  if target_status<>'preparation' then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(target_institution,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if include_structure then select public.clone_academic_year_levels(source_year_id,target_year_id) into structure_count; end if;
  if include_subjects then
    insert into public.annual_subjects(institution_id,academic_year_id,academic_year_level_id,subject_id,subject_name_snapshot,coefficient,weekly_hours)
    select s.institution_id,target_year_id,target_level.id,s.subject_id,s.subject_name_snapshot,s.coefficient,s.weekly_hours
    from public.annual_subjects s join public.academic_year_levels source_level on source_level.id=s.academic_year_level_id
    join public.academic_year_levels target_level on target_level.academic_year_id=target_year_id and target_level.level_id=source_level.level_id
    where s.academic_year_id=source_year_id on conflict (academic_year_id,academic_year_level_id,subject_id) do nothing;
    get diagnostics subjects_count=row_count;
  end if;
  if include_assessments then
    insert into public.assessment_types(institution_id,academic_year_id,name,code,weight,scale,is_active)
    select institution_id,target_year_id,name,code,weight,scale,is_active from public.assessment_types where academic_year_id=source_year_id
    on conflict (academic_year_id,code) do nothing; get diagnostics assessments_count=row_count;
    insert into public.grading_formulas(institution_id,academic_year_id,name,code,expression,description,is_default)
    select institution_id,target_year_id,name,code,expression,description,is_default from public.grading_formulas where academic_year_id=source_year_id
    on conflict (academic_year_id,code) do nothing; get diagnostics formulas_count=row_count;
  end if;
  if include_finance then
    insert into public.financial_rules(institution_id,academic_year_id,name,code,amount,due_day,frequency,is_active)
    select institution_id,target_year_id,name,code,amount,due_day,frequency,is_active from public.financial_rules where academic_year_id=source_year_id
    on conflict (academic_year_id,code) do nothing; get diagnostics finance_count=row_count;
  end if;
  if include_users then
    insert into public.academic_year_user_assignments(institution_id,academic_year_id,membership_id,responsibility,is_active)
    select institution_id,target_year_id,membership_id,responsibility,is_active from public.academic_year_user_assignments where academic_year_id=source_year_id
    on conflict (academic_year_id,membership_id) do nothing; get diagnostics users_count=row_count;
  end if;
  return jsonb_build_object('structure',structure_count,'subjects',subjects_count,'assessments',assessments_count,'formulas',formulas_count,'finance',finance_count,'users',users_count);
end;
$$;
