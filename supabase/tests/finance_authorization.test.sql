begin;
select plan(35);

select has_function('public','finance_profile_scope_allows_account',array['uuid','uuid'],'périmètre financier rattaché au profil');
select has_function('public','has_finance_permission_for_account',array['uuid','text'],'permission financière bornée au dossier');
select has_function('public','can_read_financial_account',array['uuid'],'lecture du dossier financier contrôlée');
select has_function('public','can_generate_student_financial_account',array['uuid'],'génération liée à une inscription validée contrôlée');
select has_function('public','build_financial_generation_public_error',array['uuid','uuid','text','text','text','text','uuid'],'erreur publique de génération normalisée');
select has_function('public','reapply_all_student_financial_accounts',array['uuid','uuid'],'régénération financière contrôlée');
select has_function('public','audit_finance_configuration_mutation',array[]::text[],'audit des paramètres financiers présent');
select has_trigger('public','fee_types','fee_types_audit','types de frais audités');
select has_trigger('public','fee_schedules','fee_schedules_audit','grilles tarifaires auditées');
select has_trigger('public','fee_schedule_items','fee_schedule_items_audit','tarifs audités');
select has_trigger('public','payment_plans','payment_plans_audit','plans de paiement audités');
select has_trigger('public','payment_plan_installments','payment_plan_installments_audit','tranches de paiement auditées');
select has_trigger('public','financial_benefit_templates','financial_benefit_templates_audit','modèles d’avantage audités');
select ok((select prosecdef from pg_catalog.pg_proc where oid='public.can_read_financial_account(uuid)'::regprocedure),'lecture financière en SECURITY DEFINER');
select ok((select proconfig @> array['search_path=""'] from pg_catalog.pg_proc where oid='public.can_read_financial_account(uuid)'::regprocedure),'search_path lecture financière verrouillé');
select function_privs_are('public','can_read_financial_account',array['uuid'],'authenticated',array['EXECUTE']);

select ok((select relrowsecurity from pg_catalog.pg_class where oid='public.student_financial_accounts'::regclass),'RLS dossiers financiers active');
select ok((select relrowsecurity from pg_catalog.pg_class where oid='public.student_financial_items'::regclass),'RLS frais figés active');
select ok((select relrowsecurity from pg_catalog.pg_class where oid='public.student_financial_installments'::regclass),'RLS échéances active');
select ok((select relrowsecurity from pg_catalog.pg_class where oid='public.financial_payments'::regclass),'RLS encaissements active');
select ok((select relrowsecurity from pg_catalog.pg_class where oid='public.financial_payment_allocations'::regclass),'RLS affectations de paiement active');
select ok((select relrowsecurity from pg_catalog.pg_class where oid='public.student_financial_adjustments'::regclass),'RLS avantages appliqués active');

select ok(not has_table_privilege('authenticated','public.student_financial_accounts','INSERT'),'aucune création directe de dossier financier');
select ok(not has_table_privilege('authenticated','public.student_financial_accounts','UPDATE'),'aucune modification directe de dossier financier');
select ok(not has_table_privilege('authenticated','public.student_financial_items','INSERT'),'aucune création directe de frais figé');
select ok(not has_table_privilege('authenticated','public.student_financial_installments','INSERT'),'aucune création directe d’échéance');
select function_privs_are('public','register_financial_payment',array['uuid','numeric','payment_method','date','text','text'],'authenticated',array['EXECUTE']);
select function_privs_are('public','register_targeted_financial_payment',array['uuid','jsonb','payment_method','date','text','text'],'authenticated',array['EXECUTE']);
select function_privs_are('public','cancel_financial_payment',array['uuid','text'],'authenticated',array['EXECUTE']);
select ok(not has_table_privilege('authenticated','public.financial_payments','DELETE'),'aucune suppression directe d’encaissement');

select is(
  public.build_financial_generation_public_error(
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'Élève test','MAT-001','Niveau test','Cycle test',
    '00000000-0000-0000-0000-000000000003'::uuid
  )->>'code',
  'FINANCE_ACCOUNT_GENERATION_FAILED',
  'le code public est stable'
);
select is(
  public.build_financial_generation_public_error(
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'Élève test','MAT-001','Niveau test','Cycle test',
    '00000000-0000-0000-0000-000000000003'::uuid
  )->>'debugMessage',
  'Le dossier financier n’a pas pu être généré.',
  'le message diagnostique public est français et nettoyé'
);
select is(
  public.build_financial_generation_public_error(
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'Élève test','MAT-001','Niveau test','Cycle test',
    '00000000-0000-0000-0000-000000000003'::uuid
  )->>'correlationId',
  '00000000-0000-0000-0000-000000000003',
  'la corrélation est exposée sans détail technique'
);
select ok(
  not public.build_financial_generation_public_error(
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'Élève test','MAT-001','Niveau test','Cycle test',
    '00000000-0000-0000-0000-000000000003'::uuid
  ) ?| array['message','detail','hint','context','sqlstate'],
  'aucun détail PostgreSQL ne sort de la réponse publique'
);
select function_privs_are(
  'public','build_financial_generation_public_error',
  array['uuid','uuid','text','text','text','text','uuid'],
  'authenticated',array[]::text[]
);

select * from finish();
rollback;
