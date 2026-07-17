begin;
select plan(5);
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='academic_cycles' and policyname='academic_cycles_delete_admin'), 'politique suppression cycle');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='grade_levels' and policyname='grade_levels_delete_admin'), 'politique suppression niveau');
select ok(has_table_privilege('authenticated','public.academic_cycles','DELETE'), 'suppression cycle accordée');
select ok(to_regprocedure('public.ensure_open_year_period_write()') is not null, 'verrouillage périodes présent');
select ok(exists(select 1 from pg_trigger where tgrelid='public.academic_periods'::regclass and tgname='academic_periods_lock'), 'trigger périodes présent');
select * from finish();
rollback;
