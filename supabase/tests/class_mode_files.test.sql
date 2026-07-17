begin; select plan(5);
select has_column('public','institutions','class_structure_mode','class mode configurable');
select has_function('public','create_school_class',array['uuid','uuid','uuid','text','text','integer','text'],'class creation RPC exists');
select ok(exists(select 1 from storage.buckets where id='school-admin'),'private school file bucket exists');
select is((select public from storage.buckets where id='school-admin'),false,'school files are private');
select function_privs_are('public','create_school_class',array['uuid','uuid','uuid','text','text','integer','text'],'authenticated',array['EXECUTE']);
select * from finish(); rollback;
