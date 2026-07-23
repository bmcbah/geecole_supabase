-- Scolarité Phase 2: backend validation and controlled enrollment transitions.
-- Depends on 20260723120000_schooling_phase_1_foundation.sql.

-- ---------------------------------------------------------------------------
-- Compatibility fix: normalize the history table created by the legacy schema.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrollment_status_history'
      and column_name = 'previous_status'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrollment_status_history'
      and column_name = 'from_status'
  ) then
    alter table public.enrollment_status_history rename column previous_status to from_status;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrollment_status_history'
      and column_name = 'new_status'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrollment_status_history'
      and column_name = 'to_status'
  ) then
    alter table public.enrollment_status_history rename column new_status to to_status;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrollment_status_history'
      and column_name = 'changed_by'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrollment_status_history'
      and column_name = 'performed_by'
  ) then
    alter table public.enrollment_status_history rename column changed_by to performed_by;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrollment_status_history'
      and column_name = 'changed_at'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrollment_status_history'
      and column_name = 'performed_at'
  ) then
    alter table public.enrollment_status_history rename column changed_at to performed_at;
  end if;
end
$$;

alter table public.enrollment_status_history
  alter column from_status drop not null;

-- Legacy RPC wrote history itself while the new trigger also writes it.
-- It is replaced below to avoid duplicate timeline entries.

-- ---------------------------------------------------------------------------
-- Validation engine
-- ---------------------------------------------------------------------------

create or replace function public.evaluate_enrollment(target_enrollment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  enrollment_row public.enrollments%rowtype;
  policy_row public.enrollment_policies%rowtype;
  active_class public.class_assignments%rowtype;
  selected_class public.school_classes%rowtype;
  missing_documents integer := 0;
  active_count integer := 0;
  result jsonb;
begin
  select * into enrollment_row
  from public.enrollments
  where id = target_enrollment_id
  for update;

  if not found then
    raise exception 'enrollment_not_found';
  end if;

  if not public.has_institution_role(
    enrollment_row.institution_id,
    array['owner','admin','secretary']::public.app_role[]
  ) then
    raise exception 'permission_denied';
  end if;

  select * into policy_row
  from public.enrollment_policies
  where institution_id = enrollment_row.institution_id;

  if policy_row.institution_id is null then
    raise exception 'enrollment_policy_missing';
  end if;

  delete from public.enrollment_validation_results
  where enrollment_id = target_enrollment_id;

  if not exists (
    select 1
    from public.student_guardians link
    join public.guardians guardian on guardian.id = link.guardian_id
    where link.student_id = enrollment_row.student_id
      and link.is_primary_contact
      and link.ends_on is null
      and guardian.status = 'active'
  ) then
    insert into public.enrollment_validation_results (
      institution_id, enrollment_id, code, severity, domain, message_key,
      resolution_action, evaluated_by
    ) values (
      enrollment_row.institution_id, enrollment_row.id,
      'PRIMARY_GUARDIAN_REQUIRED', 'blocking', 'guardians',
      'schooling.enrollment.validation.primary_guardian_required',
      'open_guardians', auth.uid()
    );
  end if;

  select * into active_class
  from public.class_assignments
  where enrollment_id = enrollment_row.id and ends_on is null
  limit 1;

  if policy_row.require_class_assignment and active_class.id is null then
    insert into public.enrollment_validation_results (
      institution_id, enrollment_id, code, severity, domain, message_key,
      resolution_action, evaluated_by
    ) values (
      enrollment_row.institution_id, enrollment_row.id,
      'CLASS_ASSIGNMENT_REQUIRED', 'blocking', 'class_assignment',
      'schooling.enrollment.validation.class_assignment_required',
      'assign_class', auth.uid()
    );
  elsif active_class.id is not null then
    select * into selected_class from public.school_classes where id = active_class.class_id;

    select count(*) into active_count
    from public.class_assignments
    where class_id = active_class.class_id and ends_on is null;

    if selected_class.capacity is not null and active_count > selected_class.capacity then
      insert into public.enrollment_validation_results (
        institution_id, enrollment_id, code, severity, domain, message_key,
        details, resolution_action, evaluated_by
      ) values (
        enrollment_row.institution_id, enrollment_row.id,
        'CLASS_CAPACITY_EXCEEDED',
        case policy_row.capacity_mode
          when 'blocking' then 'blocking'
          when 'warning' then 'warning'
          else 'information'
        end,
        'capacity', 'schooling.enrollment.validation.class_capacity_exceeded',
        jsonb_build_object(
          'class_id', selected_class.id,
          'capacity', selected_class.capacity,
          'active_count', active_count
        ),
        'change_class', auth.uid()
      );
    end if;
  end if;

  select count(*) into missing_documents
  from public.document_requirements requirement
  where requirement.institution_id = enrollment_row.institution_id
    and requirement.is_active
    and requirement.required_for_confirmation
    and not exists (
      select 1
      from public.student_documents document
      where document.student_id = enrollment_row.student_id
        and (document.enrollment_id = enrollment_row.id or document.enrollment_id is null)
        and document.requirement_id = requirement.id
        and document.status in ('provided', 'not_applicable')
    );

  if missing_documents > 0 then
    insert into public.enrollment_validation_results (
      institution_id, enrollment_id, code, severity, domain, message_key,
      details, resolution_action, evaluated_by
    ) values (
      enrollment_row.institution_id, enrollment_row.id,
      'REQUIRED_DOCUMENTS_MISSING',
      case when policy_row.allow_missing_documents then 'warning' else 'blocking' end,
      'documents', 'schooling.enrollment.validation.required_documents_missing',
      jsonb_build_object('missing_count', missing_documents),
      'open_documents', auth.uid()
    );
  end if;

  if enrollment_row.source_enrollment_id is not null
    and enrollment_row.pedagogical_decision is null
  then
    insert into public.enrollment_validation_results (
      institution_id, enrollment_id, code, severity, domain, message_key,
      resolution_action, evaluated_by
    ) values (
      enrollment_row.institution_id, enrollment_row.id,
      'PEDAGOGICAL_DECISION_MISSING', 'warning', 'pedagogy',
      'schooling.enrollment.validation.pedagogical_decision_missing',
      'set_pedagogical_decision', auth.uid()
    );
  end if;

  if not exists (
    select 1 from public.enrollment_validation_results
    where enrollment_id = enrollment_row.id
  ) then
    insert into public.enrollment_validation_results (
      institution_id, enrollment_id, code, severity, domain, message_key,
      evaluated_by
    ) values (
      enrollment_row.institution_id, enrollment_row.id,
      'ENROLLMENT_READY', 'success', 'enrollment',
      'schooling.enrollment.validation.ready', auth.uid()
    );
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'code', validation.code,
    'severity', validation.severity,
    'domain', validation.domain,
    'message_key', validation.message_key,
    'details', validation.details,
    'resolution_action', validation.resolution_action
  ) order by case validation.severity
      when 'blocking' then 1 when 'warning' then 2
      when 'information' then 3 else 4 end, validation.code), '[]'::jsonb)
  into result
  from public.enrollment_validation_results validation
  where validation.enrollment_id = enrollment_row.id;

  return result;
end;
$$;

revoke all on function public.evaluate_enrollment(uuid) from public;
grant execute on function public.evaluate_enrollment(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Controlled state machine
-- ---------------------------------------------------------------------------

create or replace function public.transition_enrollment(
  target_enrollment_id uuid,
  target_status public.enrollment_status,
  change_reason text default null,
  transfer_destination text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  enrollment_row public.enrollments%rowtype;
  year_row public.academic_years%rowtype;
  validation jsonb;
begin
  select * into enrollment_row
  from public.enrollments
  where id = target_enrollment_id
  for update;

  if not found then raise exception 'enrollment_not_found'; end if;

  if not public.has_institution_role(
    enrollment_row.institution_id,
    array['owner','admin','secretary']::public.app_role[]
  ) then raise exception 'permission_denied'; end if;

  select * into year_row
  from public.academic_years
  where id = enrollment_row.academic_year_id;

  if year_row.status in ('closed', 'archived') then
    raise exception 'academic_year_read_only';
  end if;

  if enrollment_row.status = target_status then
    raise exception 'enrollment_status_unchanged';
  end if;

  if not (
    (enrollment_row.status = 'draft' and target_status in ('pre_registered','pending','confirmed','cancelled')) or
    (enrollment_row.status = 'pre_registered' and target_status in ('pending','confirmed','rejected','withdrawn','cancelled')) or
    (enrollment_row.status = 'pending' and target_status in ('confirmed','rejected','withdrawn','cancelled')) or
    (enrollment_row.status = 'confirmed' and target_status in ('cancelled','transferred'))
  ) then
    raise exception 'invalid_enrollment_transition';
  end if;

  if target_status in ('cancelled','rejected','withdrawn','transferred')
    and char_length(trim(coalesce(change_reason, ''))) < 3
  then raise exception 'reason_required'; end if;

  if target_status = 'transferred'
    and char_length(trim(coalesce(transfer_destination, ''))) < 2
  then raise exception 'transfer_destination_required'; end if;

  if target_status = 'confirmed' then
    validation := public.evaluate_enrollment(target_enrollment_id);
    if exists (
      select 1 from jsonb_array_elements(validation) item
      where item->>'severity' = 'blocking'
    ) then
      raise exception 'enrollment_has_blocking_validations';
    end if;
  end if;

  update public.enrollments
  set status = target_status,
      confirmed_at = case when target_status = 'confirmed' then now() else confirmed_at end,
      confirmed_by = case when target_status = 'confirmed' then auth.uid() else confirmed_by end,
      cancellation_reason = case when target_status = 'cancelled' then trim(change_reason) else cancellation_reason end,
      rejection_reason = case when target_status = 'rejected' then trim(change_reason) else rejection_reason end,
      withdrawal_reason = case when target_status = 'withdrawn' then trim(change_reason) else withdrawal_reason end,
      transfer_destination = case when target_status = 'transferred' then trim(transfer_destination) else transfer_destination end,
      updated_by = auth.uid(),
      updated_at = now()
  where id = target_enrollment_id;

  return jsonb_build_object(
    'enrollment_id', target_enrollment_id,
    'from_status', enrollment_row.status,
    'to_status', target_status,
    'validations', coalesce(validation, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.transition_enrollment(uuid,public.enrollment_status,text,text) from public;
grant execute on function public.transition_enrollment(uuid,public.enrollment_status,text,text) to authenticated;

create or replace function public.change_enrollment_status(
  target_enrollment_id uuid,
  target_status public.enrollment_status,
  change_reason text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.transition_enrollment(target_enrollment_id, target_status, change_reason, null);
end;
$$;

revoke all on function public.change_enrollment_status(uuid,public.enrollment_status,text) from public;
grant execute on function public.change_enrollment_status(uuid,public.enrollment_status,text) to authenticated;

create or replace function public.submit_enrollment(target_enrollment_id uuid)
returns jsonb language sql security definer set search_path = '' as $$
  select public.transition_enrollment(target_enrollment_id, 'pending', null, null);
$$;

create or replace function public.confirm_enrollment(target_enrollment_id uuid)
returns jsonb language sql security definer set search_path = '' as $$
  select public.transition_enrollment(target_enrollment_id, 'confirmed', null, null);
$$;

create or replace function public.reject_enrollment(target_enrollment_id uuid, reason text)
returns jsonb language sql security definer set search_path = '' as $$
  select public.transition_enrollment(target_enrollment_id, 'rejected', reason, null);
$$;

create or replace function public.withdraw_enrollment(target_enrollment_id uuid, reason text)
returns jsonb language sql security definer set search_path = '' as $$
  select public.transition_enrollment(target_enrollment_id, 'withdrawn', reason, null);
$$;

create or replace function public.cancel_enrollment(target_enrollment_id uuid, reason text)
returns jsonb language sql security definer set search_path = '' as $$
  select public.transition_enrollment(target_enrollment_id, 'cancelled', reason, null);
$$;

create or replace function public.transfer_enrollment(
  target_enrollment_id uuid,
  destination text,
  reason text
) returns jsonb language sql security definer set search_path = '' as $$
  select public.transition_enrollment(target_enrollment_id, 'transferred', reason, destination);
$$;

revoke all on function public.submit_enrollment(uuid) from public;
revoke all on function public.confirm_enrollment(uuid) from public;
revoke all on function public.reject_enrollment(uuid,text) from public;
revoke all on function public.withdraw_enrollment(uuid,text) from public;
revoke all on function public.cancel_enrollment(uuid,text) from public;
revoke all on function public.transfer_enrollment(uuid,text,text) from public;

grant execute on function public.submit_enrollment(uuid) to authenticated;
grant execute on function public.confirm_enrollment(uuid) to authenticated;
grant execute on function public.reject_enrollment(uuid,text) to authenticated;
grant execute on function public.withdraw_enrollment(uuid,text) to authenticated;
grant execute on function public.cancel_enrollment(uuid,text) to authenticated;
grant execute on function public.transfer_enrollment(uuid,text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Re-enrollment compatibility and controlled confirmation
-- ---------------------------------------------------------------------------

create or replace function public.reenroll_student(
  source_enrollment uuid,
  target_academic_year uuid,
  target_annual_level uuid,
  target_decision text,
  target_enrollment_status public.enrollment_status default 'pre_registered',
  target_reason text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous public.enrollments%rowtype;
  target_year public.academic_years%rowtype;
  annual_level public.academic_year_levels%rowtype;
  policy public.reenrollment_policies%rowtype;
  initial_status public.enrollment_status;
  new_enrollment_id uuid;
  normalized_decision text;
begin
  select * into previous from public.enrollments where id = source_enrollment for update;
  if not found then raise exception 'source_enrollment_not_found'; end if;
  if not public.has_institution_role(previous.institution_id, array['owner','admin','secretary']::public.app_role[])
    then raise exception 'permission_denied'; end if;
  if previous.status <> 'confirmed' then raise exception 'source_enrollment_not_confirmed'; end if;
  if previous.academic_year_id = target_academic_year then raise exception 'target_year_must_differ'; end if;

  select * into target_year from public.academic_years
  where id = target_academic_year and institution_id = previous.institution_id;
  if not found or target_year.status not in ('preparation','open')
    then raise exception 'target_year_not_available'; end if;

  select * into annual_level from public.academic_year_levels
  where id = target_annual_level and institution_id = previous.institution_id
    and academic_year_id = target_academic_year and is_active;
  if not found then raise exception 'invalid_target_level'; end if;

  select * into policy from public.reenrollment_policies
  where institution_id = previous.institution_id;
  if policy.institution_id is null then raise exception 'reenrollment_policy_missing'; end if;
  if target_year.status = 'preparation' and not policy.allow_early_preparation
    then raise exception 'early_reenrollment_disabled'; end if;
  if target_enrollment_status not in ('draft','pre_registered','pending','confirmed')
    then raise exception 'invalid_target_status'; end if;
  if target_enrollment_status = 'confirmed' and not policy.allow_direct_confirmation
    then raise exception 'direct_confirmation_disabled'; end if;

  normalized_decision := case target_decision
    when 'promotion' then 'promoted'
    when 'repeat' then 'repeat'
    when 'skip' then 'redirected'
    when 'exceptional' then 'admitted'
    when 'pending' then 'pending'
    else null
  end;
  if normalized_decision is null then raise exception 'invalid_academic_decision'; end if;
  if target_decision <> 'promotion' and nullif(trim(target_reason), '') is null
    then raise exception 'decision_reason_required'; end if;
  if target_decision = 'repeat' and policy.repeat_mode = 'forbidden'
    then raise exception 'repeat_forbidden'; end if;

  initial_status := case when target_enrollment_status = 'confirmed' then 'pending' else target_enrollment_status end;

  insert into public.enrollments (
    institution_id, academic_year_id, student_id, academic_year_level_id,
    requested_academic_year_level_id, status, origin,
    level_name_snapshot, cycle_name_snapshot, created_by,
    source_enrollment_id, academic_decision, decision_reason, policy_snapshot,
    pedagogical_decision, pedagogical_decision_reason,
    pedagogical_decision_by, pedagogical_decision_at, lifecycle_snapshot
  ) values (
    previous.institution_id, target_academic_year, previous.student_id,
    target_annual_level, target_annual_level, initial_status, 'returning',
    annual_level.level_name_snapshot, annual_level.cycle_name_snapshot, auth.uid(),
    previous.id, target_decision, nullif(trim(target_reason), ''),
    to_jsonb(policy) - 'created_at' - 'updated_at',
    normalized_decision, nullif(trim(target_reason), ''), auth.uid(), now(),
    jsonb_build_object('source_enrollment_id', previous.id, 'reenrollment_policy', to_jsonb(policy) - 'created_at' - 'updated_at')
  ) returning id into new_enrollment_id;

  if target_enrollment_status = 'confirmed' then
    perform public.confirm_enrollment(new_enrollment_id);
  end if;

  return new_enrollment_id;
end;
$$;

revoke all on function public.reenroll_student(uuid,uuid,uuid,text,public.enrollment_status,text) from public;
grant execute on function public.reenroll_student(uuid,uuid,uuid,text,public.enrollment_status,text) to authenticated;
