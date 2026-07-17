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
