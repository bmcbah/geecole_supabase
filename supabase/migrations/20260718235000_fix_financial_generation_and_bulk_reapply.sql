do $$
declare
  function_oid oid;
  function_definition text;
begin
  select p.oid
  into function_oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'generate_student_financial_account'
  order by p.oid
  limit 1;

  if function_oid is null then
    raise exception 'generate_student_financial_account_not_found';
  end if;

  function_definition := pg_get_functiondef(function_oid);

  if position('selected_enrollment.academic_year_cycle_id' in function_definition) > 0 then
    function_definition := replace(
      function_definition,
      'selected_enrollment.academic_year_cycle_id',
      '(select ayl.academic_year_cycle_id from public.academic_year_levels ayl where ayl.id = selected_enrollment.academic_year_level_id)'
    );
    execute function_definition;
  end if;
end
$$;

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
begin
  if not public.has_institution_role(
    target_institution_id,
    array['owner','admin']::public.app_role[]
  ) then
    raise exception 'permission_denied';
  end if;

  for enrollment_record in
    select e.id
    from public.enrollments e
    where e.institution_id = target_institution_id
      and e.academic_year_id = target_academic_year_id
      and e.status = 'confirmed'
    order by e.created_at
  loop
    begin
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
      failed_count := failed_count + 1;
    end;
  end loop;

  return jsonb_build_object(
    'generated', generated_count,
    'regenerated', regenerated_count,
    'skippedPaid', skipped_paid_count,
    'failed', failed_count
  );
end;
$$;

grant execute on function public.reapply_all_student_financial_accounts(uuid, uuid) to authenticated;
