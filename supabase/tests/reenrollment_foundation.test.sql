begin;
select plan(8);

select has_table('public', 'reenrollment_policies', 'reenrollment policies exist');
select has_column('public', 'enrollments', 'source_enrollment_id', 'reenrollment source is stored');
select has_column('public', 'enrollments', 'academic_decision', 'academic decision is stored');
select has_column('public', 'enrollments', 'policy_snapshot', 'applied policy is auditable');
select has_function('public', 'reenroll_student', array['uuid','uuid','uuid','text','enrollment_status','text'], 'transactional reenrollment function exists');
select policies_are('public', 'reenrollment_policies', array['reenrollment_policies_manage_admin','reenrollment_policies_select_member'], 'reenrollment policies are protected');
select table_privs_are('public', 'reenrollment_policies', 'anon', array[]::text[], 'anonymous users have no reenrollment policy privilege');
select function_privs_are('public', 'reenroll_student', array['uuid','uuid','uuid','text','enrollment_status','text'], 'authenticated', array['EXECUTE'], 'authenticated users can call reenrollment');

select * from finish();
rollback;
