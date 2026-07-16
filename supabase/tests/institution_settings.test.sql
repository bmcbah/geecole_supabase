begin;
select plan(8);
select has_table('public', 'academic_years', 'academic_years existe');
select has_column('public', 'academic_years', 'status', 'statut présent');
select col_default_is('public', 'academic_years', 'status', 'preparation', 'préparation par défaut');
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.academic_years'::regclass),
  'RLS active sur academic_years'
);
select has_index('public', 'academic_years', 'academic_years_one_open_per_institution_idx', 'une année ouverte par établissement');
select has_trigger('public', 'academic_years', 'academic_years_enforce_transition', 'transitions contrôlées');
select has_check('public', 'academic_years', 'dates cohérentes');
select fk_ok('public', 'academic_years', 'institution_id', 'public', 'institutions', 'id', 'année rattachée à un établissement');
select * from finish();
rollback;
