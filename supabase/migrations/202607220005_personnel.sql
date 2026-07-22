-- GeEcole V1 — Personnel, contrats, avances, sanctions et paie
-- Baseline consolidée le 2026-07-22.
-- Les marqueurs "Source consolidée" conservent la traçabilité Git.

-- -----------------------------------------------------------------------------
-- Source consolidée : 20260721080000_personnel_payroll.sql
-- -----------------------------------------------------------------------------

create type public.employee_status as enum ('active', 'suspended', 'exited');
create type public.compensation_mode as enum ('fixed', 'hourly', 'session', 'flat_rate', 'mixed', 'unpaid');
create type public.contract_status as enum ('draft', 'active', 'ended', 'terminated');
create type public.work_entry_status as enum ('planned', 'completed', 'validated', 'rejected', 'paid');
create type public.payroll_status as enum ('draft', 'calculated', 'validated', 'partially_paid', 'paid', 'closed', 'cancelled');

create table public.personnel_catalog (
  id uuid primary key default extensions.gen_random_uuid(),
  category text not null check (category in ('function','contract_type','work_type','bonus_type','deduction_type','advance_type','leave_type','sanction_type','document_type')),
  code text not null,
  default_label text not null check (char_length(trim(default_label)) between 2 and 120),
  description text,
  display_order integer not null default 0 check (display_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (category,code)
);

insert into public.personnel_catalog(category,code,default_label,description,display_order) values
  ('function','TEACHER','Enseignant(e)','Personnel enseignant',10),
  ('function','HEAD_TEACHER','Enseignant(e) principal(e)','Responsable pédagogique principal d’une classe',15),
  ('function','DIRECTOR','Directeur / Directrice','Direction d’un établissement primaire ou polyvalent',20),
  ('function','PRINCIPAL','Principal(e)','Direction d’un collège',30),
  ('function','PROVISOR','Proviseur','Direction d’un lycée',40),
  ('function','CENSOR','Censeur','Responsabilité pédagogique du secondaire',50),
  ('function','STUDIES_DIRECTOR','Directeur des études','Pilotage des études et programmes',60),
  ('function','HR_MANAGER','Responsable du personnel','Gestion administrative du personnel',65),
  ('function','ACCOUNTANT','Comptable','Comptabilité de l’établissement',70),
  ('function','SECRETARY','Secrétaire','Secrétariat administratif',75),
  ('function','CASHIER','Caissier / Caissière','Encaissements et tenue de caisse',80),
  ('function','SUPERVISOR','Surveillant(e)','Surveillance et vie scolaire',90),
  ('function','LIBRARIAN','Bibliothécaire','Gestion de la bibliothèque',100),
  ('function','NURSE','Infirmier / Infirmière scolaire','Santé scolaire',105),
  ('function','CARETAKER','Gardien(ne)','Gardiennage de l’établissement',110),
  ('function','DRIVER','Chauffeur','Transport de l’établissement',115),
  ('function','CLEANER','Agent d’entretien','Entretien et propreté',120),
  ('function','COOK','Cuisinier / Cuisinière','Restauration scolaire',125),
  ('function','MAINTENANCE','Agent de maintenance','Maintenance des locaux et équipements',130),
  ('contract_type','PERMANENT_PUBLIC','Titulaire du public','Personnel titulaire affecté dans un établissement public',10),
  ('contract_type','CDI','Contrat à durée indéterminée','Contrat salarié sans date de fin prévue',20),
  ('contract_type','CDD','Contrat à durée déterminée','Contrat salarié avec une date de fin',30),
  ('contract_type','TEMPORARY','Contrat temporaire','Renfort temporaire',40),
  ('contract_type','VACATION','Vacation / Enseignement à l’heure','Rémunération à l’heure ou à la séance',50),
  ('contract_type','INTERNSHIP','Stage','Convention ou contrat de stage',60),
  ('contract_type','SERVICE','Prestation de service','Prestation indépendante',70),
  ('contract_type','VOLUNTEER','Bénévolat','Activité sans rémunération contractuelle',80),
  ('work_type','TEACHING','Cours dispensé','Heure ou séance d’enseignement',10),
  ('work_type','REMEDIAL','Cours de rattrapage','Séance de remédiation ou rattrapage',20),
  ('work_type','EXAM_SUPERVISION','Surveillance d’examen','Surveillance d’une épreuve',30),
  ('work_type','CORRECTION','Correction de copies','Correction de devoirs ou compositions',40),
  ('work_type','EXAM_MARKING','Correction d’examen','Correction d’un examen national ou blanc',45),
  ('work_type','MEETING','Réunion pédagogique','Réunion liée aux activités pédagogiques',50),
  ('work_type','TRAINING','Formation','Participation à une formation',55),
  ('work_type','ADMINISTRATIVE','Activité administrative','Travail administratif ponctuel',60),
  ('work_type','ON_CALL','Permanence','Permanence planifiée',65),
  ('work_type','OVERTIME','Heures supplémentaires','Temps de travail au-delà du service prévu',70),
  ('bonus_type','RESPONSIBILITY','Prime de responsabilité','Prime liée à une fonction ou responsabilité',10),
  ('bonus_type','SENIORITY','Prime d’ancienneté','Prime liée à l’ancienneté',20),
  ('bonus_type','TRANSPORT','Indemnité de transport','Participation aux frais de déplacement',30),
  ('bonus_type','EXAM','Prime d’examen et correction','Prime liée aux examens',35),
  ('bonus_type','HOUSING','Indemnité de logement','Participation aux frais de logement',40),
  ('bonus_type','ATTENDANCE','Prime d’assiduité','Prime liée à l’assiduité',45),
  ('bonus_type','PERFORMANCE','Prime exceptionnelle','Prime ponctuelle de performance',50),
  ('bonus_type','OTHER','Autre prime','Extension locale pour une autre prime',900),
  ('deduction_type','ABSENCE','Absence non rémunérée','Retenue liée à une absence',10),
  ('deduction_type','ADVANCE','Remboursement d’avance','Retenue de remboursement d’une avance',20),
  ('deduction_type','LATE','Retard','Retenue liée à des retards',30),
  ('deduction_type','DISCIPLINARY','Retenue disciplinaire','Retenue résultant d’une décision disciplinaire',40),
  ('deduction_type','DAMAGE','Dommage ou perte','Retenue autorisée liée à un dommage ou une perte',50),
  ('deduction_type','OTHER','Autre retenue','Extension locale pour une autre retenue',900),
  ('advance_type','SALARY','Avance sur salaire','Avance ordinaire sur la rémunération',10),
  ('advance_type','EMERGENCY','Avance exceptionnelle','Avance motivée par une situation exceptionnelle',20),
  ('advance_type','SCHOOL_START','Avance de rentrée','Avance liée aux dépenses de rentrée',30),
  ('advance_type','MEDICAL','Avance médicale','Avance liée à une dépense de santé',40),
  ('leave_type','ANNUAL','Congé annuel','Congé annuel planifié',10),
  ('leave_type','SICK','Congé maladie','Absence justifiée pour maladie',20),
  ('leave_type','MATERNITY','Congé maternité','Congé lié à la maternité',30),
  ('leave_type','PATERNITY','Congé paternité','Congé lié à la naissance d’un enfant',40),
  ('leave_type','FAMILY','Événement familial','Congé pour événement familial',50),
  ('leave_type','BEREAVEMENT','Décès / Deuil','Congé pour décès ou deuil',60),
  ('leave_type','UNPAID','Congé sans solde','Congé sans maintien de rémunération',70),
  ('leave_type','TRAINING','Formation','Absence autorisée pour formation',80),
  ('leave_type','AUTHORIZED_ABSENCE','Absence autorisée','Absence ponctuelle autorisée',90),
  ('leave_type','UNJUSTIFIED_ABSENCE','Absence non justifiée','Absence enregistrée sans justification acceptée',100),
  ('sanction_type','VERBAL_WARNING','Rappel verbal consigné','Rappel formalisé dans le dossier du salarié',5),
  ('sanction_type','WARNING','Avertissement','Avertissement écrit',10),
  ('sanction_type','REPRIMAND','Blâme','Blâme écrit',20),
  ('sanction_type','SUSPENSION','Suspension','Suspension temporaire selon décision autorisée',30),
  ('sanction_type','DISMISSAL','Rupture disciplinaire','Rupture du contrat pour motif disciplinaire',40),
  ('document_type','IDENTITY_CARD','Pièce d’identité','Copie d’une pièce d’identité valide',10),
  ('document_type','CONTRACT','Contrat signé','Contrat ou avenant signé',20),
  ('document_type','DIPLOMA','Diplôme ou attestation','Diplôme, certificat ou attestation professionnelle',30),
  ('document_type','PHOTO','Photo d’identité','Photo récente du salarié',40),
  ('document_type','CRIMINAL_RECORD','Extrait de casier judiciaire','Extrait demandé lorsque le poste le justifie',50),
  ('document_type','CV','Curriculum vitæ','Curriculum vitæ du salarié',60),
  ('document_type','WORK_CERTIFICATE','Certificat de travail','Certificat produit ou reçu dans le parcours professionnel',70),
  ('document_type','MEDICAL','Certificat médical','Document médical administratif',80),
  ('document_type','PAYMENT_DETAILS','Coordonnées de paiement','Informations nécessaires au paiement de la rémunération',90),
  ('document_type','OTHER','Autre document','Extension locale pour un autre document',900);

alter table public.personnel_catalog enable row level security;
create policy personnel_catalog_read on public.personnel_catalog for select to authenticated using(is_active);
grant select on public.personnel_catalog to authenticated;
revoke all on public.personnel_catalog from anon;

create table public.personnel_catalog_items (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  catalog_id uuid references public.personnel_catalog(id) on delete restrict,
  category text not null check (category in ('function','contract_type','work_type','bonus_type','deduction_type','advance_type','leave_type','sanction_type')),
  code text not null, default_label text not null, local_label text, is_system boolean not null default false,
  is_active boolean not null default true, display_order integer not null default 0, created_at timestamptz not null default now(),
  unique nulls not distinct (institution_id, category, code)
);
create unique index personnel_catalog_items_catalog_idx
  on public.personnel_catalog_items(institution_id,catalog_id) where catalog_id is not null;

create table public.employees (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  membership_id uuid references public.memberships(id) on delete set null, employee_number text not null,
  first_name text not null, last_name text not null, gender text, birth_date date, birth_place text, nationality text,
  phone text, secondary_phone text, email text, address text, emergency_contact_name text, emergency_contact_phone text,
  identity_type text, identity_number text, identity_expires_on date, hired_on date not null default current_date,
  status public.employee_status not null default 'active', exited_on date, exit_reason text, notes text,
  created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (institution_id, employee_number), check ((status <> 'exited') or exited_on is not null)
);

create table public.employee_functions (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  function_item_id uuid not null references public.personnel_catalog_items(id), is_primary boolean not null default false,
  responsibility text, starts_on date not null, ends_on date, is_active boolean not null default true,
  created_at timestamptz not null default now(), check (ends_on is null or ends_on >= starts_on)
);
create unique index employee_one_primary_function_idx on public.employee_functions(employee_id) where is_primary and is_active;

create table public.employee_contracts (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict, contract_type_item_id uuid references public.personnel_catalog_items(id),
  reference text, starts_on date not null, ends_on date, status public.contract_status not null default 'draft',
  compensation_mode public.compensation_mode not null, fixed_amount numeric(14,2) not null default 0 check (fixed_amount >= 0),
  hourly_rate numeric(14,2) not null default 0 check (hourly_rate >= 0), session_rate numeric(14,2) not null default 0 check (session_rate >= 0),
  payment_frequency text not null default 'monthly', weekly_hours numeric(6,2), payment_method text, document_path text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (ends_on is null or ends_on >= starts_on)
);
create unique index employee_one_active_contract_idx on public.employee_contracts(institution_id, employee_id) where status = 'active';

create table public.work_entries (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict, contract_id uuid references public.employee_contracts(id),
  work_type_item_id uuid references public.personnel_catalog_items(id), work_date date not null, started_at time, ended_at time,
  minutes integer not null check (minutes > 0), quantity numeric(8,2) not null default 1 check (quantity > 0),
  rate numeric(14,2) check (rate is null or rate >= 0), source text not null default 'manual', status public.work_entry_status not null default 'completed',
  notes text, validated_by uuid, validated_at timestamptz, payroll_entry_id uuid, created_at timestamptz not null default now()
);

create table public.leave_requests (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict, leave_type_item_id uuid references public.personnel_catalog_items(id),
  starts_on date not null, ends_on date not null, reason text, document_path text,
  status text not null default 'draft' check (status in ('draft','submitted','approved','rejected','cancelled')),
  decided_by uuid, decision_comment text, created_at timestamptz not null default now(), check (ends_on >= starts_on)
);

create table public.payroll_periods (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null, starts_on date not null, ends_on date not null, status public.payroll_status not null default 'draft',
  validated_by uuid, validated_at timestamptz, closed_by uuid, closed_at timestamptz, created_at timestamptz not null default now(),
  unique (institution_id, starts_on, ends_on), check (ends_on >= starts_on)
);

create table public.payroll_entries (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  period_id uuid not null references public.payroll_periods(id) on delete restrict, employee_id uuid not null references public.employees(id) on delete restrict,
  contract_id uuid references public.employee_contracts(id), fixed_amount numeric(14,2) not null default 0,
  variable_amount numeric(14,2) not null default 0, gains numeric(14,2) not null default 0, deductions numeric(14,2) not null default 0,
  advance_repayments numeric(14,2) not null default 0, gross_amount numeric(14,2) generated always as (fixed_amount + variable_amount + gains) stored,
  net_amount numeric(14,2) generated always as (fixed_amount + variable_amount + gains - deductions - advance_repayments) stored,
  paid_amount numeric(14,2) not null default 0, status public.payroll_status not null default 'draft', created_at timestamptz not null default now(),
  unique (period_id, employee_id)
);
alter table public.work_entries add constraint work_entries_payroll_entry_fk foreign key (payroll_entry_id) references public.payroll_entries(id);

create table public.payroll_adjustments (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  payroll_entry_id uuid not null references public.payroll_entries(id) on delete cascade,
  kind text not null check (kind in ('gain','deduction','regularization')), catalog_item_id uuid references public.personnel_catalog_items(id),
  label text not null, amount numeric(14,2) not null check (amount > 0), notes text, created_at timestamptz not null default now()
);

create table public.salary_advances (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict, amount_requested numeric(14,2) not null check (amount_requested > 0),
  amount_approved numeric(14,2) check (amount_approved >= 0), repaid_amount numeric(14,2) not null default 0 check (repaid_amount >= 0),
  requested_on date not null default current_date, granted_on date, reason text,
  status text not null default 'requested' check (status in ('requested','approved','rejected','paid','settled','cancelled')), created_at timestamptz not null default now()
);

create table public.employee_sanctions (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict, sanction_type_item_id uuid references public.personnel_catalog_items(id),
  incident_on date not null, decided_on date, reason text not null, description text, decision text,
  status text not null default 'draft' check (status in ('draft','notified','contested','closed','cancelled')),
  created_by uuid default auth.uid(), created_at timestamptz not null default now()
);

create table public.payroll_payments (
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  payroll_entry_id uuid not null references public.payroll_entries(id) on delete restrict, amount numeric(14,2) not null check (amount > 0),
  paid_on date not null default current_date, method text not null, reference text, created_by uuid default auth.uid(), created_at timestamptz not null default now()
);

create index employees_institution_status_idx on public.employees(institution_id, status);
create index work_entries_validation_idx on public.work_entries(institution_id, work_date, status);
create index payroll_entries_period_idx on public.payroll_entries(period_id, status);

create or replace function public.assign_employee_number()
returns trigger language plpgsql set search_path = '' as $$
declare next_number integer;
begin
  if new.employee_number is null or btrim(new.employee_number) = '' then
    perform pg_advisory_xact_lock(hashtext(new.institution_id::text || ':employee-number'));
    select coalesce(max(nullif(substring(employee_number from '([0-9]+)$'), '')::integer), 0) + 1
      into next_number from public.employees where institution_id = new.institution_id;
    new.employee_number := 'PER-' || extract(year from current_date)::integer || '-' || lpad(next_number::text, 4, '0');
  end if;
  return new;
end $$;
create trigger employees_assign_number before insert on public.employees for each row execute function public.assign_employee_number();

create trigger employees_updated_at before update on public.employees for each row execute function public.set_updated_at();
create trigger employee_contracts_updated_at before update on public.employee_contracts for each row execute function public.set_updated_at();

do $$ declare t text; begin
  foreach t in array array['personnel_catalog_items','employees','employee_functions','employee_contracts','work_entries','leave_requests','payroll_periods','payroll_entries','payroll_adjustments','salary_advances','employee_sanctions','payroll_payments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_active_member(institution_id))', t || '_select', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.has_institution_role(institution_id, array[''owner'',''admin'']::public.app_role[])) with check (public.has_institution_role(institution_id, array[''owner'',''admin'']::public.app_role[]))', t || '_admin', t);
  end loop;
end $$;

create policy work_entries_secretary on public.work_entries for all to authenticated
using (public.has_institution_role(institution_id, array['secretary']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['secretary']::public.app_role[]));
create policy leave_requests_secretary on public.leave_requests for all to authenticated
using (public.has_institution_role(institution_id, array['secretary']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['secretary']::public.app_role[]));
create policy payroll_entries_finance on public.payroll_entries for all to authenticated
using (public.has_institution_role(institution_id, array['finance']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['finance']::public.app_role[]));
create policy payroll_payments_finance on public.payroll_payments for all to authenticated
using (public.has_institution_role(institution_id, array['finance']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['finance']::public.app_role[]));

grant select, insert, update, delete on public.personnel_catalog_items, public.employees, public.employee_functions,
public.employee_contracts, public.work_entries, public.leave_requests, public.payroll_periods, public.payroll_entries,
public.payroll_adjustments, public.salary_advances, public.employee_sanctions, public.payroll_payments to authenticated;

create or replace function public.calculate_payroll_period(target_period_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare p public.payroll_periods; c record; new_entry uuid; count_entries integer := 0; variable_total numeric(14,2);
begin
  select * into p from public.payroll_periods where id=target_period_id for update;
  if p.id is null then raise exception 'payroll_period_not_found'; end if;
  if not public.has_institution_role(p.institution_id,array['owner','admin','finance']::public.app_role[]) then raise exception 'forbidden'; end if;
  if p.status not in ('draft','calculated') then raise exception 'payroll_period_not_editable'; end if;
  update public.work_entries set payroll_entry_id=null where payroll_entry_id in (select id from public.payroll_entries where period_id=p.id);
  delete from public.payroll_entries where period_id=p.id;
  for c in select c.* from public.employee_contracts c join public.employees e on e.id=c.employee_id where c.institution_id=p.institution_id and c.status='active' and e.status='active' and c.starts_on<=p.ends_on and (c.ends_on is null or c.ends_on>=p.starts_on)
  loop
    select coalesce(sum(case when c.compensation_mode='session' then w.quantity*coalesce(w.rate,c.session_rate) else (w.minutes::numeric/60)*coalesce(w.rate,c.hourly_rate) end),0) into variable_total from public.work_entries w where w.contract_id=c.id and w.status='validated' and w.work_date between p.starts_on and p.ends_on and w.payroll_entry_id is null;
    insert into public.payroll_entries(institution_id,period_id,employee_id,contract_id,fixed_amount,variable_amount,status) values(p.institution_id,p.id,c.employee_id,c.id,case when c.compensation_mode in ('fixed','mixed','flat_rate') then c.fixed_amount else 0 end,variable_total,'calculated') returning id into new_entry;
    update public.work_entries set payroll_entry_id=new_entry where contract_id=c.id and status='validated' and work_date between p.starts_on and p.ends_on and payroll_entry_id is null;
    count_entries:=count_entries+1;
  end loop;
  update public.payroll_periods set status='calculated' where id=p.id;
  return count_entries;
end $$;

create or replace function public.transition_payroll_period(target_period_id uuid,new_status public.payroll_status)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.payroll_periods;
begin
  select * into p from public.payroll_periods where id=target_period_id for update;
  if p.id is null then raise exception 'payroll_period_not_found'; end if;
  if not public.has_institution_role(p.institution_id,array['owner','admin','finance']::public.app_role[]) then raise exception 'forbidden'; end if;
  if not ((p.status='calculated' and new_status='validated') or (p.status in ('validated','paid') and new_status='closed')) then raise exception 'invalid_payroll_transition'; end if;
  if new_status='closed' and exists(select 1 from public.payroll_entries where period_id=p.id and paid_amount<net_amount) then raise exception 'payroll_has_unpaid_balance'; end if;
  update public.payroll_periods set status=new_status,validated_by=case when new_status='validated' then auth.uid() else validated_by end,validated_at=case when new_status='validated' then now() else validated_at end,closed_by=case when new_status='closed' then auth.uid() else closed_by end,closed_at=case when new_status='closed' then now() else closed_at end where id=p.id;
  update public.payroll_entries set status=new_status where period_id=p.id;
end $$;

revoke all on function public.calculate_payroll_period(uuid), public.transition_payroll_period(uuid,public.payroll_status) from public;
grant execute on function public.calculate_payroll_period(uuid), public.transition_payroll_period(uuid,public.payroll_status) to authenticated;


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260721100000_use_cycle_grading_scale.sql
-- -----------------------------------------------------------------------------

create or replace function public.prepare_gradebook_note()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  selected_type public.assessment_types;
  selected_scale numeric(6,2);
begin
  select * into selected_type from public.assessment_types
  where id = new.note_type_id and institution_id = new.institution_id
    and academic_year_id = new.academic_year_id and is_active;
  if selected_type.id is null then raise exception 'inactive_or_invalid_note_type'; end if;

  select cycle.grading_scale into selected_scale
  from public.school_classes class
  join public.academic_year_levels level on level.id = class.academic_year_level_id
  join public.academic_year_cycles cycle
    on cycle.academic_year_id = class.academic_year_id
   and cycle.cycle_id = level.cycle_id
  join public.academic_periods period
    on period.id = new.period_id
   and period.academic_year_id = class.academic_year_id
   and period.cycle_id = level.cycle_id
  where class.id = new.class_id and class.academic_year_id = new.academic_year_id;
  if selected_scale is null then raise exception 'cycle_grading_scale_not_found'; end if;

  if not exists (
    select 1 from public.pedagogical_assignments assignment
    where assignment.institution_id = new.institution_id
      and assignment.academic_year_id = new.academic_year_id
      and assignment.class_id = new.class_id
      and (assignment.subject_id = new.subject_id or assignment.role = 'main_teacher')
      and assignment.teacher_id = new.teacher_id and assignment.is_active
      and (assignment.all_periods or exists (
        select 1 from public.pedagogical_assignment_periods scope
        where scope.assignment_id = assignment.id and scope.period_id = new.period_id
      ))
  ) then raise exception 'course_not_accessible'; end if;
  if not public.has_institution_role(new.institution_id, array['owner','admin']::public.app_role[])
    and not exists (
      select 1 from public.people person
      where person.id = new.teacher_id and person.auth_user_id = auth.uid()
    ) then raise exception 'teacher_course_access_denied'; end if;
  new.scale_snapshot := selected_scale;
  return new;
end;
$$;

comment on column public.gradebook_notes.scale_snapshot is
  'Barème annuel du cycle figé au moment de la création de la note.';


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260721190000_personnel_payroll_forms.sql
-- -----------------------------------------------------------------------------

-- Atomic write operations used by the payroll forms.
alter table public.salary_advances add column if not exists advance_type_item_id uuid references public.personnel_catalog_items(id);

alter table public.personnel_catalog_items drop constraint if exists personnel_catalog_items_category_check;
alter table public.personnel_catalog_items add constraint personnel_catalog_items_category_check check(category in ('function','contract_type','work_type','bonus_type','deduction_type','advance_type','leave_type','sanction_type','document_type'));

create table public.employee_documents(
  id uuid primary key default extensions.gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  document_type_item_id uuid references public.personnel_catalog_items(id), name text not null,
  file_path text not null, issued_on date, expires_on date, notes text,
  created_by uuid default auth.uid(), created_at timestamptz not null default now(),
  check(expires_on is null or issued_on is null or expires_on>=issued_on)
);
alter table public.employee_documents enable row level security;
create policy employee_documents_select on public.employee_documents for select to authenticated using(public.is_active_member(institution_id));
create policy employee_documents_manage on public.employee_documents for all to authenticated using(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[])) with check(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[]));
grant select,insert,update on public.employee_documents to authenticated;

insert into public.personnel_catalog_items(institution_id,category,code,default_label,is_system,is_active,display_order)
select id,'document_type',v.code,v.label,true,true,v.ord from public.institutions cross join(values
('IDENTITY','Pièce d’identité',10),('CONTRACT','Contrat signé',20),('DIPLOMA','Diplôme ou attestation',30),('PHOTO','Photo d’identité',40),('OTHER','Autre document',90)
)v(code,label,ord) on conflict do nothing;

create or replace function public.add_payroll_adjustment(
  target_entry_id uuid, adjustment_kind text, adjustment_label text,
  adjustment_amount numeric, target_catalog_item_id uuid default null,
  adjustment_notes text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare entry_row public.payroll_entries%rowtype; adjustment_id uuid;
begin
  select * into entry_row from public.payroll_entries where id=target_entry_id for update;
  if not found or not public.has_institution_role(entry_row.institution_id,array['owner','admin','finance']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if entry_row.status not in ('calculated') then raise exception 'payroll_entry_not_editable'; end if;
  if adjustment_kind not in ('gain','deduction') or adjustment_amount<=0 or nullif(trim(adjustment_label),'') is null then raise exception 'invalid_adjustment'; end if;
  insert into public.payroll_adjustments(institution_id,payroll_entry_id,kind,catalog_item_id,label,amount,notes)
  values(entry_row.institution_id,target_entry_id,adjustment_kind,target_catalog_item_id,trim(adjustment_label),adjustment_amount,nullif(trim(adjustment_notes),'')) returning id into adjustment_id;
  update public.payroll_entries set
    gains=gains+case when adjustment_kind='gain' then adjustment_amount else 0 end,
    deductions=deductions+case when adjustment_kind='deduction' then adjustment_amount else 0 end
  where id=target_entry_id;
  return adjustment_id;
end $$;

create or replace function public.record_payroll_payment(
  target_entry_id uuid, payment_amount numeric, payment_date date,
  payment_method text, payment_reference text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare entry_row public.payroll_entries%rowtype; payment_id uuid; new_paid numeric;
begin
  select * into entry_row from public.payroll_entries where id=target_entry_id for update;
  if not found or not public.has_institution_role(entry_row.institution_id,array['owner','admin','finance']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if entry_row.status not in ('validated','partially_paid','paid') then raise exception 'payroll_entry_not_payable'; end if;
  if payment_amount<=0 or entry_row.paid_amount+payment_amount>entry_row.net_amount then raise exception 'invalid_payment_amount'; end if;
  insert into public.payroll_payments(institution_id,payroll_entry_id,amount,paid_on,method,reference,created_by)
  values(entry_row.institution_id,target_entry_id,payment_amount,payment_date,trim(payment_method),nullif(trim(payment_reference),''),auth.uid()) returning id into payment_id;
  new_paid:=entry_row.paid_amount+payment_amount;
  update public.payroll_entries set paid_amount=new_paid,status=case when new_paid=net_amount then 'paid'::public.payroll_status else 'partially_paid'::public.payroll_status end where id=target_entry_id;
  update public.payroll_periods p set status=case
    when not exists(select 1 from public.payroll_entries e where e.period_id=p.id and e.paid_amount<e.net_amount) then 'paid'::public.payroll_status
    else 'partially_paid'::public.payroll_status end where p.id=entry_row.period_id and p.status<>'closed';
  return payment_id;
end $$;
revoke all on function public.add_payroll_adjustment(uuid,text,text,numeric,uuid,text),public.record_payroll_payment(uuid,numeric,date,text,text) from public;
grant execute on function public.add_payroll_adjustment(uuid,text,text,numeric,uuid,text),public.record_payroll_payment(uuid,numeric,date,text,text) to authenticated;


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260721210000_personnel_employee_rates_access_catalogs.sql
-- -----------------------------------------------------------------------------

-- Employee compensation belongs to the employee, independently from a contract.
create table public.employee_compensation_rates (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  hourly_rate numeric(14,2) not null check (hourly_rate >= 0),
  effective_from date not null,
  effective_to date,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from)
);
create unique index employee_compensation_rates_current_idx
  on public.employee_compensation_rates(employee_id) where effective_to is null;
create index employee_compensation_rates_history_idx
  on public.employee_compensation_rates(employee_id, effective_from desc);

insert into public.employee_compensation_rates(institution_id,employee_id,hourly_rate,effective_from)
select c.institution_id,c.employee_id,c.hourly_rate,c.starts_on
from public.employee_contracts c
where c.hourly_rate > 0 and c.status='active'
on conflict do nothing;

alter table public.employee_compensation_rates enable row level security;
create policy employee_compensation_rates_select on public.employee_compensation_rates
  for select to authenticated using(public.is_active_member(institution_id));
create policy employee_compensation_rates_manage on public.employee_compensation_rates
  for all to authenticated
  using(public.has_institution_role(institution_id,array['owner','admin','finance']::public.app_role[]))
  with check(public.has_institution_role(institution_id,array['owner','admin','finance']::public.app_role[]));
grant select,insert,update on public.employee_compensation_rates to authenticated;

create or replace function public.set_employee_hourly_rate(
  target_employee_id uuid, new_hourly_rate numeric, starts_on date, rate_notes text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare employee_row public.employees%rowtype; saved_id uuid;
begin
  select * into employee_row from public.employees where id=target_employee_id;
  if not found or not public.has_institution_role(employee_row.institution_id,array['owner','admin','finance']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  if new_hourly_rate < 0 then raise exception 'invalid_hourly_rate'; end if;
  update public.employee_compensation_rates
    set effective_to=starts_on-1
    where employee_id=target_employee_id and effective_to is null and effective_from<starts_on;
  delete from public.employee_compensation_rates
    where employee_id=target_employee_id and effective_to is null and effective_from>=starts_on;
  insert into public.employee_compensation_rates(institution_id,employee_id,hourly_rate,effective_from,notes)
  values(employee_row.institution_id,target_employee_id,new_hourly_rate,starts_on,nullif(trim(rate_notes),''))
  returning id into saved_id;
  return saved_id;
end $$;

create or replace function public.create_employee_access_invitation(
  target_employee_id uuid, assigned_role public.app_role default 'teacher'
) returns text language plpgsql security definer set search_path='' as $$
declare employee_row public.employees%rowtype; person_id uuid; raw_token text;
begin
  select * into employee_row from public.employees where id=target_employee_id for update;
  if not found or not public.has_institution_role(employee_row.institution_id,array['owner','admin']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  if nullif(lower(trim(employee_row.email)),'') is null then raise exception 'employee_email_required'; end if;
  select id into person_id from public.people
    where institution_id=employee_row.institution_id and lower(email)=lower(employee_row.email) limit 1;
  if person_id is null then
    insert into public.people(institution_id,first_name,last_name,email,phone,status)
    values(employee_row.institution_id,employee_row.first_name,employee_row.last_name,lower(employee_row.email),employee_row.phone,'active')
    returning id into person_id;
  end if;
  insert into public.person_roles(institution_id,person_id,role)
    values(employee_row.institution_id,person_id,assigned_role)
    on conflict(person_id,role) do nothing;
  raw_token:=public.create_person_invitation(person_id);
  return raw_token;
end $$;

create or replace function public.calculate_payroll_period(target_period_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare p public.payroll_periods; c record; new_entry uuid; count_entries integer := 0; variable_total numeric(14,2);
begin
  select * into p from public.payroll_periods where id=target_period_id for update;
  if p.id is null then raise exception 'payroll_period_not_found'; end if;
  if not public.has_institution_role(p.institution_id,array['owner','admin','finance']::public.app_role[]) then raise exception 'forbidden'; end if;
  if p.status not in ('draft','calculated') then raise exception 'payroll_period_not_editable'; end if;
  update public.work_entries set payroll_entry_id=null where payroll_entry_id in (select id from public.payroll_entries where period_id=p.id);
  delete from public.payroll_entries where period_id=p.id;
  for c in select c.* from public.employee_contracts c join public.employees e on e.id=c.employee_id where c.institution_id=p.institution_id and c.status='active' and e.status='active' and c.starts_on<=p.ends_on and (c.ends_on is null or c.ends_on>=p.starts_on)
  loop
    select coalesce(sum(case when c.compensation_mode='session' then w.quantity*coalesce(w.rate,c.session_rate) else (w.minutes::numeric/60)*coalesce(w.rate,r.hourly_rate,0) end),0)
    into variable_total
    from public.work_entries w
    left join lateral (
      select hourly_rate from public.employee_compensation_rates er
      where er.employee_id=c.employee_id and er.effective_from<=w.work_date and (er.effective_to is null or er.effective_to>=w.work_date)
      order by er.effective_from desc limit 1
    ) r on true
    where w.contract_id=c.id and w.status='validated' and w.work_date between p.starts_on and p.ends_on and w.payroll_entry_id is null;
    insert into public.payroll_entries(institution_id,period_id,employee_id,contract_id,fixed_amount,variable_amount,status) values(p.institution_id,p.id,c.employee_id,c.id,case when c.compensation_mode in ('fixed','mixed','flat_rate') then c.fixed_amount else 0 end,variable_total,'calculated') returning id into new_entry;
    update public.work_entries set payroll_entry_id=new_entry where contract_id=c.id and status='validated' and work_date between p.starts_on and p.ends_on and payroll_entry_id is null;
    count_entries:=count_entries+1;
  end loop;
  update public.payroll_periods set status='calculated' where id=p.id;
  return count_entries;
end $$;

revoke all on function public.set_employee_hourly_rate(uuid,numeric,date,text),public.create_employee_access_invitation(uuid,public.app_role) from public;
grant execute on function public.set_employee_hourly_rate(uuid,numeric,date,text),public.create_employee_access_invitation(uuid,public.app_role) to authenticated;

create or replace function public.accept_person_invitation(raw_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invitation public.person_invitations; assigned_role public.app_role; saved_membership_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  select * into invitation from public.person_invitations
  where token_hash=encode(extensions.digest(raw_token,'sha256'),'hex') and status='pending' and expires_at>now() for update;
  if invitation.id is null then raise exception 'invalid_or_expired_invitation'; end if;
  if lower(coalesce((select auth.jwt()->>'email'),''))<>lower(invitation.email) then raise exception 'invitation_email_mismatch'; end if;
  update public.people set auth_user_id=(select auth.uid()) where id=invitation.person_id and auth_user_id is null;
  select role into assigned_role from public.person_roles where person_id=invitation.person_id
  order by case role::text when 'owner' then 1 when 'admin' then 2 when 'secretary' then 3 when 'finance' then 4 when 'teacher' then 5 else 6 end limit 1;
  if assigned_role is null then raise exception 'person_role_required'; end if;
  insert into public.memberships(institution_id,user_id,role)
  values(invitation.institution_id,(select auth.uid()),assigned_role)
  on conflict(institution_id,user_id) do update set status='active',role=excluded.role
  returning id into saved_membership_id;
  update public.employees set membership_id=saved_membership_id
  where institution_id=invitation.institution_id and lower(email)=lower(invitation.email) and membership_id is null;
  update public.person_invitations set status='accepted',accepted_at=now() where id=invitation.id;
  return saved_membership_id;
end $$;

insert into public.personnel_catalog_items(institution_id,category,code,default_label,is_system,is_active,display_order)
select i.id,v.category,v.code,v.label,true,true,v.ord from public.institutions i cross join(values
('function','DIRECTOR','Directeur / Directrice',20),('function','PRINCIPAL','Principal(e)',30),('function','PROVISOR','Proviseur',40),('function','CENSOR','Censeur',50),('function','STUDIES_DIRECTOR','Directeur des études',60),('function','ACCOUNTANT','Comptable',70),('function','CASHIER','Caissier / Caissière',80),('function','SUPERVISOR','Surveillant(e)',90),('function','LIBRARIAN','Bibliothécaire',100),('function','CARETAKER','Gardien(ne)',110),('function','CLEANER','Agent d’entretien',120),
('contract_type','CDD','Contrat à durée déterminée',30),('contract_type','CDI','Contrat à durée indéterminée',40),('contract_type','TEMPORARY','Contrat temporaire',50),('contract_type','INTERNSHIP','Stage',60),('contract_type','SERVICE','Prestation de service',70),
('work_type','REMEDIAL','Cours de rattrapage',20),('work_type','EXAM_SUPERVISION','Surveillance d’examen',30),('work_type','CORRECTION','Correction de copies',40),('work_type','MEETING','Réunion pédagogique',50),('work_type','ADMINISTRATIVE','Activité administrative',60),('work_type','OVERTIME','Heures supplémentaires',70),
('bonus_type','SENIORITY','Ancienneté',20),('bonus_type','TRANSPORT','Transport',30),('bonus_type','HOUSING','Logement',40),('bonus_type','PERFORMANCE','Prime exceptionnelle',50),
('deduction_type','ADVANCE','Remboursement d’avance',20),('deduction_type','LATE','Retard',30),('deduction_type','DISCIPLINARY','Retenue disciplinaire',40),
('advance_type','SALARY','Avance sur salaire',10),('advance_type','EMERGENCY','Avance exceptionnelle',20),
('leave_type','SICK','Congé maladie',20),('leave_type','MATERNITY','Congé maternité',30),('leave_type','PATERNITY','Congé paternité',40),('leave_type','FAMILY','Événement familial',50),('leave_type','UNPAID','Congé sans solde',60),('leave_type','TRAINING','Formation',70),
('sanction_type','WARNING','Avertissement',10),('sanction_type','REPRIMAND','Blâme',20),('sanction_type','SUSPENSION','Suspension',30),
('document_type','CV','Curriculum vitæ',50),('document_type','WORK_CERTIFICATE','Certificat de travail',60),('document_type','MEDICAL','Certificat médical',70),('document_type','BANK_DETAILS','Coordonnées bancaires',80)
) v(category,code,label,ord)
on conflict(institution_id,category,code) do nothing;


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260721220000_complete_personnel_workflows.sql
-- -----------------------------------------------------------------------------

-- Complete the validated Personnel workflows without changing roles or RLS.
create table public.personnel_settings (
  institution_id uuid primary key references public.institutions(id) on delete cascade,
  employee_number_prefix text not null default 'PER',
  employee_number_year boolean not null default true,
  employee_number_digits smallint not null default 4 check (employee_number_digits between 3 and 8),
  employee_number_editable boolean not null default false,
  currency text not null default 'GNF' check (currency = 'GNF'),
  rounding_step integer not null default 1 check (rounding_step in (1, 5, 10, 100, 500, 1000)),
  contract_alert_days integer not null default 30 check (contract_alert_days between 0 and 365),
  document_alert_days integer not null default 30 check (document_alert_days between 0 and 365),
  default_payment_method text not null default 'cash',
  updated_at timestamptz not null default now()
);

alter table public.employee_contracts
  add column if not exists parent_contract_id uuid references public.employee_contracts(id),
  add column if not exists change_kind text not null default 'initial'
    check (change_kind in ('initial','renewal','amendment')),
  add column if not exists termination_reason text;

alter table public.leave_requests
  add column if not exists duration_unit text not null default 'day'
    check (duration_unit in ('day','half_day','hour')),
  add column if not exists duration_hours numeric(6,2) check (duration_hours is null or duration_hours > 0),
  add column if not exists impacts_payroll boolean not null default false,
  add column if not exists submitted_at timestamptz,
  add column if not exists decided_at timestamptz;

alter table public.salary_advances
  add column if not exists paid_on date,
  add column if not exists installment_amount numeric(14,2) check (installment_amount is null or installment_amount > 0),
  add column if not exists first_repayment_on date,
  add column if not exists decision_comment text,
  add column if not exists decided_by uuid,
  add column if not exists decided_at timestamptz;

alter table public.payroll_adjustments
  add column if not exists regularization_effect text
    check (regularization_effect in ('gain','deduction')),
  add column if not exists source_period_id uuid references public.payroll_periods(id);

alter table public.payroll_payments
  add column if not exists batch_reference text;

create table public.personnel_audit_events (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  actor_id uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.salary_advance_installments (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  advance_id uuid not null references public.salary_advances(id) on delete restrict,
  due_on date not null,
  amount numeric(14,2) not null check (amount > 0),
  repaid_amount numeric(14,2) not null default 0 check (repaid_amount >= 0 and repaid_amount <= amount),
  status text not null default 'planned' check (status in ('planned','partial','paid','suspended','cancelled')),
  payroll_entry_id uuid references public.payroll_entries(id),
  unique (advance_id, due_on)
);

create index personnel_audit_employee_idx on public.personnel_audit_events(institution_id, employee_id, created_at desc);
create index advance_installments_due_idx on public.salary_advance_installments(institution_id, due_on, status);

alter table public.personnel_settings enable row level security;
alter table public.personnel_audit_events enable row level security;
alter table public.salary_advance_installments enable row level security;

create policy personnel_settings_select on public.personnel_settings for select to authenticated
using (public.is_active_member(institution_id));
create policy personnel_settings_manage on public.personnel_settings for all to authenticated
using (public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]));
create policy personnel_audit_select on public.personnel_audit_events for select to authenticated
using (public.is_active_member(institution_id));
create policy personnel_audit_insert on public.personnel_audit_events for insert to authenticated
with check (public.has_institution_role(institution_id,array['owner','admin','secretary','finance']::public.app_role[]));
create policy advance_installments_select on public.salary_advance_installments for select to authenticated
using (public.is_active_member(institution_id));
create policy advance_installments_manage on public.salary_advance_installments for all to authenticated
using (public.has_institution_role(institution_id,array['owner','admin','finance']::public.app_role[]))
with check (public.has_institution_role(institution_id,array['owner','admin','finance']::public.app_role[]));

grant select,insert,update on public.personnel_settings, public.personnel_audit_events, public.salary_advance_installments to authenticated;

insert into public.personnel_settings(institution_id)
select id from public.institutions on conflict do nothing;

create or replace function public.assign_employee_number()
returns trigger language plpgsql set search_path='' as $$
declare s public.personnel_settings%rowtype; next_number integer; year_part text;
begin
  select * into s from public.personnel_settings where institution_id=new.institution_id;
  if not found then s.employee_number_prefix := 'PER'; s.employee_number_year := true; s.employee_number_digits := 4; end if;
  if new.employee_number is null or btrim(new.employee_number)='' then
    perform pg_advisory_xact_lock(hashtext(new.institution_id::text || ':employee-number'));
    select coalesce(max(nullif(substring(employee_number from '([0-9]+)$'),'')::integer),0)+1 into next_number
    from public.employees where institution_id=new.institution_id;
    year_part := case when s.employee_number_year then '-' || extract(year from current_date)::integer::text else '' end;
    new.employee_number := upper(s.employee_number_prefix) || year_part || '-' || lpad(next_number::text,s.employee_number_digits,'0');
  elsif tg_op='UPDATE' and new.employee_number is distinct from old.employee_number and not coalesce(s.employee_number_editable,false) then
    raise exception 'employee_number_not_editable';
  end if;
  return new;
end $$;

create or replace function public.exit_employee(target_employee_id uuid, exit_date date, exit_motive text)
returns void language plpgsql security definer set search_path='' as $$
declare e public.employees%rowtype;
begin
  select * into e from public.employees where id=target_employee_id for update;
  if not found then raise exception 'employee_not_found'; end if;
  if not public.has_institution_role(e.institution_id,array['owner','admin']::public.app_role[]) then raise exception 'forbidden'; end if;
  if exit_date < e.hired_on then raise exception 'invalid_exit_date'; end if;
  update public.employees set status='exited',exited_on=exit_date,exit_reason=exit_motive where id=e.id;
  update public.employee_functions set is_active=false,ends_on=coalesce(ends_on,exit_date) where employee_id=e.id and is_active;
  update public.employee_contracts set status='ended',ends_on=coalesce(ends_on,exit_date) where employee_id=e.id and status in ('draft','active');
  insert into public.personnel_audit_events(institution_id,employee_id,entity_type,entity_id,action,reason)
  values(e.institution_id,e.id,'employee',e.id,'exit',exit_motive);
end $$;

create or replace function public.transition_contract(target_contract_id uuid, target_status public.contract_status, motive text default null)
returns void language plpgsql security definer set search_path='' as $$
declare c public.employee_contracts%rowtype;
begin
  select * into c from public.employee_contracts where id=target_contract_id for update;
  if not found then raise exception 'contract_not_found'; end if;
  if not public.has_institution_role(c.institution_id,array['owner','admin']::public.app_role[]) then raise exception 'forbidden'; end if;
  if not ((c.status='draft' and target_status='active') or (c.status='active' and target_status in ('ended','terminated'))) then raise exception 'invalid_contract_transition'; end if;
  update public.employee_contracts set status=target_status,termination_reason=case when target_status='terminated' then motive else termination_reason end where id=c.id;
  insert into public.personnel_audit_events(institution_id,employee_id,entity_type,entity_id,action,reason,metadata)
  values(c.institution_id,c.employee_id,'contract',c.id,'status_changed',motive,jsonb_build_object('from',c.status,'to',target_status));
end $$;

create or replace function public.transition_salary_advance(target_advance_id uuid, target_status text, approved_amount numeric default null, comment text default null)
returns void language plpgsql security definer set search_path='' as $$
declare a public.salary_advances%rowtype;
begin
  select * into a from public.salary_advances where id=target_advance_id for update;
  if not found then raise exception 'advance_not_found'; end if;
  if not public.has_institution_role(a.institution_id,array['owner','admin','finance']::public.app_role[]) then raise exception 'forbidden'; end if;
  if not ((a.status='requested' and target_status in ('approved','rejected','cancelled')) or (a.status='approved' and target_status in ('paid','cancelled')) or (a.status='paid' and target_status='settled')) then raise exception 'invalid_advance_transition'; end if;
  if target_status='approved' and (approved_amount is null or approved_amount<=0 or approved_amount>a.amount_requested) then raise exception 'invalid_approved_amount'; end if;
  update public.salary_advances set status=target_status,amount_approved=case when target_status='approved' then approved_amount else amount_approved end,
    granted_on=case when target_status='paid' then current_date else granted_on end,paid_on=case when target_status='paid' then current_date else paid_on end,
    decision_comment=comment,decided_by=auth.uid(),decided_at=now() where id=a.id;
  insert into public.personnel_audit_events(institution_id,employee_id,entity_type,entity_id,action,reason,metadata)
  values(a.institution_id,a.employee_id,'salary_advance',a.id,'status_changed',comment,jsonb_build_object('from',a.status,'to',target_status));
end $$;

create or replace function public.guard_closed_payroll_mutation()
returns trigger language plpgsql set search_path='' as $$
declare period_status public.payroll_status; target_period_id uuid;
begin
  target_period_id := case when tg_op='DELETE' then old.period_id else new.period_id end;
  select p.status into period_status from public.payroll_periods p
  where p.id=target_period_id;
  if period_status='closed' then raise exception 'closed_payroll_is_immutable'; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
create trigger payroll_entries_immutable before update or delete on public.payroll_entries for each row execute function public.guard_closed_payroll_mutation();

create or replace view public.personnel_operational_alerts with (security_invoker=true) as
select e.institution_id,e.id employee_id,'contract_expiring'::text alert_type,c.ends_on due_on,
       e.first_name||' '||e.last_name title,'Contrat arrivant à échéance'::text detail
from public.employees e join public.employee_contracts c on c.employee_id=e.id and c.status='active'
join public.personnel_settings s on s.institution_id=e.institution_id
where c.ends_on between current_date and current_date+s.contract_alert_days
union all
select e.institution_id,e.id,'document_expiring',d.expires_on,e.first_name||' '||e.last_name,'Document arrivant à expiration'
from public.employees e join public.employee_documents d on d.employee_id=e.id
join public.personnel_settings s on s.institution_id=e.institution_id
where d.expires_on between current_date and current_date+s.document_alert_days
union all
select l.institution_id,l.employee_id,'leave_pending',l.starts_on,e.first_name||' '||e.last_name,'Congé en attente de décision'
from public.leave_requests l join public.employees e on e.id=l.employee_id where l.status='submitted';

grant select on public.personnel_operational_alerts to authenticated;
grant execute on function public.exit_employee(uuid,date,text), public.transition_contract(uuid,public.contract_status,text), public.transition_salary_advance(uuid,text,numeric,text) to authenticated;


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260722090000_complete_contract_compensation.sql
-- -----------------------------------------------------------------------------

-- Preserve legacy incomplete contracts while enforcing complete new writes.
alter table public.employee_contracts
  add constraint employee_contracts_complete_compensation_check
  check (
    (compensation_mode = 'unpaid' and fixed_amount = 0 and hourly_rate = 0 and session_rate = 0)
    or (compensation_mode in ('fixed', 'flat_rate') and fixed_amount > 0)
    or (compensation_mode = 'session' and session_rate > 0)
    or (compensation_mode = 'hourly' and hourly_rate > 0 and weekly_hours > 0)
    or (compensation_mode = 'mixed' and fixed_amount > 0 and hourly_rate > 0 and weekly_hours > 0)
  ) not valid;

comment on constraint employee_contracts_complete_compensation_check on public.employee_contracts is
  'Requires the complete remuneration basis for each compensation mode.';


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260722090500_personnel_payroll_entry_review.sql
-- -----------------------------------------------------------------------------

-- Per-person payroll review. Profiles and RLS remain unchanged in this lot.
create or replace function public.transition_payroll_entries(
  target_entry_ids uuid[],
  new_status public.payroll_status
) returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  changed integer;
begin
  if coalesce(array_length(target_entry_ids, 1), 0) = 0 then
    raise exception 'payroll_entries_required';
  end if;
  if new_status not in ('calculated', 'validated') then
    raise exception 'invalid_payroll_entry_status';
  end if;

  if exists (
    select 1
    from public.payroll_entries entry
    join public.payroll_periods period on period.id = entry.period_id
    where entry.id = any(target_entry_ids)
      and (
        period.status <> 'calculated'
        or entry.status not in ('calculated', 'validated')
        or entry.paid_amount > 0
      )
  ) then
    raise exception 'payroll_entry_not_reviewable';
  end if;

  update public.payroll_entries
  set status = new_status
  where id = any(target_entry_ids)
    and status in ('calculated', 'validated');
  get diagnostics changed = row_count;

  if changed <> array_length(target_entry_ids, 1) then
    raise exception 'payroll_entry_not_found_or_forbidden';
  end if;
  return changed;
end;
$$;

revoke all on function public.transition_payroll_entries(uuid[], public.payroll_status) from public;
grant execute on function public.transition_payroll_entries(uuid[], public.payroll_status) to authenticated;

create or replace function public.transition_payroll_period(
  target_period_id uuid,
  new_status public.payroll_status
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare p public.payroll_periods%rowtype;
begin
  select * into p from public.payroll_periods where id = target_period_id for update;
  if p.id is null then raise exception 'payroll_period_not_found'; end if;
  if not ((p.status = 'calculated' and new_status = 'validated') or (p.status in ('validated','paid') and new_status = 'closed')) then
    raise exception 'invalid_payroll_transition';
  end if;
  if new_status = 'validated' and exists (
    select 1 from public.payroll_entries where period_id = p.id and status <> 'validated'
  ) then
    raise exception 'payroll_entries_not_all_validated';
  end if;
  update public.payroll_periods
  set status = new_status,
      validated_by = case when new_status = 'validated' then auth.uid() else validated_by end,
      validated_at = case when new_status = 'validated' then now() else validated_at end,
      closed_by = case when new_status = 'closed' then auth.uid() else closed_by end,
      closed_at = case when new_status = 'closed' then now() else closed_at end
  where id = p.id;
  update public.payroll_entries set status = new_status where period_id = p.id;
end;
$$;


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260722091000_personnel_catalog_enrichment.sql
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260722100000_fix_personnel_workflow_actions.sql
-- -----------------------------------------------------------------------------

-- Final Personnel workflow actions and payroll calculation fix.
-- Security roles/RLS are intentionally unchanged pending the dedicated security design.

create or replace function public.transition_employee_status(
  target_employee_id uuid,
  target_status public.employee_status,
  effective_on date default current_date,
  motive text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare employee_row public.employees%rowtype;
begin
  select * into employee_row from public.employees where id = target_employee_id for update;
  if not found then raise exception 'employee_not_found'; end if;
  if not public.has_institution_role(employee_row.institution_id,array['owner','admin']::public.app_role[]) then raise exception 'forbidden'; end if;
  if employee_row.status = target_status then raise exception 'employee_status_unchanged'; end if;
  if not (
    (employee_row.status = 'active' and target_status in ('suspended','exited')) or
    (employee_row.status = 'suspended' and target_status in ('active','exited'))
  ) then raise exception 'invalid_employee_status_transition'; end if;
  if target_status = 'exited' and (motive is null or char_length(btrim(motive)) < 3) then raise exception 'exit_reason_required'; end if;
  if effective_on < employee_row.hired_on then raise exception 'invalid_effective_date'; end if;

  update public.employees
  set status = target_status,
      exited_on = case when target_status = 'exited' then effective_on else null end,
      exit_reason = case when target_status = 'exited' then btrim(motive) else null end
  where id = employee_row.id;

  if target_status = 'exited' then
    update public.employee_functions set is_active = false, ends_on = coalesce(ends_on,effective_on)
      where employee_id = employee_row.id and is_active;
    update public.employee_contracts set status = 'ended', ends_on = coalesce(ends_on,effective_on)
      where employee_id = employee_row.id and status in ('draft','active');
  end if;

  insert into public.personnel_audit_events(institution_id,employee_id,entity_type,entity_id,action,reason,metadata)
  values(employee_row.institution_id,employee_row.id,'employee',employee_row.id,'status_changed',motive,
    jsonb_build_object('from',employee_row.status,'to',target_status,'effective_on',effective_on));
end $$;

create or replace function public.transition_employee_sanction(
  target_sanction_id uuid,
  target_status text,
  decision_text text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare sanction_row public.employee_sanctions%rowtype;
begin
  select * into sanction_row from public.employee_sanctions where id = target_sanction_id for update;
  if not found then raise exception 'sanction_not_found'; end if;
  if not public.has_institution_role(sanction_row.institution_id,array['owner','admin']::public.app_role[]) then raise exception 'forbidden'; end if;
  if not (
    (sanction_row.status = 'draft' and target_status in ('notified','cancelled')) or
    (sanction_row.status = 'notified' and target_status in ('contested','closed','cancelled')) or
    (sanction_row.status = 'contested' and target_status in ('closed','cancelled'))
  ) then raise exception 'invalid_sanction_transition'; end if;
  if target_status in ('notified','closed','cancelled') and (decision_text is null or char_length(btrim(decision_text)) < 3) then
    raise exception 'sanction_decision_required';
  end if;

  update public.employee_sanctions
  set status = target_status,
      decision = coalesce(nullif(btrim(decision_text),''),decision),
      decided_on = case when target_status in ('closed','cancelled') then current_date else decided_on end
  where id = sanction_row.id;

  insert into public.personnel_audit_events(institution_id,employee_id,entity_type,entity_id,action,reason,metadata)
  values(sanction_row.institution_id,sanction_row.employee_id,'employee_sanction',sanction_row.id,'status_changed',decision_text,
    jsonb_build_object('from',sanction_row.status,'to',target_status));
end $$;

create or replace function public.calculate_payroll_period(target_period_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  period_row public.payroll_periods%rowtype;
  contract_row public.employee_contracts%rowtype;
  new_entry uuid;
  count_entries integer := 0;
  variable_total numeric(14,2);
begin
  select * into period_row from public.payroll_periods where id = target_period_id for update;
  if not found then raise exception 'payroll_period_not_found'; end if;
  if not public.has_institution_role(period_row.institution_id,array['owner','admin','finance']::public.app_role[]) then raise exception 'forbidden'; end if;
  if period_row.status not in ('draft','calculated') then raise exception 'payroll_period_not_editable'; end if;

  update public.work_entries set payroll_entry_id = null
    where payroll_entry_id in (select id from public.payroll_entries where period_id = period_row.id);
  delete from public.payroll_entries where period_id = period_row.id;

  for contract_row in
    select contract.*
    from public.employee_contracts contract
    join public.employees employee on employee.id = contract.employee_id
    where contract.institution_id = period_row.institution_id
      and contract.status = 'active' and employee.status = 'active'
      and contract.starts_on <= period_row.ends_on
      and (contract.ends_on is null or contract.ends_on >= period_row.starts_on)
  loop
    select coalesce(sum(
      case when contract_row.compensation_mode = 'session'
        then work.quantity * coalesce(work.rate,contract_row.session_rate)
        else (work.minutes::numeric / 60) * coalesce(work.rate,contract_row.hourly_rate,0)
      end),0)
    into variable_total
    from public.work_entries work
    where work.contract_id = contract_row.id and work.status = 'validated'
      and work.work_date between period_row.starts_on and period_row.ends_on
      and work.payroll_entry_id is null;

    insert into public.payroll_entries(institution_id,period_id,employee_id,contract_id,fixed_amount,variable_amount,status)
    values(period_row.institution_id,period_row.id,contract_row.employee_id,contract_row.id,
      case when contract_row.compensation_mode in ('fixed','mixed','flat_rate') then contract_row.fixed_amount else 0 end,
      variable_total,'calculated') returning id into new_entry;
    update public.work_entries set payroll_entry_id = new_entry
      where contract_id = contract_row.id and status = 'validated'
        and work_date between period_row.starts_on and period_row.ends_on and payroll_entry_id is null;
    count_entries := count_entries + 1;
  end loop;
  update public.payroll_periods set status = 'calculated' where id = period_row.id;
  return count_entries;
end $$;

revoke all on function public.transition_employee_status(uuid,public.employee_status,date,text), public.transition_employee_sanction(uuid,text,text), public.calculate_payroll_period(uuid) from public;
grant execute on function public.transition_employee_status(uuid,public.employee_status,date,text), public.transition_employee_sanction(uuid,text,text), public.calculate_payroll_period(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- Source consolidée : 20260722110000_link_personnel_teachers_to_people.sql
-- -----------------------------------------------------------------------------

alter table public.employees
  add column if not exists person_id uuid references public.people(id) on delete restrict;

create unique index if not exists employees_person_id_unique_idx
  on public.employees(person_id) where person_id is not null;

create or replace function public.sync_employee_person()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_person_id uuid;
begin
  resolved_person_id := new.person_id;
  if resolved_person_id is null and nullif(lower(trim(new.email)), '') is not null then
    select id into resolved_person_id
    from public.people
    where institution_id = new.institution_id
      and lower(email) = lower(trim(new.email))
    order by created_at
    limit 1;
  end if;

  if resolved_person_id is null then
    insert into public.people(
      institution_id, first_name, last_name, email, phone, status
    ) values (
      new.institution_id, new.first_name, new.last_name,
      nullif(lower(trim(new.email)), ''), new.phone,
      case when new.status = 'active' then 'active' else 'inactive' end
    ) returning id into resolved_person_id;
  else
    update public.people
    set first_name = new.first_name,
        last_name = new.last_name,
        email = nullif(lower(trim(new.email)), ''),
        phone = new.phone,
        status = case when new.status = 'active' then 'active' else 'inactive' end,
        updated_at = now()
    where id = resolved_person_id and institution_id = new.institution_id;
    if not found then raise exception 'employee_person_context_mismatch'; end if;
  end if;

  new.person_id := resolved_person_id;
  return new;
end;
$$;

drop trigger if exists employees_sync_person_before_write on public.employees;
create trigger employees_sync_person_before_write
before insert or update of first_name,last_name,email,phone,status,person_id
on public.employees
for each row execute function public.sync_employee_person();

create or replace function public.sync_employee_teacher_role(target_employee_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  employee_row public.employees%rowtype;
  is_teacher boolean;
begin
  select * into employee_row from public.employees where id = target_employee_id;
  if employee_row.id is null or employee_row.person_id is null then return; end if;

  select exists(
    select 1
    from public.employee_functions function_assignment
    join public.personnel_catalog_items catalog
      on catalog.id = function_assignment.function_item_id
    where function_assignment.employee_id = employee_row.id
      and function_assignment.is_active
      and (function_assignment.ends_on is null or function_assignment.ends_on >= current_date)
      and upper(catalog.code) = 'TEACHER'
  ) and employee_row.status = 'active' into is_teacher;

  if is_teacher then
    insert into public.person_roles(institution_id,person_id,role)
    values(employee_row.institution_id,employee_row.person_id,'teacher')
    on conflict(person_id,role) do nothing;
  else
    delete from public.person_roles
    where institution_id = employee_row.institution_id
      and person_id = employee_row.person_id
      and role = 'teacher';
  end if;
end;
$$;

create or replace function public.sync_employee_teacher_role_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_employee_teacher_role(
    case when tg_op = 'DELETE' then old.employee_id else new.employee_id end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists employee_functions_sync_teacher_role on public.employee_functions;
create trigger employee_functions_sync_teacher_role
after insert or update or delete on public.employee_functions
for each row execute function public.sync_employee_teacher_role_trigger();

create or replace function public.sync_employee_status_teacher_role_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_employee_teacher_role(new.id);
  return new;
end;
$$;

drop trigger if exists employees_sync_teacher_role_after_status on public.employees;
create trigger employees_sync_teacher_role_after_status
after insert or update of status on public.employees
for each row execute function public.sync_employee_status_teacher_role_trigger();

-- Backfill existing personnel records and their teacher eligibility.
update public.employees
set first_name = first_name;

do $$
declare employee_id uuid;
begin
  for employee_id in select id from public.employees loop
    perform public.sync_employee_teacher_role(employee_id);
  end loop;
end;
$$;

comment on column public.employees.person_id is
  'Identité applicative stable utilisée par les affectations pédagogiques, même sans compte utilisateur.';

create or replace function public.install_personnel_catalog(target_institution_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare inserted_count integer;
begin
  if not public.has_institution_role(target_institution_id,array['owner','admin']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  insert into public.personnel_catalog_items(
    institution_id,catalog_id,category,code,default_label,is_system,is_active,display_order
  )
  select target_institution_id,id,category,code,default_label,true,true,display_order
  from public.personnel_catalog where is_active
  on conflict(institution_id,category,code) do nothing;
  get diagnostics inserted_count=row_count;
  return inserted_count;
end; $$;

revoke all on function public.install_personnel_catalog(uuid) from public;
grant execute on function public.install_personnel_catalog(uuid) to authenticated;
