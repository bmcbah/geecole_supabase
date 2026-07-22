begin;
select plan(12);

select has_table('public', 'enrollment_status_history', 'historique des statuts disponible');
select has_table('public', 'student_attendance_records', 'assiduite disponible');
select has_table('public', 'schooling_document_requirements', 'exigences documentaires disponibles');
select has_table('public', 'enrollment_documents', 'documents inscription disponibles');
select has_function('public', 'change_enrollment_status', array['uuid','enrollment_status','text'], 'fonction de transition disponible');
select has_column('public', 'enrollment_status_history', 'reason', 'motif de transition conserve');
select has_column('public', 'student_attendance_records', 'justification_status', 'statut de justification disponible');
select has_column('public', 'student_attendance_records', 'notified_at', 'notification historisable');
select has_column('public', 'schooling_document_requirements', 'required_for_pre_registration', 'obligation preinscription configurable');
select has_column('public', 'schooling_document_requirements', 'required_for_confirmation', 'obligation confirmation configurable');
select has_column('public', 'enrollment_documents', 'verified_at', 'verification document historisee');
select has_column('public', 'enrollment_documents', 'rejection_reason', 'refus document motive');

select * from finish();
rollback;
