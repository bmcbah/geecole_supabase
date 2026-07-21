begin;
select plan(12);

select has_table('public','assessment_type_catalog','catalogue des types de note présent');
select has_table('public','grading_formula_series','séries de formules présentes');
select has_table('public','grading_formula_versions','versions de formules présentes');
select has_table('public','grading_formula_assignments','affectations de formules présentes');
select has_column('public','assessment_types','catalog_id','type local relié au catalogue');
select has_index('public','grading_formula_assignment_cycle_active_idx','une formule active par cycle');
select has_index('public','grading_formula_assignment_level_active_idx','une formule active par niveau');
select trigger_is('public','grading_formula_versions','grading_formula_versions_immutable','public','prevent_formula_version_mutation','versions immuables');
select trigger_is('public','grading_formula_versions','grading_formula_versions_validate','public','validate_grading_formula_data','versions validées');
select trigger_is('public','grading_formula_assignments','grading_formula_assignments_validate','public','validate_grading_formula_data','affectations validées');
select results_eq('select count(*)::integer from public.assessment_type_catalog',array[15],'catalogue GeeCole fourni');
select results_eq(
  $$select count(*)::integer from public.assessment_type_catalog where code in ('COMPO','EXAM-BLANC','RATTRAPAGE','INTERRO')$$,
  array[4],
  'types scolaires essentiels fournis'
);

select * from finish();
rollback;
