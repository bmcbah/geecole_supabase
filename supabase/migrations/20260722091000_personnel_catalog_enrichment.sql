-- Enrich the GeEcole baseline without replacing institution customizations.
insert into public.personnel_catalog_items(
  institution_id, category, code, default_label, is_system, is_active, display_order
)
select institution.id, value.category, value.code, value.label, true, true, value.ord
from public.institutions institution
cross join (values
  ('function','TEACHER','Enseignant(e)',10),
  ('function','HEAD_TEACHER','Enseignant(e) principal(e)',15),
  ('function','HR_MANAGER','Responsable du personnel',65),
  ('function','SECRETARY','Secrétaire',75),
  ('function','NURSE','Infirmier / Infirmière scolaire',105),
  ('function','DRIVER','Chauffeur',115),
  ('function','COOK','Cuisinier / Cuisinière',125),
  ('function','MAINTENANCE','Agent de maintenance',130),
  ('contract_type','PERMANENT_PUBLIC','Titulaire du public',10),
  ('contract_type','VACATION','Vacation / Enseignement à l’heure',55),
  ('contract_type','VOLUNTEER','Bénévolat',80),
  ('work_type','TEACHING','Cours dispensé',10),
  ('work_type','EXAM_MARKING','Correction d’examen',45),
  ('work_type','TRAINING','Formation',55),
  ('work_type','ON_CALL','Permanence',65),
  ('bonus_type','RESPONSIBILITY','Responsabilité',15),
  ('bonus_type','EXAM','Examen et correction',35),
  ('bonus_type','ATTENDANCE','Assiduité',45),
  ('bonus_type','OTHER','Autre prime',90),
  ('deduction_type','ABSENCE','Absence non rémunérée',15),
  ('deduction_type','DAMAGE','Dommage ou perte',45),
  ('deduction_type','OTHER','Autre retenue',90),
  ('advance_type','SCHOOL_START','Avance de rentrée',30),
  ('advance_type','MEDICAL','Avance médicale',40),
  ('leave_type','ANNUAL','Congé annuel',10),
  ('leave_type','AUTHORIZED_ABSENCE','Absence autorisée',80),
  ('leave_type','UNJUSTIFIED_ABSENCE','Absence non justifiée',90),
  ('leave_type','BEREAVEMENT','Décès / Deuil',100),
  ('sanction_type','VERBAL_WARNING','Rappel verbal consigné',5),
  ('sanction_type','DISMISSAL','Rupture disciplinaire',40),
  ('document_type','IDENTITY_CARD','Pièce d’identité',10),
  ('document_type','CONTRACT','Contrat signé',20),
  ('document_type','DIPLOMA','Diplôme',30),
  ('document_type','PHOTO','Photo d’identité',40),
  ('document_type','CRIMINAL_RECORD','Extrait de casier judiciaire',45),
  ('document_type','PAYMENT_DETAILS','Coordonnées de paiement',90)
) as value(category, code, label, ord)
on conflict(institution_id, category, code) do nothing;
