-- Corrige uniquement les fonctions PL/pgSQL ordinaires encore compilées avec
-- l'ancien champ enrollments.academic_year_cycle_id. Le filtrage par prokind
-- évite d'appeler pg_get_functiondef sur des agrégats, ce qui faisait échouer
-- la migration avant même l'entrée dans la boucle.
do $$
declare
  function_record record;
  function_definition text;
begin
  for function_record in
    with plpgsql_functions as materialized (
      select p.oid
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      join pg_language l on l.oid = p.prolang
      where n.nspname = 'public'
        and l.lanname = 'plpgsql'
        and p.prokind = 'f'
    )
    select f.oid, pg_get_functiondef(f.oid) as definition
    from plpgsql_functions f
  loop
    function_definition := function_record.definition;

    if position('selected_enrollment.academic_year_cycle_id' in function_definition) > 0 then
      function_definition := replace(
        function_definition,
        'selected_enrollment.academic_year_cycle_id',
        '(select ayl.academic_year_cycle_id from public.academic_year_levels ayl where ayl.id = selected_enrollment.academic_year_level_id)'
      );
      execute function_definition;
    end if;
  end loop;
end
$$;
