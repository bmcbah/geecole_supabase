begin;
select plan(14);

select has_table('public','student_import_batches','student_import_batches exists');
select has_table('public','student_import_rows','student_import_rows exists');
select has_table('public','student_certificates','student_certificates exists');
select has_table('public','schooling_notifications','schooling_notifications exists');
select has_table('public','student_medical_profiles','student_medical_profiles exists');
select has_function('public','find_probable_student_duplicates',array['uuid','text','text','date','integer'],'duplicate detection function exists');
select has_function('public','batch_assign_enrollments_to_class',array['uuid[]','uuid','text'],'batch assignment function exists');
select has_function('public','issue_student_certificate',array['uuid','text'],'certificate issue function exists');
select col_default_is('public','institutions','schooling_capacity_mode','''warning''::text','capacity default is warning');
select col_is_pk('public','student_medical_profiles','student_id','medical profile is one per student');
select col_not_null('public','student_certificates','snapshot','certificate snapshot is immutable data');
select col_not_null('public','student_import_rows','raw_data','import source row is preserved');
select has_index('public','student_certificates','student_certificates_student_idx','certificate student index exists');
select has_index('public','student_import_rows','student_import_rows_batch_status_idx','import batch status index exists');

select * from finish();
rollback;
