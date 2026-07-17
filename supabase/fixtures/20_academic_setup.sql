-- Deterministic academic configuration for local development.
begin;

insert into public.institutions (
  id, name, slug, phone, email, address, currency, timezone, locale, class_structure_mode
) values (
  '20000000-0000-0000-0000-000000000001', 'Complexe Scolaire GeeCole',
  'complexe-scolaire-geecole', '+224 610 00 00 00', 'contact@geecole.local',
  'Kipé, Conakry', 'GNF', 'Africa/Conakry', 'fr-GN', 'levels_and_classes'
);

insert into public.memberships (id, institution_id, user_id, role, status) values
  ('21000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner', 'active'),
  ('21000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'admin', 'active'),
  ('21000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'secretary', 'active');

insert into public.cycle_catalog (id, name, code, description, icon, sort_order, is_active) values
  ('22000000-0000-0000-0000-000000000001', 'Préscolaire', 'PRESCOLAIRE', 'Préparation au primaire', 'pi-sparkles', 10, true),
  ('22000000-0000-0000-0000-000000000002', 'Primaire', 'PRIMAIRE', 'Enseignement primaire', 'pi-pencil', 20, true),
  ('22000000-0000-0000-0000-000000000003', 'Collège', 'COLLEGE', 'Premier cycle secondaire', 'pi-book', 30, true),
  ('22000000-0000-0000-0000-000000000004', 'Lycée', 'LYCEE', 'Second cycle secondaire', 'pi-graduation-cap', 40, true);

insert into public.academic_cycles (
  id, institution_id, name, code, sort_order, is_active, period_system, period_count,
  subjects_period_scope, grading_scale, pass_average, ranking_enabled, absences_on_report
) values
  ('23000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Primaire', 'PRIMAIRE', 20, true, 'term', 3, 'all', 10, 5, true, true),
  ('23000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Collège', 'COLLEGE', 30, true, 'term', 3, 'selectable', 20, 10, true, true),
  ('23000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Lycée', 'LYCEE', 40, true, 'semester', 2, 'selectable', 20, 10, true, true);

insert into public.institution_cycles (
  id, institution_id, catalog_cycle_id, academic_cycle_id, sort_order, is_active
) values
  ('24000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000001', 20, true),
  ('24000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000003', '23000000-0000-0000-0000-000000000002', 30, true),
  ('24000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000004', '23000000-0000-0000-0000-000000000003', 40, true);

insert into public.academic_years (id, institution_id, name, starts_on, ends_on, status) values
  ('25000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '2024-2025', '2024-09-16', '2025-06-30', 'preparation'),
  ('25000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '2025-2026', '2025-09-15', '2026-06-30', 'preparation'),
  ('25000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '2026-2027', '2026-09-14', '2027-06-30', 'preparation');

insert into public.academic_year_cycles (
  id, institution_id, academic_year_id, cycle_id, name, code, sort_order,
  period_system, period_count, is_active, subjects_period_scope,
  grading_scale, pass_average, ranking_enabled, absences_on_report
) values
  ('26000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', 'Primaire', 'PRIMAIRE', 20, 'term', 3, true, 'all', 10, 5, true, true),
  ('26000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000001', 'Primaire', 'PRIMAIRE', 20, 'term', 3, true, 'all', 10, 5, true, true),
  ('26000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', 'Collège', 'COLLEGE', 30, 'term', 3, true, 'selectable', 20, 10, true, true),
  ('26000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000003', '23000000-0000-0000-0000-000000000001', 'Primaire', 'PRIMAIRE', 20, 'term', 3, true, 'all', 10, 5, true, true),
  ('26000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000003', '23000000-0000-0000-0000-000000000002', 'Collège', 'COLLEGE', 30, 'term', 3, true, 'selectable', 20, 10, true, true),
  ('26000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000003', '23000000-0000-0000-0000-000000000003', 'Lycée', 'LYCEE', 40, 'semester', 2, true, 'selectable', 20, 10, true, true);

insert into public.grade_levels (
  id, institution_id, cycle_id, name, code, sort_order, is_active, capacity, repeat_allowed
) values
  ('27000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', '5e année', 'P5', 50, true, 35, true),
  ('27000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', '6e année', 'P6', 60, true, 35, true),
  ('27000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000002', '7e année', 'C7', 70, true, 40, true),
  ('27000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000002', '8e année', 'C8', 80, true, 40, true),
  ('27000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000003', '11e année', 'L11', 110, true, 45, true);

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