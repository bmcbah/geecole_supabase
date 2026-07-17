-- Operational schooling data for list, search, enrollment and class screens.
begin;

insert into public.school_classes (
  id, institution_id, academic_year_id, academic_year_level_id, name, code, capacity, room, is_active
) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000002', '28000000-0000-0000-0000-000000000003', '6e A', 'P6-A', 30, 'Salle 04', true),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000002', '28000000-0000-0000-0000-000000000004', '7e A', 'C7-A', 35, 'Salle 08', true);

insert into public.students (
  id, institution_id, matricule, first_name, last_name, other_names, gender,
  birth_date, birth_place, nationality, address, previous_school, previous_level, status
) values
  ('31000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'EL-2025-00001', 'Ibrahima', 'Diallo', null, 'male', '2013-03-12', 'Conakry', 'Guinéenne', 'Kipé', 'École La Source', '5e année', 'active'),
  ('31000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'EL-2025-00002', 'Mariama', 'Camara', 'Saran', 'female', '2012-07-21', 'Kindia', 'Guinéenne', 'Ratoma', 'Groupe Scolaire Avenir', '6e année', 'active'),
  ('31000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'EL-2025-00003', 'Alpha', 'Bah', null, 'male', '2013-11-05', 'Labé', 'Guinéenne', 'Taouyah', null, null, 'active'),
  ('31000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'EL-2025-00004', 'Hawa', 'Keita', null, 'female', '2012-01-30', 'Kankan', 'Guinéenne', 'Cosa', 'École Sainte-Marie', '6e année', 'active');

insert into public.guardians (
  id, institution_id, first_name, last_name, primary_phone, secondary_phone, address, occupation
) values
  ('32000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Ousmane', 'Diallo', '+224 622 10 10 01', null, 'Kipé', 'Commerçant'),
  ('32000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'M’Mah', 'Camara', '+224 622 10 10 02', null, 'Ratoma', 'Enseignante'),
  ('32000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Mamadou', 'Bah', '+224 622 10 10 03', null, 'Taouyah', 'Chauffeur'),
  ('32000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'Kadiatou', 'Keita', '+224 622 10 10 04', null, 'Cosa', 'Infirmière');

insert into public.student_guardians (
  student_id, guardian_id, relationship, is_primary_contact,
  is_financial_responsible, is_emergency_contact, can_pick_up, receives_communications
) values
  ('31000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000001', 'Père', true, true, true, true, true),
  ('31000000-0000-0000-0000-000000000002', '32000000-0000-0000-0000-000000000002', 'Mère', true, true, true, true, true),
  ('31000000-0000-0000-0000-000000000003', '32000000-0000-0000-0000-000000000003', 'Père', true, true, true, true, true),
  ('31000000-0000-0000-0000-000000000004', '32000000-0000-0000-0000-000000000004', 'Mère', true, true, true, true, true);

insert into public.enrollments (
  id, institution_id, academic_year_id, student_id, academic_year_level_id,
  status, admission_date, origin, level_name_snapshot, cycle_name_snapshot,
  policy_snapshot, confirmed_at, created_by
) values
  ('33000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000001', '28000000-0000-0000-0000-000000000003', 'confirmed', '2025-09-15', 'returning', '6e année', 'Primaire', '{"payment_required":false}'::jsonb, now(), '10000000-0000-0000-0000-000000000003'),
  ('33000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000002', '28000000-0000-0000-0000-000000000004', 'confirmed', '2025-09-15', 'returning', '7e année', 'Collège', '{"payment_required":false}'::jsonb, now(), '10000000-0000-0000-0000-000000000003'),
  ('33000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000003', '28000000-0000-0000-0000-000000000003', 'pre_registered', '2025-10-03', 'new', '6e année', 'Primaire', '{"missing_documents":true}'::jsonb, null, '10000000-0000-0000-0000-000000000003'),
  ('33000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000004', '28000000-0000-0000-0000-000000000004', 'draft', '2025-10-05', 'transfer', '7e année', 'Collège', '{}'::jsonb, null, '10000000-0000-0000-0000-000000000003');

insert into public.class_assignments (
  id, institution_id, academic_year_id, enrollment_id, class_id, starts_on, created_by
) values
  ('34000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '2025-09-15', '10000000-0000-0000-0000-000000000003'),
  ('34000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '2025-09-15', '10000000-0000-0000-0000-000000000003');

insert into public.document_requirements (
  id, institution_id, name, code, required_for_pre_registration,
  required_for_confirmation, expires, is_active
) values
  ('35000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Extrait de naissance', 'EXTRAIT_NAISSANCE', true, true, false, true),
  ('35000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Bulletin précédent', 'BULLETIN_PRECEDENT', false, true, false, true),
  ('35000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Photo d’identité', 'PHOTO_IDENTITE', false, true, false, true);

insert into public.student_documents (
  id, institution_id, student_id, enrollment_id, requirement_id,
  status, file_path, notes, received_on
) values
  ('36000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001', '35000000-0000-0000-0000-000000000001', 'provided', 'fixtures/extrait-ibrahima.pdf', null, '2025-09-10'),
  ('36000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000003', '33000000-0000-0000-0000-000000000003', '35000000-0000-0000-0000-000000000001', 'missing', null, 'À fournir avant confirmation', null);

commit;
