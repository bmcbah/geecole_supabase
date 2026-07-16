begin;
select plan(8);
select has_table('public', 'institutions', 'institutions existe');
select has_table('public', 'profiles', 'profiles existe');
select has_table('public', 'memberships', 'memberships existe');
select has_column('public', 'institutions', 'currency', 'devise configurable');
select col_default_is('public', 'institutions', 'currency', 'GNF', 'GNF par défaut');
select col_default_is('public', 'institutions', 'timezone', 'Africa/Conakry', 'Conakry par défaut');
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.institutions'::regclass),
  'RLS active sur institutions'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.memberships'::regclass),
  'RLS active sur memberships'
);
select * from finish();
rollback;
