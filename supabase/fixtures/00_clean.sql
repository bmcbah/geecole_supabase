-- Development-only cleanup.
-- Executed by `supabase db reset` before the fixture files.
-- Never run this file against staging or production.

begin;

-- Remove every application table while respecting foreign-key dependencies.
do $$
declare
  tables_to_truncate text;
begin
  select string_agg(format('%I.%I', schemaname, tablename), ', ' order by tablename)
    into tables_to_truncate
  from pg_tables
  where schemaname = 'public'
    and tablename not in (
      'cycle_catalog',
      'module_catalog',
      'permissions',
      'access_profile_templates',
      'access_profile_template_permissions',
      'grade_level_catalog',
      'subject_catalog',
      'subject_catalog_cycles',
      'student_document_type_catalog',
      'fee_type_catalog',
      'assessment_type_catalog',
      'appreciation_template_catalog',
      'personnel_catalog'
    );

  if tables_to_truncate is not null then
    execute 'truncate table ' || tables_to_truncate || ' restart identity cascade';
  end if;
end
$$;

-- Auth identities must be deleted before their users.
delete from auth.identities;
delete from auth.sessions;
delete from auth.refresh_tokens;
delete from auth.mfa_amr_claims;
delete from auth.mfa_challenges;
delete from auth.mfa_factors;
delete from auth.one_time_tokens;
delete from auth.users;

-- This sequence is standalone and therefore is not reset by TRUNCATE.
alter sequence public.student_matricule_sequence restart with 1;

commit;
