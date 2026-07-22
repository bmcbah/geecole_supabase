-- Deterministic academic configuration for local development.
begin;

insert into public.institutions (
  id, name, slug, phone, email, address, currency, timezone, locale, class_structure_mode
) values
  (
    '20000000-0000-0000-0000-000000000001', 'Complexe Scolaire GeeCole',
    'complexe-scolaire-geecole', '+224 610 00 00 00', 'contact@geecole.local',
    'Kipé, Conakry', 'GNF', 'Africa/Conakry', 'fr-GN', 'levels_and_classes'
  ),
  (
    '20000000-0000-0000-0000-000000000002', 'École Primaire Kankan',
    'ecole-primaire-kankan', '+224 622 10 10 10', 'contact.kankan@geecole.local',
    'Quartier Bordo, Kankan', 'GNF', 'Africa/Conakry', 'fr-GN', 'classes_as_levels'
  );

insert into public.memberships (id, institution_id, user_id, role, status) values
  ('21000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner', 'active'),
  ('21000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'admin', 'active'),
  ('21000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'secretary', 'active'),
  ('21000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 'owner', 'active');

insert into public.academic_cycles (
  id, institution_id, name, code, sort_order, is_active, period_system, period_count,
  subjects_period_scope, grading_scale, pass_average, ranking_enabled, absences_on_report
) values
  ('23000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Primaire', 'PRIMAIRE', 20, true, 'term', 3, 'all', 20, 10, true, true),
  ('23000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Collège', 'COLLEGE', 30, true, 'term', 3, 'selectable', 20, 10, true, true),
  ('23000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Lycée', 'LYCEE', 40, true, 'semester', 2, 'selectable', 20, 10, true, true);

insert into public.institution_cycles (
  id, institution_id, catalog_cycle_id, academic_cycle_id, sort_order, is_active
)
select value.id, '20000000-0000-0000-0000-000000000001', catalog.id, value.academic_cycle_id, catalog.sort_order, true
from (values
  ('24000000-0000-0000-0000-000000000001'::uuid,'PRIMAIRE','23000000-0000-0000-0000-000000000001'::uuid),
  ('24000000-0000-0000-0000-000000000002'::uuid,'COLLEGE','23000000-0000-0000-0000-000000000002'::uuid),
  ('24000000-0000-0000-0000-000000000003'::uuid,'LYCEE','23000000-0000-0000-0000-000000000003'::uuid)
) as value(id,cycle_code,academic_cycle_id)
join public.cycle_catalog catalog on catalog.code=value.cycle_code;

insert into public.academic_years (id, institution_id, name, starts_on, ends_on, status) values
  ('25000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '2024-2025', '2024-09-16', '2025-06-30', 'preparation'),
  ('25000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '2025-2026', '2025-09-15', '2026-06-30', 'preparation'),
  ('25000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '2026-2027', '2026-09-14', '2027-06-30', 'preparation');

insert into public.academic_year_cycles (
  id, institution_id, academic_year_id, cycle_id, name, code, sort_order,
  period_system, period_count, is_active, subjects_period_scope,
  grading_scale, pass_average, ranking_enabled, absences_on_report
) values
  ('26000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', 'Primaire', 'PRIMAIRE', 20, 'term', 3, true, 'all', 20, 10, true, true),
  ('26000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000001', 'Primaire', 'PRIMAIRE', 20, 'term', 3, true, 'all', 20, 10, true, true),
  ('26000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', 'Collège', 'COLLEGE', 30, 'term', 3, true, 'selectable', 20, 10, true, true),
  ('26000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000003', '23000000-0000-0000-0000-000000000001', 'Primaire', 'PRIMAIRE', 20, 'term', 3, true, 'all', 20, 10, true, true),
  ('26000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000003', '23000000-0000-0000-0000-000000000002', 'Collège', 'COLLEGE', 30, 'term', 3, true, 'selectable', 20, 10, true, true),
  ('26000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000003', '23000000-0000-0000-0000-000000000003', 'Lycée', 'LYCEE', 40, 'semester', 2, true, 'selectable', 20, 10, true, true);

insert into public.grade_levels (
  id, institution_id, cycle_id, catalog_id, name, code, sort_order, is_active, capacity, repeat_allowed
)
select value.id,'20000000-0000-0000-0000-000000000001',value.cycle_id,catalog.id,catalog.name,catalog.code,catalog.sort_order,true,value.capacity,true
from (values
  ('27000000-0000-0000-0000-000000000001'::uuid,'23000000-0000-0000-0000-000000000001'::uuid,'PRIM_05',35),
  ('27000000-0000-0000-0000-000000000002'::uuid,'23000000-0000-0000-0000-000000000001'::uuid,'PRIM_06',35),
  ('27000000-0000-0000-0000-000000000003'::uuid,'23000000-0000-0000-0000-000000000002'::uuid,'COLL_07',40),
  ('27000000-0000-0000-0000-000000000004'::uuid,'23000000-0000-0000-0000-000000000002'::uuid,'COLL_08',40),
  ('27000000-0000-0000-0000-000000000005'::uuid,'23000000-0000-0000-0000-000000000003'::uuid,'LYC_11',45)
) as value(id,cycle_id,catalog_code,capacity)
join public.grade_level_catalog catalog on catalog.code=value.catalog_code;

update public.grade_levels set next_level_id = '27000000-0000-0000-0000-000000000002' where id = '27000000-0000-0000-0000-000000000001';
update public.grade_levels set next_level_id = '27000000-0000-0000-0000-000000000003' where id = '27000000-0000-0000-0000-000000000002';
update public.grade_levels set next_level_id = '27000000-0000-0000-0000-000000000004' where id = '27000000-0000-0000-0000-000000000003';

insert into public.academic_year_levels (
  id, institution_id, academic_year_id, academic_year_cycle_id, cycle_id, level_id,
  cycle_name_snapshot, level_name_snapshot, level_code_snapshot, sort_order, is_active
) values
  ('28000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', '27000000-0000-0000-0000-000000000002', 'Primaire', '6e année', 'P6', 60, true),
  ('28000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000002', '26000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000001', '27000000-0000-0000-0000-000000000001', 'Primaire', '5e année', 'P5', 50, true),
  ('28000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000002', '26000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000001', '27000000-0000-0000-0000-000000000002', 'Primaire', '6e année', 'P6', 60, true),
  ('28000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000002', '26000000-0000-0000-0000-000000000003', '23000000-0000-0000-0000-000000000002', '27000000-0000-0000-0000-000000000003', 'Collège', '7e année', 'C7', 70, true),
  ('28000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000003', '26000000-0000-0000-0000-000000000004', '23000000-0000-0000-0000-000000000001', '27000000-0000-0000-0000-000000000002', 'Primaire', '6e année', 'P6', 60, true),
  ('28000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000003', '26000000-0000-0000-0000-000000000005', '23000000-0000-0000-0000-000000000002', '27000000-0000-0000-0000-000000000003', 'Collège', '7e année', 'C7', 70, true),
  ('28000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000003', '26000000-0000-0000-0000-000000000006', '23000000-0000-0000-0000-000000000003', '27000000-0000-0000-0000-000000000005', 'Lycée', '11e année', 'L11', 110, true);

-- These rows are created automatically by institution triggers.
-- Fixtures configure them explicitly instead of inserting duplicate primary keys.
update public.enrollment_policies
set allow_pre_registration = true,
    allow_direct_enrollment = true,
    require_payment_before_confirmation = false,
    require_class_assignment = false,
    count_pre_registration_in_capacity = false,
    capacity_mode = 'warning',
    allow_missing_documents = true,
    student_number_pattern = 'EL-{YYYY}-{SEQ}'
where institution_id = '20000000-0000-0000-0000-000000000001';

update public.reenrollment_policies
set allow_early_preparation = true,
    allow_direct_confirmation = true,
    debt_mode = 'warning',
    require_academic_decision = true,
    allow_decision_override = true,
    repeat_mode = 'exception',
    require_class_assignment = false,
    auto_generate_fees = true
where institution_id = '20000000-0000-0000-0000-000000000001';

-- Historical, current and future years.
update public.academic_years set status = 'open' where id = '25000000-0000-0000-0000-000000000001';
update public.academic_years set status = 'closed' where id = '25000000-0000-0000-0000-000000000001';
update public.academic_years set status = 'open' where id = '25000000-0000-0000-0000-000000000002';

commit;
