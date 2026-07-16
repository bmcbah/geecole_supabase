create unique index academic_years_one_open_per_institution_idx
  on public.academic_years(institution_id) where status='open';

alter table public.academic_cycles
  add column subjects_period_scope text not null default 'all' check(subjects_period_scope in ('all','selectable')),
  add column grading_scale numeric(6,2) not null default 20 check(grading_scale>0),
  add column pass_average numeric(6,2) not null default 10 check(pass_average>=0 and pass_average<=grading_scale),
  add column ranking_enabled boolean not null default true,
  add column absences_on_report boolean not null default true;

alter table public.academic_year_cycles
  add column subjects_period_scope text not null default 'all' check(subjects_period_scope in ('all','selectable')),
  add column grading_scale numeric(6,2) not null default 20 check(grading_scale>0),
  add column pass_average numeric(6,2) not null default 10 check(pass_average>=0 and pass_average<=grading_scale),
  add column ranking_enabled boolean not null default true,
  add column absences_on_report boolean not null default true;

alter table public.grade_levels
  add column capacity integer check(capacity is null or capacity>0),
  add column next_level_id uuid references public.grade_levels(id) on delete set null,
  add column repeat_allowed boolean not null default true;

alter table public.annual_subjects
  add column applies_all_periods boolean not null default true,
  add column period_ids uuid[] not null default '{}';

alter table public.financial_rules
  add column fee_type text not null default 'other' check(fee_type in ('enrollment','reenrollment','tuition','other')),
  add column is_mandatory boolean not null default true,
  add column discount_allowed boolean not null default false,
  add column amount_editable boolean not null default false,
  add column installment_count smallint not null default 1 check(installment_count between 1 and 12);

drop function public.save_academic_year_cycle(uuid,uuid,text,text,smallint,text,smallint,boolean);
create function public.save_academic_year_cycle(
  target_year_id uuid,target_annual_cycle_id uuid,cycle_name text,cycle_code text,
  cycle_sort_order smallint,cycle_period_system text,cycle_period_count smallint,cycle_is_active boolean,
  cycle_subjects_period_scope text,cycle_grading_scale numeric,cycle_pass_average numeric,
  cycle_ranking_enabled boolean,cycle_absences_on_report boolean
)
returns uuid language plpgsql security definer set search_path='' as $$
declare institution uuid;year_status public.academic_year_status;catalog_id uuid;saved_id uuid;
begin
  select institution_id,status into institution,year_status from public.academic_years where id=target_year_id;
  if institution is null then raise exception 'academic_year_not_found'; end if;
  if year_status in ('closed','archived') then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(institution,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if target_annual_cycle_id is null then
    insert into public.academic_cycles(institution_id,name,code,sort_order,period_system,period_count,is_active,subjects_period_scope,grading_scale,pass_average,ranking_enabled,absences_on_report)
    values(institution,trim(cycle_name),upper(trim(cycle_code)),cycle_sort_order,cycle_period_system,cycle_period_count,cycle_is_active,cycle_subjects_period_scope,cycle_grading_scale,cycle_pass_average,cycle_ranking_enabled,cycle_absences_on_report)
    returning id into catalog_id;
    insert into public.academic_year_cycles(institution_id,academic_year_id,cycle_id,name,code,sort_order,period_system,period_count,is_active,subjects_period_scope,grading_scale,pass_average,ranking_enabled,absences_on_report)
    values(institution,target_year_id,catalog_id,trim(cycle_name),upper(trim(cycle_code)),cycle_sort_order,cycle_period_system,cycle_period_count,cycle_is_active,cycle_subjects_period_scope,cycle_grading_scale,cycle_pass_average,cycle_ranking_enabled,cycle_absences_on_report)
    returning id into saved_id;
  else
    update public.academic_year_cycles set name=trim(cycle_name),code=upper(trim(cycle_code)),sort_order=cycle_sort_order,period_system=cycle_period_system,
      period_count=cycle_period_count,is_active=cycle_is_active,subjects_period_scope=cycle_subjects_period_scope,grading_scale=cycle_grading_scale,
      pass_average=cycle_pass_average,ranking_enabled=cycle_ranking_enabled,absences_on_report=cycle_absences_on_report
    where id=target_annual_cycle_id and academic_year_id=target_year_id returning id,cycle_id into saved_id,catalog_id;
    if saved_id is null then raise exception 'annual_cycle_not_found'; end if;
    update public.academic_cycles set name=trim(cycle_name),code=upper(trim(cycle_code)),sort_order=cycle_sort_order,period_system=cycle_period_system,
      period_count=cycle_period_count,is_active=cycle_is_active,subjects_period_scope=cycle_subjects_period_scope,grading_scale=cycle_grading_scale,
      pass_average=cycle_pass_average,ranking_enabled=cycle_ranking_enabled,absences_on_report=cycle_absences_on_report where id=catalog_id;
  end if;
  return saved_id;
end; $$;
revoke all on function public.save_academic_year_cycle(uuid,uuid,text,text,smallint,text,smallint,boolean,text,numeric,numeric,boolean,boolean) from public;
grant execute on function public.save_academic_year_cycle(uuid,uuid,text,text,smallint,text,smallint,boolean,text,numeric,numeric,boolean,boolean) to authenticated;

create table public.financial_rule_levels(
  financial_rule_id uuid not null references public.financial_rules(id) on delete cascade,
  academic_year_level_id uuid not null references public.academic_year_levels(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  primary key(financial_rule_id,academic_year_level_id),
  constraint financial_rule_levels_year_fk foreign key(academic_year_id,institution_id)
    references public.academic_years(id,institution_id) on delete cascade
);
alter table public.financial_rule_levels enable row level security;
create policy financial_rule_levels_select on public.financial_rule_levels for select to authenticated
  using(public.is_active_member(institution_id));
create policy financial_rule_levels_write on public.financial_rule_levels for all to authenticated
  using(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]))
  with check(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]));
create trigger financial_rule_levels_lock before insert or update or delete on public.financial_rule_levels
  for each row execute function public.ensure_open_year_period_write();
grant select,insert,update,delete on public.financial_rule_levels to authenticated;
revoke all on public.financial_rule_levels from anon;

create or replace function public.set_financial_rule_levels(target_rule_id uuid,target_level_ids uuid[])
returns integer language plpgsql security definer set search_path='' as $$
declare rule public.financial_rules; changed integer;
begin
  select * into rule from public.financial_rules where id=target_rule_id;
  if rule.id is null then raise exception 'financial_rule_not_found'; end if;
  if not public.has_institution_role(rule.institution_id,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if (select status from public.academic_years where id=rule.academic_year_id) in ('closed','archived') then raise exception 'academic_year_configuration_locked'; end if;
  delete from public.financial_rule_levels where financial_rule_id=rule.id;
  insert into public.financial_rule_levels(financial_rule_id,academic_year_level_id,institution_id,academic_year_id)
  select rule.id,level.id,rule.institution_id,rule.academic_year_id from public.academic_year_levels level
  where level.id=any(coalesce(target_level_ids,'{}'::uuid[])) and level.academic_year_id=rule.academic_year_id;
  get diagnostics changed=row_count;
  return changed;
end; $$;
revoke all on function public.set_financial_rule_levels(uuid,uuid[]) from public;
grant execute on function public.set_financial_rule_levels(uuid,uuid[]) to authenticated;

create or replace function public.validate_annual_subject_periods()
returns trigger language plpgsql set search_path='' as $$
declare cycle_scope text; valid_count integer;
begin
  select cycle.subjects_period_scope into cycle_scope
  from public.academic_year_levels level join public.academic_year_cycles cycle
    on cycle.id=level.academic_year_cycle_id where level.id=new.academic_year_level_id;
  if cycle_scope='all' then new.applies_all_periods:=true; new.period_ids:='{}'; end if;
  if not new.applies_all_periods then
    select count(*) into valid_count from public.academic_periods period
    where period.id=any(new.period_ids) and period.academic_year_id=new.academic_year_id;
    if cardinality(new.period_ids)=0 or valid_count<>cardinality(new.period_ids) then raise exception 'invalid_subject_periods'; end if;
  else new.period_ids:='{}'; end if;
  return new;
end; $$;
create trigger annual_subjects_validate_periods before insert or update on public.annual_subjects
  for each row execute function public.validate_annual_subject_periods();

create or replace function public.clone_academic_year_levels(source_year_id uuid,target_year_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare source_institution uuid;target_institution uuid;target_status public.academic_year_status;inserted_count integer;
begin
  select institution_id into source_institution from public.academic_years where id=source_year_id;
  select institution_id,status into target_institution,target_status from public.academic_years where id=target_year_id;
  if source_institution is null or target_institution is null or source_institution<>target_institution then raise exception 'incompatible_academic_years'; end if;
  if target_status<>'preparation' then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(target_institution,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  insert into public.academic_year_cycles(institution_id,academic_year_id,cycle_id,name,code,sort_order,period_system,period_count,is_active,subjects_period_scope,grading_scale,pass_average,ranking_enabled,absences_on_report)
  select institution_id,target_year_id,cycle_id,name,code,sort_order,period_system,period_count,is_active,subjects_period_scope,grading_scale,pass_average,ranking_enabled,absences_on_report
  from public.academic_year_cycles where academic_year_id=source_year_id on conflict(academic_year_id,cycle_id) do nothing;
  insert into public.academic_year_levels(institution_id,academic_year_id,cycle_id,level_id,cycle_name_snapshot,level_name_snapshot,level_code_snapshot,academic_year_cycle_id,is_active,cloned_from_id)
  select levels.institution_id,target_year_id,levels.cycle_id,levels.level_id,levels.cycle_name_snapshot,levels.level_name_snapshot,levels.level_code_snapshot,target_cycle.id,levels.is_active,levels.id
  from public.academic_year_levels levels join public.academic_year_cycles target_cycle on target_cycle.academic_year_id=target_year_id and target_cycle.cycle_id=levels.cycle_id
  where levels.academic_year_id=source_year_id on conflict(academic_year_id,level_id) do nothing;
  get diagnostics inserted_count=row_count; return inserted_count;
end; $$;

create or replace function public.enforce_academic_year_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status='archived' and new.status<>old.status then raise exception 'archived_year_is_immutable'; end if;
  if old.status='closed' and new.status not in ('closed','archived') then raise exception 'closed_year_cannot_reopen'; end if;
  if new.status='open' and not exists(select 1 from public.academic_year_levels where academic_year_id=new.id and is_active)
    then raise exception 'academic_structure_required'; end if;
  return new;
end; $$;
