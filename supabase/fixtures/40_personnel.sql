do $$
declare
  institution uuid;
  employee_fixed uuid;
  employee_hourly uuid;
  employee_mixed uuid;
  employee_session uuid;
  employee_flat uuid;
  employee_unpaid uuid;
  employee_suspended uuid;
  employee_exited uuid;
  contract_fixed uuid;
  contract_hourly uuid;
  contract_mixed uuid;
  contract_session uuid;
  contract_flat uuid;
  period_current uuid;
  period_previous uuid;
  entry_fixed uuid;
  entry_hourly uuid;
  entry_mixed uuid;
  entry_session uuid;
  entry_flat uuid;
  teacher_function uuid;
  secretary_function uuid;
  accountant_function uuid;
  supervisor_function uuid;
  director_function uuid;
  cleaner_function uuid;
  permanent_contract uuid;
  vacation_contract uuid;
  service_contract uuid;
  course_work uuid;
  overtime_work uuid;
  annual_leave uuid;
  sick_leave uuid;
  unpaid_leave uuid;
  salary_advance uuid;
  emergency_advance uuid;
  warning_sanction uuid;
  suspension_sanction uuid;
  responsibility_bonus uuid;
  transport_bonus uuid;
  absence_deduction uuid;
begin
  select id into institution from public.institutions order by created_at limit 1;
  if institution is null then return; end if;

  insert into public.personnel_catalog_items(
    institution_id, category, code, default_label, is_system, display_order
  ) values
    (institution,'function','TEACHER','Enseignant(e)',true,10),
    (institution,'function','DIRECTOR','Directeur / Directrice',true,20),
    (institution,'function','SECRETARY','Secrétaire',true,30),
    (institution,'function','ACCOUNTANT','Comptable',true,40),
    (institution,'function','SUPERVISOR','Surveillant(e)',true,50),
    (institution,'function','CLEANER','Agent d’entretien',true,60),
    (institution,'contract_type','PERMANENT','Permanent',true,10),
    (institution,'contract_type','VACATION','Vacation',true,20),
    (institution,'contract_type','SERVICE','Prestation de service',true,30),
    (institution,'work_type','NORMAL_COURSE','Cours normal',true,10),
    (institution,'work_type','OVERTIME','Heures supplémentaires',true,20),
    (institution,'bonus_type','RESPONSIBILITY','Responsabilité',true,10),
    (institution,'bonus_type','TRANSPORT','Transport',true,20),
    (institution,'deduction_type','ABSENCE','Absence non rémunérée',true,10),
    (institution,'advance_type','SALARY','Avance sur salaire',true,10),
    (institution,'advance_type','EMERGENCY','Avance exceptionnelle',true,20),
    (institution,'leave_type','ANNUAL','Congé annuel',true,10),
    (institution,'leave_type','SICK','Congé maladie',true,20),
    (institution,'leave_type','UNPAID','Congé sans solde',true,30),
    (institution,'sanction_type','WARNING','Avertissement',true,10),
    (institution,'sanction_type','SUSPENSION','Suspension',true,20)
  on conflict (institution_id, category, code) do nothing;

  select id into teacher_function from public.personnel_catalog_items where institution_id=institution and category='function' and upper(code)='TEACHER' limit 1;
  select id into director_function from public.personnel_catalog_items where institution_id=institution and category='function' and upper(code)='DIRECTOR' limit 1;
  select id into secretary_function from public.personnel_catalog_items where institution_id=institution and category='function' and upper(code)='SECRETARY' limit 1;
  select id into accountant_function from public.personnel_catalog_items where institution_id=institution and category='function' and upper(code)='ACCOUNTANT' limit 1;
  select id into supervisor_function from public.personnel_catalog_items where institution_id=institution and category='function' and upper(code)='SUPERVISOR' limit 1;
  select id into cleaner_function from public.personnel_catalog_items where institution_id=institution and category='function' and upper(code)='CLEANER' limit 1;
  select id into permanent_contract from public.personnel_catalog_items where institution_id=institution and category='contract_type' and upper(code) in ('PERMANENT','CDI') order by code limit 1;
  select id into vacation_contract from public.personnel_catalog_items where institution_id=institution and category='contract_type' and upper(code)='VACATION' limit 1;
  select id into service_contract from public.personnel_catalog_items where institution_id=institution and category='contract_type' and upper(code)='SERVICE' limit 1;
  select id into course_work from public.personnel_catalog_items where institution_id=institution and category='work_type' and upper(code) in ('NORMAL_COURSE','TEACHING') order by code limit 1;
  select id into overtime_work from public.personnel_catalog_items where institution_id=institution and category='work_type' and upper(code)='OVERTIME' limit 1;
  select id into annual_leave from public.personnel_catalog_items where institution_id=institution and category='leave_type' and upper(code)='ANNUAL' limit 1;
  select id into sick_leave from public.personnel_catalog_items where institution_id=institution and category='leave_type' and upper(code)='SICK' limit 1;
  select id into unpaid_leave from public.personnel_catalog_items where institution_id=institution and category='leave_type' and upper(code)='UNPAID' limit 1;
  select id into salary_advance from public.personnel_catalog_items where institution_id=institution and category='advance_type' and upper(code)='SALARY' limit 1;
  select id into emergency_advance from public.personnel_catalog_items where institution_id=institution and category='advance_type' and upper(code)='EMERGENCY' limit 1;
  select id into warning_sanction from public.personnel_catalog_items where institution_id=institution and category='sanction_type' and upper(code)='WARNING' limit 1;
  select id into suspension_sanction from public.personnel_catalog_items where institution_id=institution and category='sanction_type' and upper(code)='SUSPENSION' limit 1;
  select id into responsibility_bonus from public.personnel_catalog_items where institution_id=institution and category='bonus_type' and upper(code)='RESPONSIBILITY' limit 1;
  select id into transport_bonus from public.personnel_catalog_items where institution_id=institution and category='bonus_type' and upper(code)='TRANSPORT' limit 1;
  select id into absence_deduction from public.personnel_catalog_items where institution_id=institution and category='deduction_type' and upper(code)='ABSENCE' limit 1;

  insert into public.employees(
    institution_id, employee_number, first_name, last_name, gender, birth_date, birth_place,
    nationality, phone, secondary_phone, email, address, emergency_contact_name,
    emergency_contact_phone, identity_type, identity_number, hired_on, status, notes
  ) values
    (institution,'PER-2026-0001','Mariam','Camara','female','1988-03-12','Kindia','Guinéenne','+224620000001',null,'mariam.camara@geecole.local','Kipé, Conakry','Amadou Camara','+224621000001','CNI','GN-CNI-1001','2023-09-01','active','Directrice et enseignante de français.'),
    (institution,'PER-2026-0002','Ibrahima','Diallo','male','1991-07-24','Labé','Guinéenne','+224620000002',null,'ibrahima.diallo@geecole.local','Ratoma, Conakry','Fatoumata Diallo','+224621000002','CNI','GN-CNI-1002','2025-09-01','active','Enseignant rémunéré à l’heure.'),
    (institution,'PER-2026-0003','Fatoumata','Bah','female','1993-11-05','Mamou','Guinéenne','+224620000003',null,'fatoumata.bah@geecole.local','Lambanyi, Conakry','Ousmane Bah','+224621000003','Passeport','GN-PAS-1003','2024-09-02','active','Secrétaire administrative.'),
    (institution,'PER-2026-0004','Alpha','Condé','male','1985-01-18','Kankan','Guinéenne','+224620000004',null,'alpha.conde@geecole.local','Matoto, Conakry','Aïssatou Condé','+224621000004','CNI','GN-CNI-1004','2022-10-01','active','Comptable avec rémunération fixe et heures supplémentaires.'),
    (institution,'PER-2026-0005','Hawa','Sylla','female','1996-06-09','Conakry','Guinéenne','+224620000005',null,'hawa.sylla@geecole.local','Sonfonia, Conakry','Mamadou Sylla','+224621000005','CNI','GN-CNI-1005','2025-09-01','active','Enseignante vacataire payée à la séance.'),
    (institution,'PER-2026-0006','Moussa','Keita','male','1989-09-30','Siguiri','Guinéenne','+224620000006',null,'moussa.keita@geecole.local','Dabompa, Conakry','Nènè Keita','+224621000006','CNI','GN-CNI-1006','2024-01-15','active','Prestataire au forfait pour la maintenance.'),
    (institution,'PER-2026-0007','Nènè','Touré','female','1990-04-22','Boké','Guinéenne','+224620000007',null,'nene.toure@geecole.local','Cosa, Conakry','Mory Touré','+224621000007','CNI','GN-CNI-1007','2023-09-01','suspended','Dossier volontairement suspendu pour la recette.'),
    (institution,'PER-2026-0008','Sékou','Soumah','male','1978-12-14','Dubréka','Guinéenne','+224620000008',null,'sekou.soumah@geecole.local','Dubréka','Kadiatou Soumah','+224621000008','CNI','GN-CNI-1008','2020-09-01','active','Ancien agent conservé dans l’historique.');

  select id into employee_fixed from public.employees where institution_id=institution and employee_number='PER-2026-0001';
  select id into employee_hourly from public.employees where institution_id=institution and employee_number='PER-2026-0002';
  select id into employee_session from public.employees where institution_id=institution and employee_number='PER-2026-0005';
  select id into employee_mixed from public.employees where institution_id=institution and employee_number='PER-2026-0004';
  select id into employee_flat from public.employees where institution_id=institution and employee_number='PER-2026-0006';
  select id into employee_unpaid from public.employees where institution_id=institution and employee_number='PER-2026-0003';
  select id into employee_suspended from public.employees where institution_id=institution and employee_number='PER-2026-0007';
  select id into employee_exited from public.employees where institution_id=institution and employee_number='PER-2026-0008';
  update public.employees set exited_on='2026-06-30', exit_reason='Fin de collaboration' where id=employee_exited;

  insert into public.employee_functions(institution_id,employee_id,function_item_id,is_primary,responsibility,starts_on,ends_on,is_active) values
    (institution,employee_fixed,director_function,true,'Direction générale','2023-09-01',null,true),
    (institution,employee_fixed,teacher_function,false,'Français au collège','2023-09-01',null,true),
    (institution,employee_hourly,teacher_function,true,'Mathématiques au collège','2025-09-01',null,true),
    (institution,employee_unpaid,secretary_function,true,'Secrétariat administratif','2024-09-02',null,true),
    (institution,employee_mixed,accountant_function,true,'Comptabilité et paie','2022-10-01',null,true),
    (institution,employee_session,teacher_function,true,'Sciences physiques au lycée','2025-09-01',null,true),
    (institution,employee_flat,supervisor_function,true,'Maintenance et logistique','2024-01-15',null,true),
    (institution,employee_suspended,cleaner_function,true,'Entretien des locaux','2023-09-01',null,true),
    (institution,employee_exited,supervisor_function,true,'Surveillance générale','2020-09-01','2026-06-30',false);

  insert into public.employee_contracts(
    institution_id,employee_id,contract_type_item_id,reference,starts_on,ends_on,status,
    compensation_mode,fixed_amount,hourly_rate,session_rate,payment_frequency,weekly_hours,payment_method
  ) values
    (institution,employee_fixed,permanent_contract,'CTR-2023-001','2023-09-01',null,'active','fixed',4500000,0,0,'monthly',40,'bank_transfer'),
    (institution,employee_hourly,vacation_contract,'CTR-2025-002','2025-09-01',null,'active','hourly',0,75000,0,'monthly',18,'mobile_money'),
    (institution,employee_mixed,permanent_contract,'CTR-2022-004','2022-10-01',null,'active','mixed',3200000,50000,0,'monthly',40,'bank_transfer'),
    (institution,employee_session,vacation_contract,'CTR-2025-005','2025-09-01',null,'active','session',0,0,120000,'monthly',12,'mobile_money'),
    (institution,employee_flat,service_contract,'CTR-2024-006','2024-01-15',null,'active','flat_rate',2500000,0,0,'monthly',40,'cash'),
    (institution,employee_unpaid,service_contract,'CTR-2024-003','2024-09-02',null,'active','unpaid',0,0,0,'monthly',40,'cash'),
    (institution,employee_suspended,permanent_contract,'CTR-2023-007','2023-09-01',null,'active','fixed',1800000,0,0,'monthly',40,'cash'),
    (institution,employee_exited,permanent_contract,'CTR-2020-008','2020-09-01','2026-06-30','ended','fixed',2200000,0,0,'monthly',40,'cash');

  select id into contract_fixed from public.employee_contracts where employee_id=employee_fixed and status='active';
  select id into contract_hourly from public.employee_contracts where employee_id=employee_hourly and status='active';
  select id into contract_mixed from public.employee_contracts where employee_id=employee_mixed and status='active';
  select id into contract_session from public.employee_contracts where employee_id=employee_session and status='active';
  select id into contract_flat from public.employee_contracts where employee_id=employee_flat and status='active';

  insert into public.employee_compensation_rates(institution_id,employee_id,hourly_rate,effective_from,notes) values
    (institution,employee_hourly,75000,'2025-09-01','Taux contractuel de base'),
    (institution,employee_mixed,50000,'2022-10-01','Taux des heures supplémentaires')
  on conflict do nothing;

  insert into public.work_entries(
    institution_id,employee_id,contract_id,work_type_item_id,work_date,minutes,quantity,rate,status,validated_at,notes
  ) values
    (institution,employee_hourly,contract_hourly,course_work,'2026-07-02',120,1,75000,'validated',now(),'Cours de mathématiques 6e A'),
    (institution,employee_hourly,contract_hourly,course_work,'2026-07-09',90,1,75000,'completed',null,'À valider'),
    (institution,employee_hourly,contract_hourly,course_work,'2026-07-16',120,1,75000,'planned',null,'Cours planifié'),
    (institution,employee_mixed,contract_mixed,overtime_work,'2026-07-05',180,1,50000,'validated',now(),'Préparation de la paie'),
    (institution,employee_mixed,contract_mixed,overtime_work,'2026-07-12',120,1,50000,'rejected',null,'Saisie rejetée'),
    (institution,employee_session,contract_session,course_work,'2026-07-03',120,1,120000,'validated',now(),'Séance de sciences'),
    (institution,employee_session,contract_session,course_work,'2026-07-10',120,1,120000,'validated',now(),'Séance de laboratoire');

  insert into public.leave_requests(
    institution_id,employee_id,leave_type_item_id,starts_on,ends_on,reason,status,
    duration_unit,duration_hours,impacts_payroll,submitted_at,decided_at,decision_comment
  ) values
    (institution,employee_fixed,annual_leave,'2026-08-03','2026-08-14','Congé annuel','submitted','day',null,false,now(),null,null),
    (institution,employee_hourly,sick_leave,'2026-07-20','2026-07-21','Repos médical','approved','day',null,false,now(),now(),'Justificatif reçu'),
    (institution,employee_mixed,annual_leave,'2026-08-24','2026-08-28','Congé familial','draft','day',null,false,null,null,null),
    (institution,employee_session,unpaid_leave,'2026-07-18','2026-07-18','Absence personnelle','rejected','half_day',null,true,now(),now(),'Période d’examen'),
    (institution,employee_flat,sick_leave,'2026-07-22','2026-07-22','Rendez-vous médical','submitted','hour',3,false,now(),null,null);

  insert into public.salary_advances(
    institution_id,employee_id,advance_type_item_id,amount_requested,amount_approved,repaid_amount,
    requested_on,granted_on,paid_on,reason,status,installment_amount,first_repayment_on,decision_comment,decided_at
  ) values
    (institution,employee_hourly,salary_advance,900000,750000,250000,'2026-05-10','2026-05-12','2026-05-12','Dépenses familiales','paid',250000,'2026-06-30','Accord en trois échéances',now()),
    (institution,employee_mixed,emergency_advance,1500000,1200000,0,'2026-07-15',null,null,'Urgence médicale','approved',300000,'2026-08-31','Montant ajusté après étude',now()),
    (institution,employee_session,salary_advance,600000,null,0,'2026-07-19',null,null,'Frais de rentrée','requested',null,null,null,null),
    (institution,employee_flat,emergency_advance,500000,0,0,'2026-06-02',null,null,'Réparation du logement','rejected',null,null,'Demande non éligible',now());

  insert into public.employee_sanctions(
    institution_id,employee_id,sanction_type_item_id,incident_on,decided_on,reason,description,decision,status
  ) values
    (institution,employee_suspended,suspension_sanction,'2026-06-12','2026-06-15','Absences répétées','Trois absences non justifiées constatées.','Suspension temporaire','closed'),
    (institution,employee_hourly,warning_sanction,'2026-07-08',null,'Retards répétés','Deux retards signalés pendant la semaine.',null,'notified'),
    (institution,employee_flat,warning_sanction,'2026-07-17',null,'Matériel non rangé','Incident à documenter avant décision.',null,'draft');

  insert into public.payroll_periods(institution_id,name,starts_on,ends_on,status,validated_at,closed_at)
  values (institution,'Juin 2026','2026-06-01','2026-06-30','closed','2026-06-30 17:00:00+00','2026-07-02 12:00:00+00')
  returning id into period_previous;

  insert into public.payroll_entries(
    institution_id,period_id,employee_id,contract_id,fixed_amount,variable_amount,gains,deductions,
    advance_repayments,paid_amount,status
  ) values
    (institution,period_previous,employee_fixed,contract_fixed,4500000,0,250000,0,0,4750000,'closed'),
    (institution,period_previous,employee_hourly,contract_hourly,0,1800000,0,50000,250000,1500000,'closed'),
    (institution,period_previous,employee_mixed,contract_mixed,3200000,250000,150000,0,0,3600000,'closed');

  insert into public.payroll_periods(institution_id,name,starts_on,ends_on,status)
  values (institution,'Juillet 2026','2026-07-01','2026-07-31','calculated')
  returning id into period_current;

  insert into public.payroll_entries(
    institution_id,period_id,employee_id,contract_id,fixed_amount,variable_amount,gains,deductions,
    advance_repayments,paid_amount,status
  ) values
    (institution,period_current,employee_fixed,contract_fixed,4500000,0,250000,0,0,0,'validated'),
    (institution,period_current,employee_hourly,contract_hourly,0,150000,0,50000,250000,0,'calculated'),
    (institution,period_current,employee_mixed,contract_mixed,3200000,150000,100000,0,0,0,'validated'),
    (institution,period_current,employee_session,contract_session,0,240000,0,0,0,0,'calculated'),
    (institution,period_current,employee_flat,contract_flat,2500000,0,0,100000,0,0,'calculated');

  select id into entry_fixed from public.payroll_entries where period_id=period_current and employee_id=employee_fixed;
  select id into entry_hourly from public.payroll_entries where period_id=period_current and employee_id=employee_hourly;
  select id into entry_mixed from public.payroll_entries where period_id=period_current and employee_id=employee_mixed;
  select id into entry_session from public.payroll_entries where period_id=period_current and employee_id=employee_session;
  select id into entry_flat from public.payroll_entries where period_id=period_current and employee_id=employee_flat;

  insert into public.payroll_adjustments(
    institution_id,payroll_entry_id,kind,catalog_item_id,label,amount,notes
  ) values
    (institution,entry_fixed,'gain',responsibility_bonus,'Prime de responsabilité',250000,'Direction de l’établissement'),
    (institution,entry_hourly,'deduction',absence_deduction,'Absence non rémunérée',50000,'Absence du 18 juillet'),
    (institution,entry_mixed,'gain',transport_bonus,'Prime de transport',100000,'Forfait mensuel'),
    (institution,entry_flat,'deduction',absence_deduction,'Retenue exceptionnelle',100000,'Journée non réalisée');

  update public.work_entries set payroll_entry_id=entry_hourly where employee_id=employee_hourly and status='validated';
  update public.work_entries set payroll_entry_id=entry_mixed where employee_id=employee_mixed and status='validated';
  update public.work_entries set payroll_entry_id=entry_session where employee_id=employee_session and status='validated';
end $$;
