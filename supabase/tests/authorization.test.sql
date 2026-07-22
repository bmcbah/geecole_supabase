begin;
select plan(44);

select hasnt_column('public','memberships','role','le rôle unique a été retiré des appartenances');
select has_column('public','memberships','is_owner','la propriété est un invariant séparé');
select has_table('public','permissions','catalogue des permissions présent');
select has_table('public','access_profile_templates','profils standards présents');
select has_table('public','access_profiles','profils locaux présents');
select has_table('public','membership_access_profiles','cumul de profils présent');
select has_table('public','access_scope_assignments','périmètres explicites présents');
select has_table('public','access_audit_events','audit des accès présent');
select has_table('public','module_catalog','catalogue des modules présent');
select has_table('public','institution_modules','activation des modules par établissement présente');
select has_table('public','access_profile_permission_delegations','délégations explicites présentes');

select has_function('public','has_permission',array['uuid','text'],'contrôle de permission présent');
select has_function('public','create_custom_access_profile',array['uuid','text','text','text[]','uuid'],'création contrôlée de profil présente');
select has_function('public','assign_membership_access_profile',array['uuid','uuid','date','date'],'affectation contrôlée de profil présente');
select has_function('public','set_membership_owner',array['uuid','boolean','text'],'gestion contrôlée du propriétaire présente');
select has_function('public','set_membership_status',array['uuid','membership_status','text'],'suspension contrôlée présente');
select has_function('public','remove_membership',array['uuid','text'],'révocation contrôlée présente');
select has_function('public','get_my_authorization_summary',array['uuid'],'résumé frontend présent');
select has_function('public','can_delegate_permission',array['uuid','text'],'contrôle de délégation présent');
select has_function('public','set_institution_module_enabled',array['uuid','text','boolean','text'],'activation contrôlée des modules présente');

select has_trigger('public','memberships','memberships_protect_last_owner','dernier propriétaire protégé');
select has_trigger('public','access_audit_events','access_audit_events_immutable','audit immuable protégé');
select ok((select relrowsecurity from pg_catalog.pg_class where oid='public.access_profiles'::regclass),'RLS profils active');
select ok((select relrowsecurity from pg_catalog.pg_class where oid='public.membership_access_profiles'::regclass),'RLS affectations active');
select ok((select relrowsecurity from pg_catalog.pg_class where oid='public.access_audit_events'::regclass),'RLS audit active');

select ok(not has_table_privilege('authenticated','public.memberships','INSERT'),'aucune insertion directe d’appartenance');
select ok(not has_table_privilege('authenticated','public.memberships','UPDATE'),'aucune modification directe d’appartenance');
select ok(not has_table_privilege('authenticated','public.memberships','DELETE'),'aucune suppression directe d’appartenance');
select ok(not has_table_privilege('authenticated','public.access_audit_events','INSERT'),'aucune insertion directe dans l’audit');
select ok(not has_table_privilege('authenticated','public.access_audit_events','UPDATE'),'aucune modification directe de l’audit');
select ok(not has_table_privilege('authenticated','public.access_audit_events','DELETE'),'aucune suppression directe de l’audit');

select is((select count(*)::integer from public.access_profile_templates),11,'onze profils standards GeEcole');
select ok((select is_mandatory from public.module_catalog where code='settings'),'le paramétrage ne peut pas être désactivé');
select ok(not exists(
  select 1 from public.permissions permission
  where permission.code='bulletins.reports.publish'
    and not permission.requires_delegation
),'la publication des bulletins exige une délégation sensible');
select ok(exists(
  select 1 from public.permissions permission
  where permission.code='schooling.students.update'
    and permission.is_assignable and not permission.requires_delegation
),'la gestion courante des élèves reste délégable');
select ok(exists(
  select 1 from public.access_profile_templates template
  join public.access_profile_template_permissions template_permission on template_permission.template_id=template.id
  join public.permissions permission on permission.id=template_permission.permission_id
  where template.code='teacher' and permission.code='notes.results.enter'
),'l’enseignant peut saisir ses résultats');
select ok(exists(
  select 1 from public.access_profile_templates template
  join public.access_profile_template_permissions template_permission on template_permission.template_id=template.id
  join public.permissions permission on permission.id=template_permission.permission_id
  where template.code='cashier' and permission.code='finance.payments.collect'
),'l’encaissement peut collecter un paiement');
select ok(not exists(
  select 1 from public.access_profile_templates template
  join public.access_profile_template_permissions template_permission on template_permission.template_id=template.id
  join public.permissions permission on permission.id=template_permission.permission_id
  where template.code='cashier' and permission.code='finance.pricing.manage'
),'l’encaissement ne gère pas les tarifs');
select ok(exists(
  select 1 from public.access_profile_templates template
  join public.access_profile_template_permissions template_permission on template_permission.template_id=template.id
  join public.permissions permission on permission.id=template_permission.permission_id
  where template.code='financial_manager' and permission.code='finance.pricing.manage'
),'la gestion financière gère les tarifs');
select ok(not exists(
  select 1 from public.access_profile_templates template
  join public.access_profile_template_permissions template_permission on template_permission.template_id=template.id
  join public.permissions permission on permission.id=template_permission.permission_id
  where template.code='administration' and permission.code='bulletins.reports.publish'
),'l’administration ne publie pas automatiquement les bulletins');

select ok((select prosecdef from pg_catalog.pg_proc where oid='public.set_membership_owner(uuid,boolean,text)'::regprocedure),'gestion Owner en SECURITY DEFINER');
select ok((select proconfig @> array['search_path=""'] from pg_catalog.pg_proc where oid='public.set_membership_owner(uuid,boolean,text)'::regprocedure),'search_path Owner verrouillé');
select ok(not exists(
  select 1 from information_schema.role_routine_grants
  where specific_schema='public' and routine_name='set_membership_owner' and grantee='PUBLIC'
),'aucun EXECUTE public sur la gestion Owner');
select function_privs_are('public','set_membership_owner',array['uuid','boolean','text'],'authenticated',array['EXECUTE']);

select * from finish();
rollback;
