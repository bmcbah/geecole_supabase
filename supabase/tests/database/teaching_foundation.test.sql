begin;

select plan(23);

select has_table('public', 'academic_periods', 'academic_periods reste disponible');
select has_table('public', 'subjects', 'subjects reste disponible');
select has_column('public', 'subjects', 'description', 'subjects accepte une description');
select has_table('public', 'academic_cycle_subjects', 'academic_cycle_subjects existe');
select has_table('public', 'teaching_assignments', 'teaching_assignments existe');
select has_table('public', 'courses', 'courses existe');
select hasnt_table('public', 'teachers', 'aucune identité enseignant concurrente n’est créée');

select col_is_pk('public', 'academic_cycle_subjects', 'id', 'academic_cycle_subjects possède une clé primaire');
select col_is_pk('public', 'teaching_assignments', 'id', 'teaching_assignments possède une clé primaire');
select col_is_pk('public', 'courses', 'id', 'courses possède une clé primaire');

select has_column('public', 'teaching_assignments', 'teacher_person_id', 'les affectations utilisent people');
select has_column('public', 'teaching_assignments', 'academic_period_id', 'une affectation peut cibler une période');
select has_column('public', 'courses', 'teaching_assignment_id', 'un cours référence son affectation source');
select has_column('public', 'courses', 'teacher_person_id', 'un cours référence l’enseignant existant');

select has_trigger(
  'public',
  'academic_cycle_subjects',
  'validate_academic_cycle_subject_scope',
  'la portée des matières de cycle est contrôlée'
);
select has_trigger(
  'public',
  'teaching_assignments',
  'validate_teaching_assignment_scope',
  'la portée des affectations est contrôlée'
);
select has_trigger(
  'public',
  'teaching_assignments',
  'sync_course_after_teaching_assignment',
  'les cours sont synchronisés automatiquement'
);

select has_function(
  'public',
  'validate_teaching_foundation_scope',
  array[]::text[],
  'la fonction de validation existe'
);
select has_function(
  'public',
  'sync_course_from_teaching_assignment',
  array[]::text[],
  'la fonction de génération des cours existe'
);

select policies_are(
  'public',
  'academic_cycle_subjects',
  array[
    'members read academic cycle subjects',
    'administrators manage academic cycle subjects'
  ],
  'les politiques RLS des matières de cycle sont explicites'
);
select policies_are(
  'public',
  'teaching_assignments',
  array[
    'members read teaching assignments',
    'administrators manage teaching assignments'
  ],
  'les politiques RLS des affectations sont explicites'
);
select policies_are(
  'public',
  'courses',
  array['members read courses', 'administrators manage courses'],
  'les politiques RLS des cours sont explicites'
);

select col_is_fk(
  'public',
  'teaching_assignments',
  'teacher_person_id',
  'l’enseignant est rattaché à people'
);

select * from finish();
rollback;
