begin;

select plan(18);

select has_table('public', 'academic_periods', 'academic_periods existe');
select has_table('public', 'subjects', 'subjects existe');
select has_table('public', 'academic_cycle_subjects', 'academic_cycle_subjects existe');
select has_table('public', 'teachers', 'teachers existe');
select has_table('public', 'teaching_assignments', 'teaching_assignments existe');
select has_table('public', 'courses', 'courses existe');

select col_is_pk('public', 'academic_periods', 'id', 'academic_periods possède une clé primaire');
select col_is_pk('public', 'subjects', 'id', 'subjects possède une clé primaire');
select col_is_pk('public', 'teachers', 'id', 'teachers possède une clé primaire');
select col_is_pk('public', 'teaching_assignments', 'id', 'teaching_assignments possède une clé primaire');
select col_is_pk('public', 'courses', 'id', 'courses possède une clé primaire');

select has_check('public', 'academic_periods', 'academic_periods_dates_check', 'les dates de période sont contrôlées');
select has_check('public', 'academic_cycle_subjects', 'academic_cycle_subjects_coefficient_check', 'le coefficient est positif');
select has_check('public', 'teaching_assignments', 'teaching_assignments_kind_check', 'le type d’affectation est contrôlé');
select has_check('public', 'teaching_assignments', 'teaching_assignments_scope_check', 'la portée temporelle est contrôlée');
select has_check('public', 'teaching_assignments', 'teaching_assignments_subject_check', 'la matière est cohérente avec le type');

select policies_are(
  'public',
  'teaching_assignments',
  array['members can read teaching assignments', 'admins manage teaching assignments'],
  'les politiques RLS des affectations sont explicites'
);

select policies_are(
  'public',
  'courses',
  array['members can read courses', 'admins manage courses'],
  'les politiques RLS des cours sont explicites'
);

select * from finish();
rollback;
