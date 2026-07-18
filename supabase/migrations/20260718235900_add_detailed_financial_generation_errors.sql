create or replace function public.reapply_all_student_financial_accounts(
  target_institution_id uuid,
  target_academic_year_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  enrollment_record record;
  existing_account record;
  generated_count integer := 0;
  regenerated_count integer := 0;
  skipped_paid_count integer := 0;
  failed_count integer := 0;
  error_list jsonb := '[]'::jsonb;
  error_message text;
  error_detail text;
  error_hint text;
  error_context text;
  error_sqlstate text;
begin
  if not public.has_institution_role(
    target_institution_id,
    array['owner','admin']::public.app_role[]
  ) then
    raise exception 'permission_denied';
  end if;

  for enrollment_record in
    select
      e.id,
      e.student_id,
      e.level_name_snapshot,
      e.cycle_name_snapshot,
      concat_ws(' ', s.first_name, s.last_name) as student_name,
      s.matricule
    from public.enrollments e
    join public.students s on s.id = e.student_id
    where e.institution_id = target_institution_id
      and e.academic_year_id = target_academic_year_id
      and e.status = 'confirmed'
    order by e.created_at
  loop
    begin
      existing_account := null;

      select a.id, a.paid_amount
      into existing_account
      from public.student_financial_accounts a
      where a.enrollment_id = enrollment_record.id
      limit 1;

      if existing_account.id is null then
        perform public.generate_student_financial_account(enrollment_record.id);
        generated_count := generated_count + 1;
      elsif coalesce(existing_account.paid_amount, 0) > 0 then
        skipped_paid_count := skipped_paid_count + 1;
      else
        delete from public.student_financial_installments where financial_account_id = existing_account.id;
        delete from public.student_financial_adjustments where financial_account_id = existing_account.id;
        delete from public.student_financial_items where financial_account_id = existing_account.id;
        delete from public.student_financial_accounts where id = existing_account.id;
        perform public.generate_student_financial_account(enrollment_record.id);
        regenerated_count := regenerated_count + 1;
      end if;
    exception when others then
      get stacked diagnostics
        error_message = message_text,
        error_detail = pg_exception_detail,
        error_hint = pg_exception_hint,
        error_context = pg_exception_context,
        error_sqlstate = returned_sqlstate;

      failed_count := failed_count + 1;
      error_list := error_list || jsonb_build_array(jsonb_build_object(
        'enrollmentId', enrollment_record.id,
        'studentId', enrollment_record.student_id,
        'studentName', enrollment_record.student_name,
        'matricule', enrollment_record.matricule,
        'levelName', enrollment_record.level_name_snapshot,
        'cycleName', enrollment_record.cycle_name_snapshot,
        'code', error_sqlstate,
        'message', error_message,
        'detail', nullif(error_detail, ''),
        'hint', nullif(error_hint, ''),
        'context', nullif(error_context, '')
      ));
    end;
  end loop;

  return jsonb_build_object(
    'generated', generated_count,
    'regenerated', regenerated_count,
    'skippedPaid', skipped_paid_count,
    'failed', failed_count,
    'errors', error_list
  );
end;
$$;

grant execute on function public.reapply_all_student_financial_accounts(uuid, uuid) to authenticated;
