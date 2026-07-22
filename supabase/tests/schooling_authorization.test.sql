begin;
select plan(16);

select has_column('public','students','auth_user_id','un élève peut être lié à son compte');
select has_column('public','guardians','auth_user_id','un responsable peut être lié à son compte');
select has_function('public','can_read_student',array['uuid'],'périmètre élève contrôlé côté base');
select has_function('public','can_read_guardian',array['uuid'],'périmètre responsable contrôlé côté base');
select has_function('public','can_read_school_class',array['uuid'],'périmètre classe contrôlé côté base');
select has_function('public','can_read_enrollment',array['uuid'],'périmètre inscription contrôlé côté base');
select has_function('public','access_profile_scope_allows_class',array['uuid','uuid'],'délégation de classe contrôlée');
select has_function('public','has_active_pedagogical_assignment',array['uuid','uuid'],'affectation pédagogique contrôlée par contrat intermodule');
select ok((select prosecdef from pg_catalog.pg_proc where oid='public.can_read_student(uuid)'::regprocedure),'lecture élève en SECURITY DEFINER');
select ok((select proconfig @> array['search_path=""'] from pg_catalog.pg_proc where oid='public.can_read_student(uuid)'::regprocedure),'search_path lecture élève verrouillé');
select function_privs_are('public','can_read_student',array['uuid'],'authenticated',array['EXECUTE']);
select function_privs_are('public','can_read_guardian',array['uuid'],'authenticated',array['EXECUTE']);
select function_privs_are('public','can_read_school_class',array['uuid'],'authenticated',array['EXECUTE']);
select function_privs_are('public','can_read_enrollment',array['uuid'],'authenticated',array['EXECUTE']);
select is((
  select count(*)::integer
  from pg_constraint
  where conrelid in('public.students'::regclass,'public.guardians'::regclass)
    and contype='u'
    and pg_get_constraintdef(oid) like 'UNIQUE (institution_id, auth_user_id)%'
),2,'les comptes élève et responsable restent réutilisables entre établissements');
select ok(not has_table_privilege('authenticated','public.enrollments','DELETE'),'aucune suppression directe d’inscription');

select * from finish();
rollback;
