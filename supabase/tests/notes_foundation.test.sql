begin;
select plan(8);

select has_table('public', 'pedagogical_assignments', 'pedagogical assignments table exists');
select has_table('public', 'pedagogical_assignment_periods', 'assignment period scope exists');
select has_table('public', 'gradebook_notes', 'gradebook notes table exists');
select has_table('public', 'note_results', 'note results table exists');
select has_table('public', 'subject_appreciations', 'subject appreciations table exists');
select has_table('public', 'notes_audit_log', 'notes audit table exists');
select col_is_null('public', 'note_results', 'value', 'numeric value may be null for statuses');
select col_is_null('public', 'note_results', 'status', 'status may be null for numeric results');

select * from finish();
rollback;
