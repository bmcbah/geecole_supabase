alter table public.enrollments
  add column source_enrollment_id uuid references public.enrollments(id) on delete restrict,
  add column academic_decision text check (academic_decision in ('promotion', 'repeat', 'skip', 'exceptional', 'pending')),
  add column decision_reason text,
  add column policy_snapshot jsonb not null default '{}'::jsonb;

create table public.reenrollment_policies (
  institution_id uuid primary key references public.institutions(id) on delete cascade,
  allow_early_preparation boolean not null default true,
  allow_direct_confirmation boolean not null default true,
  debt_mode text not null default 'warning' check (debt_mode in ('information', 'warning', 'blocking')),
  require_academic_decision boolean not null default true,
  allow_decision_override boolean not null default true,
  repeat_mode text not null default 'exception' check (repeat_mode in ('allowed', 'exception', 'forbidden')),
  require_class_assignment boolean not null default false,
  auto_generate_fees boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.reenrollment_policies (institution_id)
select id from public.institutions on conflict do nothing;

create or replace function public.create_default_reenrollment_policy()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.reenrollment_policies (institution_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger institutions_create_reenrollment_policy after insert on public.institutions
  for each row execute function public.create_default_reenrollment_policy();

create trigger reenrollment_policies_set_updated_at before update on public.reenrollment_policies
  for each row execute function public.set_updated_at();

alter table public.reenrollment_policies enable row level security;
create policy reenrollment_policies_select_member on public.reenrollment_policies for select to authenticated
  using (public.is_active_member(institution_id));
create policy reenrollment_policies_manage_admin on public.reenrollment_policies for all to authenticated
  using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
  with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
grant select, insert, update on public.reenrollment_policies to authenticated;
revoke all on public.reenrollment_policies from anon;

create or replace function public.reenroll_student(
  source_enrollment uuid,
  target_academic_year uuid,
  target_annual_level uuid,
  target_decision text,
  target_enrollment_status public.enrollment_status default 'pre_registered',
  target_reason text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  previous public.enrollments%rowtype;
  target_year public.academic_years%rowtype;
  annual_level public.academic_year_levels%rowtype;
  policy public.reenrollment_policies%rowtype;
  new_enrollment_id uuid;
begin
  select * into previous from public.enrollments where id = source_enrollment;
  if not found then raise exception 'source_enrollment_not_found'; end if;
  if not public.has_institution_role(previous.institution_id, array['owner','admin','secretary']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  if previous.status <> 'confirmed' then raise exception 'source_enrollment_not_confirmed'; end if;
  if previous.academic_year_id = target_academic_year then raise exception 'target_year_must_differ'; end if;

  select * into target_year from public.academic_years
    where id = target_academic_year and institution_id = previous.institution_id;
  if not found or target_year.status not in ('preparation', 'open') then raise exception 'target_year_not_available'; end if;

  select * into annual_level from public.academic_year_levels
    where id = target_annual_level and institution_id = previous.institution_id
      and academic_year_id = target_academic_year and is_active;
  if not found then raise exception 'invalid_target_level'; end if;

  select * into policy from public.reenrollment_policies where institution_id = previous.institution_id;
  if policy.institution_id is null then raise exception 'reenrollment_policy_missing'; end if;
  if target_year.status = 'preparation' and not policy.allow_early_preparation then raise exception 'early_reenrollment_disabled'; end if;
  if target_enrollment_status not in ('draft', 'pre_registered', 'confirmed') then raise exception 'invalid_target_status'; end if;
  if target_enrollment_status = 'confirmed' and not policy.allow_direct_confirmation then raise exception 'direct_confirmation_disabled'; end if;
  if target_decision not in ('promotion', 'repeat', 'skip', 'exceptional') then raise exception 'invalid_academic_decision'; end if;
  if target_decision <> 'promotion' and nullif(trim(target_reason), '') is null then raise exception 'decision_reason_required'; end if;
  if target_decision = 'repeat' and policy.repeat_mode = 'forbidden' then raise exception 'repeat_forbidden'; end if;

  insert into public.enrollments (
    institution_id, academic_year_id, student_id, academic_year_level_id, status,
    origin, level_name_snapshot, cycle_name_snapshot, confirmed_at, created_by,
    source_enrollment_id, academic_decision, decision_reason, policy_snapshot
  ) values (
    previous.institution_id, target_academic_year, previous.student_id, target_annual_level,
    target_enrollment_status, 'returning', annual_level.level_name_snapshot,
    annual_level.cycle_name_snapshot,
    case when target_enrollment_status = 'confirmed' then now() else null end,
    (select auth.uid()), previous.id, target_decision, nullif(trim(target_reason), ''),
    to_jsonb(policy) - 'created_at' - 'updated_at'
  ) returning id into new_enrollment_id;
  return new_enrollment_id;
end;
$$;

revoke all on function public.reenroll_student(uuid,uuid,uuid,text,public.enrollment_status,text) from public;
grant execute on function public.reenroll_student(uuid,uuid,uuid,text,public.enrollment_status,text) to authenticated;
