do $$
declare
  institution uuid; employee_fixed uuid; employee_hourly uuid; contract_hourly uuid; period uuid; entry uuid;
begin
  select id into institution from public.institutions order by created_at limit 1;
  if institution is null then return; end if;

  insert into public.personnel_catalog_items(institution_id, category, code, default_label, is_system, display_order) values
    (institution,'function','teacher','Enseignant',true,10), (institution,'function','secretary','Secrétaire',true,20),
    (institution,'contract_type','permanent','Permanent',true,10), (institution,'contract_type','vacation','Vacation',true,20),
    (institution,'work_type','normal_course','Cours normal',true,10), (institution,'bonus_type','responsibility','Responsabilité',true,10),
    (institution,'deduction_type','absence','Absence non rémunérée',true,10), (institution,'leave_type','annual','Congé annuel',true,10)
  on conflict (institution_id, category, code) do nothing;

  insert into public.employees(institution_id, employee_number, first_name, last_name, phone, email, hired_on)
  values (institution,'PER-0001','Mariam','Camara','+224 620 00 00 01','mariam.camara@geecole.local','2025-09-01') returning id into employee_fixed;
  insert into public.employees(institution_id, employee_number, first_name, last_name, phone, email, hired_on)
  values (institution,'PER-0002','Ibrahima','Diallo','+224 620 00 00 02','ibrahima.diallo@geecole.local','2025-09-01') returning id into employee_hourly;

  insert into public.employee_contracts(institution_id, employee_id, starts_on, status, compensation_mode, fixed_amount, reference)
  values (institution, employee_fixed, '2025-09-01', 'active', 'fixed', 3500000, 'CTR-2025-001');
  insert into public.employee_contracts(institution_id, employee_id, starts_on, status, compensation_mode, hourly_rate, reference)
  values (institution, employee_hourly, '2025-09-01', 'active', 'hourly', 75000, 'CTR-2025-002') returning id into contract_hourly;

  insert into public.work_entries(institution_id, employee_id, contract_id, work_date, minutes, rate, status, validated_at)
  values (institution, employee_hourly, contract_hourly, '2026-07-02', 120, 75000, 'validated', now()),
         (institution, employee_hourly, contract_hourly, '2026-07-09', 90, 75000, 'completed', null);

  insert into public.payroll_periods(institution_id, name, starts_on, ends_on, status)
  values (institution, 'Juillet 2026', '2026-07-01', '2026-07-31', 'calculated') returning id into period;
  insert into public.payroll_entries(institution_id, period_id, employee_id, fixed_amount, status)
  values (institution, period, employee_fixed, 3500000, 'calculated');
  insert into public.payroll_entries(institution_id, period_id, employee_id, contract_id, variable_amount, status)
  values (institution, period, employee_hourly, contract_hourly, 150000, 'calculated') returning id into entry;
  update public.work_entries set payroll_entry_id=entry where employee_id=employee_hourly and status='validated';
end $$;
