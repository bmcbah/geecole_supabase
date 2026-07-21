-- GeEcole V1 — Scolarité, inscriptions, responsables et documents administratifs
-- Baseline consolidée le 2026-07-22.
-- Les marqueurs "Source consolidée" conservent la traçabilité Git.

-- -----------------------------------------------------------------------------
-- Source consolidée : 202607170012_schooling_foundation.sql
-- -----------------------------------------------------------------------------

create type public.student_status as enum ('active', 'inactive');
create type public.enrollment_status as enum (
  'draft', 'pre_registered', 'confirmed', 'rejected', 'withdrawn', 'cancelled', 'transferred'
);

create table public.students (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  matricule text not null,
  first_name text not null check (char_length(trim(first_name)) between 1 and 80),
  last_name text not null check (char_length(trim(last_name)) between 1 and 80),
  other_names text,
  gender text not null check (gender in ('female', 'male', 'other')),
  birth_date date,
  birth_date_is_approximate boolean not null default false,
  birth_place text,
  nationality text not null default 'Guinéenne',
  address text,
  photo_url text,
  birth_certificate_number text,
  previous_school text,
  previous_level text,
  status public.student_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, matricule)
);

create table public.guardians (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  primary_phone text not null,
  secondary_phone text,
  address text,
  occupation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index guardians_phone_unique
  on public.guardians (institution_id, regexp_replace(primary_phone, '\\s+', '', 'g'));

create table public.student_guardians (
  student_id uuid not null references public.students(id) on delete cascade,
  guardian_id uuid not null references public.guardians(id) on delete restrict,
  relationship text not null,
  is_primary_contact boolean not null default false,
  is_financial_responsible boolean not null default false,
  is_emergency_contact boolean not null default false,
  can_pick_up boolean not null default false,
  receives_communications boolean not null default true,
  primary key (student_id, guardian_id)
);

create table public.enrollments (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  academic_year_level_id uuid not null references public.academic_year_levels(id) on delete restrict,
  status public.enrollment_status not null default 'draft',
  admission_date date not null default current_date,
  origin text not null default 'new' check (origin in ('new', 'transfer', 'returning')),
  level_name_snapshot text not null,
  cycle_name_snapshot text not null,
  cancellation_reason text,
  confirmed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index enrollments_one_current_per_year
  on public.enrollments (institution_id, academic_year_id, student_id)
  where status not in ('cancelled', 'rejected', 'withdrawn');
create index students_search_idx on public.students (institution_id, last_name, first_name);
create index enrollments_year_status_idx on public.enrollments (academic_year_id, status);

create trigger students_set_updated_at before update on public.students
  for each row execute function public.set_updated_at();
create trigger guardians_set_updated_at before update on public.guardians
  for each row execute function public.set_updated_at();
create trigger enrollments_set_updated_at before update on public.enrollments
  for each row execute function public.set_updated_at();

create sequence public.student_matricule_sequence;

create or replace function public.create_student_enrollment(
  target_institution_id uuid,
  target_academic_year_id uuid,
  target_annual_level_id uuid,
  student_first_name text,
  student_last_name text,
  student_gender text,
  student_birth_date date,
  student_birth_place text,
  student_address text,
  guardian_first_name text,
  guardian_last_name text,
  guardian_phone text,
  guardian_relationship text,
  enrollment_kind public.enrollment_status default 'pre_registered'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  new_student_id uuid;
  selected_guardian_id uuid;
  annual_level public.academic_year_levels%rowtype;
  enrollment_id uuid;
  generated_matricule text;
begin
  if not public.has_institution_role(target_institution_id, array['owner','admin','secretary']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  if enrollment_kind not in ('draft', 'pre_registered', 'confirmed') then
    raise exception 'invalid_initial_status';
  end if;
  select * into annual_level from public.academic_year_levels
    where id = target_annual_level_id and institution_id = target_institution_id
      and academic_year_id = target_academic_year_id and is_active;
  if not found then raise exception 'invalid_annual_level'; end if;

  generated_matricule := 'EL-' || extract(year from current_date)::text || '-' ||
    lpad(nextval('public.student_matricule_sequence')::text, 5, '0');
  insert into public.students (
    institution_id, matricule, first_name, last_name, gender,
    birth_date, birth_place, address
  ) values (
    target_institution_id, generated_matricule, trim(student_first_name),
    trim(student_last_name), student_gender, student_birth_date,
    nullif(trim(student_birth_place), ''), nullif(trim(student_address), '')
  ) returning id into new_student_id;

  select id into selected_guardian_id from public.guardians
    where institution_id = target_institution_id
      and regexp_replace(primary_phone, '\\s+', '', 'g') = regexp_replace(guardian_phone, '\\s+', '', 'g');
  if selected_guardian_id is null then
    insert into public.guardians (institution_id, first_name, last_name, primary_phone)
    values (target_institution_id, trim(guardian_first_name), trim(guardian_last_name), trim(guardian_phone))
    returning id into selected_guardian_id;
  end if;
  insert into public.student_guardians (
    student_id, guardian_id, relationship, is_primary_contact,
    is_financial_responsible, is_emergency_contact
  ) values (new_student_id, selected_guardian_id, guardian_relationship, true, true, true);

  insert into public.enrollments (
    institution_id, academic_year_id, student_id, academic_year_level_id,
    status, level_name_snapshot, cycle_name_snapshot, confirmed_at, created_by
  ) values (
    target_institution_id, target_academic_year_id, new_student_id, target_annual_level_id,
    enrollment_kind, annual_level.level_name_snapshot, annual_level.cycle_name_snapshot,
    case when enrollment_kind = 'confirmed' then now() else null end, (select auth.uid())
  ) returning id into enrollment_id;
  return enrollment_id;
end;
$$;

revoke all on function public.create_student_enrollment(uuid,uuid,uuid,text,text,text,date,text,text,text,text,text,text,public.enrollment_status) from public;
grant execute on function public.create_student_enrollment(uuid,uuid,uuid,text,text,text,date,text,text,text,text,text,text,public.enrollment_status) to authenticated;

alter table public.students enable row level security;
alter table public.guardians enable row level security;
alter table public.student_guardians enable row level security;
alter table public.enrollments enable row level security;

create policy students_select_member on public.students for select to authenticated
  using (public.is_active_member(institution_id));
create policy students_manage_schooling on public.students for all to authenticated
  using (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]))
  with check (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]));
create policy guardians_select_member on public.guardians for select to authenticated
  using (public.is_active_member(institution_id));
create policy guardians_manage_schooling on public.guardians for all to authenticated
  using (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]))
  with check (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]));
create policy student_guardians_select_member on public.student_guardians for select to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and public.is_active_member(s.institution_id)));
create policy student_guardians_manage_schooling on public.student_guardians for all to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and public.has_institution_role(s.institution_id, array['owner','admin','secretary']::public.app_role[])))
  with check (exists (select 1 from public.students s where s.id = student_id and public.has_institution_role(s.institution_id, array['owner','admin','secretary']::public.app_role[])));
create policy enrollments_select_member on public.enrollments for select to authenticated
  using (public.is_active_member(institution_id));
create policy enrollments_manage_schooling on public.enrollments for all to authenticated
  using (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]))
  with check (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]));

grant select, insert, update on public.students, public.guardians, public.student_guardians, public.enrollments to authenticated;
revoke all on public.students, public.guardians, public.student_guardians, public.enrollments from anon;


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607170013_enrollment_policies.sql
-- -----------------------------------------------------------------------------

create table public.enrollment_policies (
  institution_id uuid primary key references public.institutions(id) on delete cascade,
  allow_pre_registration boolean not null default true,
  allow_direct_enrollment boolean not null default true,
  require_payment_before_confirmation boolean not null default false,
  require_class_assignment boolean not null default false,
  count_pre_registration_in_capacity boolean not null default false,
  capacity_mode text not null default 'warning' check (capacity_mode in ('information','warning','blocking')),
  allow_missing_documents boolean not null default true,
  student_number_pattern text not null default 'EL-{YYYY}-{SEQ}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger enrollment_policies_set_updated_at before update on public.enrollment_policies
  for each row execute function public.set_updated_at();
alter table public.enrollment_policies enable row level security;
create policy enrollment_policies_select_member on public.enrollment_policies for select to authenticated
  using (public.is_active_member(institution_id));
create policy enrollment_policies_manage_admin on public.enrollment_policies for all to authenticated
  using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
  with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
grant select, insert, update on public.enrollment_policies to authenticated;
revoke all on public.enrollment_policies from anon;

insert into public.enrollment_policies (institution_id)
select id from public.institutions on conflict do nothing;

create or replace function public.ensure_enrollment_policy()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.enrollment_policies (institution_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger institutions_create_enrollment_policy after insert on public.institutions
  for each row execute function public.ensure_enrollment_policy();

create or replace function public.enforce_enrollment_policy()
returns trigger language plpgsql set search_path = '' as $$
declare policy public.enrollment_policies%rowtype;
begin
  select * into policy from public.enrollment_policies where institution_id = new.institution_id;
  if new.status = 'pre_registered' and not policy.allow_pre_registration then
    raise exception 'pre_registration_disabled';
  end if;
  if new.status = 'confirmed' and not policy.allow_direct_enrollment then
    raise exception 'direct_enrollment_disabled';
  end if;
  return new;
end;
$$;
create trigger enrollments_enforce_policy before insert or update of status on public.enrollments
  for each row execute function public.enforce_enrollment_policy();


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607170014_schooling_crud_rules.sql
-- -----------------------------------------------------------------------------

create table public.enrollment_status_history (
  id uuid primary key default extensions.gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  previous_status public.enrollment_status not null,
  new_status public.enrollment_status not null,
  reason text,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);
create index enrollment_status_history_enrollment_idx on public.enrollment_status_history(enrollment_id, changed_at desc);
alter table public.enrollment_status_history enable row level security;
create policy enrollment_status_history_select_member on public.enrollment_status_history for select to authenticated
  using (public.is_active_member(institution_id));
grant select on public.enrollment_status_history to authenticated;
revoke all on public.enrollment_status_history from anon;

create or replace function public.change_enrollment_status(
  target_enrollment_id uuid,
  target_status public.enrollment_status,
  change_reason text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare current_enrollment public.enrollments%rowtype;
declare target_year public.academic_years%rowtype;
begin
  select * into current_enrollment from public.enrollments where id = target_enrollment_id for update;
  if not found then raise exception 'enrollment_not_found'; end if;
  if not public.has_institution_role(current_enrollment.institution_id, array['owner','admin','secretary']::public.app_role[]) then raise exception 'permission_denied'; end if;
  select * into target_year from public.academic_years where id = current_enrollment.academic_year_id;
  if target_year.status in ('closed','archived') then raise exception 'academic_year_read_only'; end if;
  if not (
    (current_enrollment.status = 'draft' and target_status in ('pre_registered','confirmed','cancelled')) or
    (current_enrollment.status = 'pre_registered' and target_status in ('confirmed','rejected','withdrawn','cancelled')) or
    (current_enrollment.status = 'confirmed' and target_status in ('cancelled','transferred'))
  ) then raise exception 'invalid_enrollment_transition'; end if;
  if target_status in ('cancelled','rejected','withdrawn','transferred') and char_length(trim(coalesce(change_reason,''))) < 3 then
    raise exception 'reason_required';
  end if;
  update public.enrollments set status = target_status,
    cancellation_reason = case when target_status in ('cancelled','rejected','withdrawn') then trim(change_reason) else cancellation_reason end,
    confirmed_at = case when target_status = 'confirmed' then now() else confirmed_at end
  where id = target_enrollment_id;
  insert into public.enrollment_status_history(enrollment_id,institution_id,previous_status,new_status,reason,changed_by)
  values(target_enrollment_id,current_enrollment.institution_id,current_enrollment.status,target_status,nullif(trim(change_reason),''),(select auth.uid()));
end;
$$;
revoke all on function public.change_enrollment_status(uuid,public.enrollment_status,text) from public;
grant execute on function public.change_enrollment_status(uuid,public.enrollment_status,text) to authenticated;


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607170015_reenrollment_foundation.sql
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607170016_group_reenrollment_guardians.sql
-- -----------------------------------------------------------------------------

alter table public.reenrollment_policies
  add column allow_batch boolean not null default true,
  add column batch_result_status public.enrollment_status not null default 'draft'
    check (batch_result_status in ('draft', 'pre_registered', 'confirmed')),
  add column require_active_next_cycle boolean not null default true;

create or replace function public.link_student_guardian(
  target_student_id uuid,
  target_guardian_id uuid,
  guardian_relationship text,
  primary_contact boolean default false,
  financial_responsible boolean default false,
  emergency_contact boolean default false,
  pickup_allowed boolean default false,
  communications_enabled boolean default true
) returns void
language plpgsql security definer set search_path = '' as $$
declare target_institution uuid;
begin
  select institution_id into target_institution from public.students where id = target_student_id;
  if target_institution is null or not public.has_institution_role(target_institution, array['owner','admin','secretary']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  if not exists (select 1 from public.guardians where id = target_guardian_id and institution_id = target_institution) then
    raise exception 'guardian_not_found';
  end if;
  if primary_contact then
    update public.student_guardians set is_primary_contact = false where student_id = target_student_id;
  end if;
  insert into public.student_guardians (
    student_id, guardian_id, relationship, is_primary_contact,
    is_financial_responsible, is_emergency_contact, can_pick_up, receives_communications
  ) values (
    target_student_id, target_guardian_id, trim(guardian_relationship), primary_contact,
    financial_responsible, emergency_contact, pickup_allowed, communications_enabled
  ) on conflict (student_id, guardian_id) do update set
    relationship = excluded.relationship,
    is_primary_contact = excluded.is_primary_contact,
    is_financial_responsible = excluded.is_financial_responsible,
    is_emergency_contact = excluded.is_emergency_contact,
    can_pick_up = excluded.can_pick_up,
    receives_communications = excluded.receives_communications;
end;
$$;

create or replace function public.create_and_link_guardian(
  target_student_id uuid,
  guardian_first_name text,
  guardian_last_name text,
  guardian_phone text,
  guardian_relationship text,
  primary_contact boolean default false,
  financial_responsible boolean default false,
  emergency_contact boolean default false
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare target_institution uuid; guardian_id uuid;
begin
  select institution_id into target_institution from public.students where id = target_student_id;
  if target_institution is null or not public.has_institution_role(target_institution, array['owner','admin','secretary']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  select id into guardian_id from public.guardians
    where institution_id = target_institution
      and regexp_replace(primary_phone, '\\s+', '', 'g') = regexp_replace(guardian_phone, '\\s+', '', 'g');
  if guardian_id is null then
    insert into public.guardians (institution_id, first_name, last_name, primary_phone)
    values (target_institution, trim(guardian_first_name), trim(guardian_last_name), trim(guardian_phone))
    returning id into guardian_id;
  end if;
  perform public.link_student_guardian(target_student_id, guardian_id, guardian_relationship,
    primary_contact, financial_responsible, emergency_contact, false, true);
  return guardian_id;
end;
$$;

create or replace function public.batch_reenroll_students(
  source_enrollments uuid[],
  target_academic_year uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  source_id uuid;
  previous public.enrollments%rowtype;
  current_level public.academic_year_levels%rowtype;
  next_level_id uuid;
  target_level public.academic_year_levels%rowtype;
  policy public.reenrollment_policies%rowtype;
  result jsonb := '[]'::jsonb;
  created_id uuid;
begin
  if coalesce(array_length(source_enrollments, 1), 0) = 0 then raise exception 'empty_selection'; end if;
  foreach source_id in array source_enrollments loop
    begin
      previous := null;
      select * into previous from public.enrollments where id = source_id;
      if not found then raise exception 'source_enrollment_not_found'; end if;
      if not public.has_institution_role(previous.institution_id, array['owner','admin','secretary']::public.app_role[]) then raise exception 'permission_denied'; end if;
      select * into policy from public.reenrollment_policies where institution_id = previous.institution_id;
      if not policy.allow_batch then raise exception 'batch_reenrollment_disabled'; end if;
      select * into current_level from public.academic_year_levels where id = previous.academic_year_level_id;
      select gl.next_level_id into next_level_id from public.grade_levels gl where gl.id = current_level.level_id;
      if next_level_id is null then raise exception 'next_level_not_configured'; end if;
      select * into target_level from public.academic_year_levels
        where academic_year_id = target_academic_year and institution_id = previous.institution_id
          and level_id = next_level_id and is_active;
      if not found then raise exception 'next_level_not_active_in_target_year'; end if;
      created_id := public.reenroll_student(previous.id, target_academic_year, target_level.id,
        'promotion', policy.batch_result_status, null);
      result := result || jsonb_build_array(jsonb_build_object('source_enrollment_id', source_id,
        'student_id', previous.student_id, 'status', 'created', 'enrollment_id', created_id,
        'target_level', target_level.level_name_snapshot));
    exception when others then
      result := result || jsonb_build_array(jsonb_build_object('source_enrollment_id', source_id,
        'student_id', previous.student_id, 'status', 'error', 'reason', sqlerrm));
    end;
  end loop;
  return result;
end;
$$;

revoke all on function public.link_student_guardian(uuid,uuid,text,boolean,boolean,boolean,boolean,boolean) from public;
revoke all on function public.create_and_link_guardian(uuid,text,text,text,text,boolean,boolean,boolean) from public;
revoke all on function public.batch_reenroll_students(uuid[],uuid) from public;
grant execute on function public.link_student_guardian(uuid,uuid,text,boolean,boolean,boolean,boolean,boolean) to authenticated;
grant execute on function public.create_and_link_guardian(uuid,text,text,text,text,boolean,boolean,boolean) to authenticated;
grant execute on function public.batch_reenroll_students(uuid[],uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607170017_classes_documents.sql
-- -----------------------------------------------------------------------------

create table public.school_classes (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  academic_year_level_id uuid not null references public.academic_year_levels(id) on delete restrict,
  name text not null,
  code text not null,
  capacity integer check (capacity is null or capacity > 0),
  room text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, academic_year_id, code)
);
create table public.class_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  class_id uuid not null references public.school_classes(id) on delete restrict,
  starts_on date not null default current_date,
  ends_on date,
  end_reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index class_assignments_one_active on public.class_assignments(enrollment_id) where ends_on is null;

create table public.document_requirements (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  code text not null,
  required_for_pre_registration boolean not null default false,
  required_for_confirmation boolean not null default true,
  expires boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, code)
);
create table public.student_documents (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  enrollment_id uuid references public.enrollments(id) on delete restrict,
  requirement_id uuid not null references public.document_requirements(id) on delete restrict,
  status text not null default 'missing' check (status in ('missing','provided','not_applicable','rejected')),
  file_path text,
  notes text,
  received_on date,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, enrollment_id, requirement_id)
);

create trigger school_classes_set_updated_at before update on public.school_classes for each row execute function public.set_updated_at();
create trigger document_requirements_set_updated_at before update on public.document_requirements for each row execute function public.set_updated_at();
create trigger student_documents_set_updated_at before update on public.student_documents for each row execute function public.set_updated_at();

create or replace function public.assign_enrollment_to_class(target_enrollment uuid, target_class uuid, change_reason text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare enrollment_row public.enrollments%rowtype; class_row public.school_classes%rowtype; policy public.enrollment_policies%rowtype; active_count integer; assignment_id uuid;
begin
  select * into enrollment_row from public.enrollments where id = target_enrollment;
  if not found or not public.has_institution_role(enrollment_row.institution_id, array['owner','admin','secretary']::public.app_role[]) then raise exception 'permission_denied'; end if;
  select * into class_row from public.school_classes where id = target_class and is_active;
  if not found or class_row.institution_id <> enrollment_row.institution_id or class_row.academic_year_id <> enrollment_row.academic_year_id or class_row.academic_year_level_id <> enrollment_row.academic_year_level_id then raise exception 'class_enrollment_mismatch'; end if;
  select * into policy from public.enrollment_policies where institution_id = enrollment_row.institution_id;
  select count(*) into active_count from public.class_assignments where class_id = target_class and ends_on is null;
  if class_row.capacity is not null and active_count >= class_row.capacity and policy.capacity_mode = 'blocking' then raise exception 'class_capacity_reached'; end if;
  update public.class_assignments set ends_on = current_date, end_reason = coalesce(nullif(trim(change_reason),''),'Changement de classe') where enrollment_id = target_enrollment and ends_on is null;
  insert into public.class_assignments(institution_id,academic_year_id,enrollment_id,class_id,created_by)
  values(enrollment_row.institution_id,enrollment_row.academic_year_id,target_enrollment,target_class,(select auth.uid())) returning id into assignment_id;
  return assignment_id;
end; $$;
revoke all on function public.assign_enrollment_to_class(uuid,uuid,text) from public;
grant execute on function public.assign_enrollment_to_class(uuid,uuid,text) to authenticated;

alter table public.school_classes enable row level security;
alter table public.class_assignments enable row level security;
alter table public.document_requirements enable row level security;
alter table public.student_documents enable row level security;
create policy school_classes_select on public.school_classes for select to authenticated using(public.is_active_member(institution_id));
create policy school_classes_manage on public.school_classes for all to authenticated using(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[])) with check(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[]));
create policy class_assignments_select on public.class_assignments for select to authenticated using(public.is_active_member(institution_id));
create policy class_assignments_manage on public.class_assignments for all to authenticated using(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[])) with check(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[]));
create policy document_requirements_select on public.document_requirements for select to authenticated using(public.is_active_member(institution_id));
create policy document_requirements_manage on public.document_requirements for all to authenticated using(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[])) with check(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]));
create policy student_documents_select on public.student_documents for select to authenticated using(public.is_active_member(institution_id));
create policy student_documents_manage on public.student_documents for all to authenticated using(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[])) with check(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[]));
grant select,insert,update on public.school_classes,public.class_assignments,public.document_requirements,public.student_documents to authenticated;
revoke all on public.school_classes,public.class_assignments,public.document_requirements,public.student_documents from anon;

insert into public.document_requirements(institution_id,name,code,required_for_confirmation)
select id,'Extrait de naissance','BIRTH_CERTIFICATE',true from public.institutions on conflict do nothing;
create or replace function public.create_default_document_requirement() returns trigger language plpgsql security definer set search_path='' as $$ begin
  insert into public.document_requirements(institution_id,name,code,required_for_confirmation) values(new.id,'Extrait de naissance','BIRTH_CERTIFICATE',true) on conflict do nothing;
  return new;
end; $$;
create trigger institutions_create_default_document after insert on public.institutions for each row execute function public.create_default_document_requirement();


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607170018_class_mode_and_files.sql
-- -----------------------------------------------------------------------------

alter table public.institutions add column class_structure_mode text not null default 'levels_and_classes'
  check (class_structure_mode in ('levels_and_classes','classes_as_levels'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'school-admin',
  'school-admin',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy school_admin_select on storage.objects for select to authenticated using(
  bucket_id='school-admin' and public.is_active_member((storage.foldername(name))[1]::uuid)
);
create policy school_admin_insert on storage.objects for insert to authenticated with check(
  bucket_id='school-admin' and public.has_institution_role((storage.foldername(name))[1]::uuid,array['owner','admin','secretary']::public.app_role[])
);
create policy school_admin_update on storage.objects for update to authenticated using(
  bucket_id='school-admin' and public.has_institution_role((storage.foldername(name))[1]::uuid,array['owner','admin','secretary']::public.app_role[])
) with check(
  bucket_id='school-admin' and public.has_institution_role((storage.foldername(name))[1]::uuid,array['owner','admin','secretary']::public.app_role[])
);

create or replace function public.create_school_class(
  target_year_id uuid, target_annual_level_id uuid, target_annual_cycle_id uuid,
  class_name text, class_code text, class_capacity integer default null, class_room text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare target_year public.academic_years%rowtype; target_institution public.institutions%rowtype; annual_cycle public.academic_year_cycles%rowtype; level_id uuid; annual_level_id uuid; class_id uuid; next_order integer;
begin
  select * into target_year from public.academic_years where id=target_year_id;
  if not found or not public.has_institution_role(target_year.institution_id,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if target_year.status in ('closed','archived') then raise exception 'academic_year_configuration_locked'; end if;
  select * into target_institution from public.institutions where id=target_year.institution_id;
  if target_institution.class_structure_mode='classes_as_levels' then
    select * into annual_cycle from public.academic_year_cycles where id=target_annual_cycle_id and academic_year_id=target_year_id and is_active;
    if not found then raise exception 'annual_cycle_required'; end if;
    select coalesce(max(sort_order),0)+1 into next_order from public.grade_levels where cycle_id=annual_cycle.cycle_id;
    insert into public.grade_levels(institution_id,cycle_id,name,code,sort_order)
    values(target_year.institution_id,annual_cycle.cycle_id,trim(class_name),upper(trim(class_code)),next_order) returning id into level_id;
    insert into public.academic_year_levels(institution_id,academic_year_id,cycle_id,level_id,cycle_name_snapshot,level_name_snapshot)
    values(target_year.institution_id,target_year_id,annual_cycle.cycle_id,level_id,'','') returning id into annual_level_id;
  else
    select id into annual_level_id from public.academic_year_levels where id=target_annual_level_id and academic_year_id=target_year_id and is_active;
    if annual_level_id is null then raise exception 'annual_level_required'; end if;
  end if;
  insert into public.school_classes(institution_id,academic_year_id,academic_year_level_id,name,code,capacity,room)
  values(target_year.institution_id,target_year_id,annual_level_id,trim(class_name),upper(trim(class_code)),class_capacity,nullif(trim(class_room),'')) returning id into class_id;
  return class_id;
end; $$;
revoke all on function public.create_school_class(uuid,uuid,uuid,text,text,integer,text) from public;
grant execute on function public.create_school_class(uuid,uuid,uuid,text,text,integer,text) to authenticated;


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607170019_align_academic_year_cycles.sql
-- -----------------------------------------------------------------------------

create or replace function public.enforce_academic_year_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'preparation' and new.status = 'open') or
    (old.status = 'open' and new.status = 'closed') or
    (old.status = 'closed' and new.status = 'archived')
  ) then
    raise exception 'invalid_academic_year_transition';
  end if;

  if new.status = 'open' and not exists (
    select 1
    from public.academic_year_levels
    where academic_year_id = new.id and is_active
  ) then
    raise exception 'academic_structure_required';
  end if;

  return new;
end;
$$;

create or replace function public.set_institution_cycle(
  target_institution_id uuid,
  target_catalog_cycle_id uuid,
  target_active boolean,
  target_year_id uuid
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  catalog public.cycle_catalog%rowtype;
  selected_year public.academic_years%rowtype;
  catalog_cycle uuid;
  activation_id uuid;
  annual_cycle_id uuid;
begin
  if not public.has_institution_role(
    target_institution_id,
    array['owner','admin']::public.app_role[]
  ) then
    raise exception 'permission_denied';
  end if;

  if target_year_id is null then
    raise exception 'academic_year_required';
  end if;

  select * into selected_year
  from public.academic_years
  where id = target_year_id
    and institution_id = target_institution_id;

  if selected_year.id is null then
    raise exception 'academic_year_not_found';
  end if;

  if selected_year.status in ('closed', 'archived') then
    raise exception 'academic_year_configuration_locked';
  end if;

  select * into catalog
  from public.cycle_catalog
  where id = target_catalog_cycle_id
    and is_active;

  if catalog.id is null then
    raise exception 'catalog_cycle_not_found';
  end if;

  select academic_cycle_id, id
  into catalog_cycle, activation_id
  from public.institution_cycles
  where institution_id = target_institution_id
    and catalog_cycle_id = catalog.id;

  if catalog_cycle is null then
    insert into public.academic_cycles(
      institution_id,
      name,
      code,
      sort_order,
      is_active
    ) values (
      target_institution_id,
      catalog.name,
      catalog.code,
      catalog.sort_order,
      true
    )
    returning id into catalog_cycle;
  end if;

  insert into public.institution_cycles(
    institution_id,
    catalog_cycle_id,
    academic_cycle_id,
    sort_order,
    is_active
  ) values (
    target_institution_id,
    catalog.id,
    catalog_cycle,
    catalog.sort_order,
    true
  )
  on conflict(institution_id, catalog_cycle_id) do update
    set academic_cycle_id = excluded.academic_cycle_id,
        sort_order = excluded.sort_order,
        is_active = true
  returning id into activation_id;

  select id into annual_cycle_id
  from public.academic_year_cycles
  where academic_year_id = target_year_id
    and cycle_id = catalog_cycle;

  if target_active then
    if annual_cycle_id is null then
      insert into public.academic_year_cycles(
        institution_id,
        academic_year_id,
        cycle_id,
        name,
        code,
        sort_order
      ) values (
        target_institution_id,
        target_year_id,
        catalog_cycle,
        catalog.name,
        catalog.code,
        catalog.sort_order
      );
    end if;
  elsif annual_cycle_id is not null then
    if exists (
      select 1
      from public.academic_year_levels
      where academic_year_cycle_id = annual_cycle_id
    ) then
      raise exception 'annual_cycle_not_empty';
    end if;

    delete from public.academic_year_cycles
    where id = annual_cycle_id;
  end if;

  return activation_id;
end;
$$;

revoke all on function public.set_institution_cycle(uuid,uuid,boolean,uuid) from public;
grant execute on function public.set_institution_cycle(uuid,uuid,boolean,uuid) to authenticated;

