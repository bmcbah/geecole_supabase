-- Corrige toutes les fonctions PL/pgSQL encore compilées avec l'ancien champ
-- enrollments.academic_year_cycle_id. Le cycle est désormais porté par
-- academic_year_levels.
do $$
declare
  function_record record;
  function_definition text;
begin
  for function_record in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and pg_get_functiondef(p.oid) like '%selected_enrollment.academic_year_cycle_id%'
  loop
    function_definition := pg_get_functiondef(function_record.oid);
    function_definition := replace(
      function_definition,
      'selected_enrollment.academic_year_cycle_id',
      '(select ayl.academic_year_cycle_id from public.academic_year_levels ayl where ayl.id = selected_enrollment.academic_year_level_id)'
    );
    execute function_definition;
  end loop;
end
$$;
