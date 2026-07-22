-- GeEcole V1 — Socle, établissements et paramétrage scolaire
-- Baseline consolidée le 2026-07-22.
-- Les marqueurs "Source consolidée" conservent la traçabilité Git.

-- -----------------------------------------------------------------------------
-- Source consolidée : 202607160001_foundation.sql
-- -----------------------------------------------------------------------------

create extension if not exists pgcrypto with schema extensions;

-- Conservé comme vocabulaire de compatibilité pour les anciennes règles métier.
-- L'autorisation effective ne repose plus sur une colonne de rôle unique.
create type public.app_role as enum ('owner', 'admin', 'secretary', 'teacher', 'finance', 'parent', 'student');
create type public.membership_status as enum ('active', 'suspended');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.institutions (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  phone text,
  email text,
  address text,
  currency text not null default 'GNF' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Africa/Conakry',
  locale text not null default 'fr-GN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_owner boolean not null default false,
  status public.membership_status not null default 'active',
  valid_from date not null default current_date,
  valid_until date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_until >= valid_from),
  unique (institution_id, user_id)
);

create index memberships_user_id_idx on public.memberships(user_id);
create index memberships_institution_status_idx on public.memberships(institution_id, status);

create table public.module_catalog (
  code text primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  description text not null default '',
  is_mandatory boolean not null default false,
  is_active boolean not null default true,
  sort_order smallint not null default 0
);

insert into public.module_catalog(code,name,is_mandatory,sort_order) values
  ('settings','Paramétrage',true,10),
  ('schooling','Scolarité',false,20),
  ('notes','Notes et évaluations',false,30),
  ('bulletins','Bulletins et classements',false,40),
  ('finance','Frais scolaires',false,50),
  ('personnel','Personnel',false,60),
  ('documents','Documents',false,70),
  ('attendance','Assiduité',false,80),
  ('agenda','Agenda',false,90),
  ('audit','Audit',true,100);

create table public.institution_modules (
  institution_id uuid not null references public.institutions(id) on delete cascade,
  module_code text not null references public.module_catalog(code) on delete restrict,
  is_enabled boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(institution_id,module_code)
);

create table public.permissions (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
  module text not null references public.module_catalog(code) on delete restrict,
  resource text not null,
  action text not null,
  label text not null,
  description text not null default '',
  sensitivity text not null default 'standard' check (sensitivity in ('standard', 'sensitive', 'system')),
  is_assignable boolean not null default true,
  is_active boolean not null default true,
  requires_delegation boolean not null default false,
  created_at timestamptz not null default now(),
  unique (module, resource, action)
);

create table public.access_profile_templates (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  description text not null default '',
  audience text not null default 'internal' check (audience in ('internal', 'personal')),
  version integer not null default 1 check (version > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.access_profile_template_permissions (
  template_id uuid not null references public.access_profile_templates(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete restrict,
  primary key (template_id, permission_id)
);

create table public.access_profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  source_template_id uuid references public.access_profile_templates(id) on delete restrict,
  source_template_version integer,
  code text not null check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  description text not null default '',
  is_standard boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, code),
  check ((is_standard and source_template_id is not null and source_template_version is not null) or not is_standard)
);

create table public.access_profile_permissions (
  access_profile_id uuid not null references public.access_profiles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (access_profile_id, permission_id)
);

create table public.access_profile_permission_delegations (
  access_profile_id uuid not null references public.access_profiles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(access_profile_id,permission_id)
);

create table public.membership_access_profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  access_profile_id uuid not null references public.access_profiles(id) on delete cascade,
  is_active boolean not null default true,
  valid_from date not null default current_date,
  valid_until date,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_until >= valid_from),
  unique (membership_id, access_profile_id)
);

-- Les clés étrangères vers les objets scolaires sont ajoutées après leur création.
create table public.access_scope_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  membership_profile_id uuid not null references public.membership_access_profiles(id) on delete cascade,
  academic_year_id uuid,
  cycle_id uuid,
  level_id uuid,
  class_id uuid,
  valid_from date not null default current_date,
  valid_until date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(cycle_id, level_id, class_id) <= 1),
  check (valid_until is null or valid_until >= valid_from)
);

create table public.access_audit_events (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  old_value jsonb,
  new_value jsonb,
  reason text,
  correlation_id uuid not null default extensions.gen_random_uuid(),
  occurred_at timestamptz not null default now()
);

create index permissions_code_idx on public.permissions(code);
create index institution_modules_enabled_idx on public.institution_modules(institution_id,is_enabled,module_code);
create index access_profiles_institution_active_idx on public.access_profiles(institution_id, is_active);
create index access_profile_permissions_profile_idx on public.access_profile_permissions(access_profile_id, permission_id);
create index access_profile_delegations_profile_idx on public.access_profile_permission_delegations(access_profile_id,permission_id);
create index membership_access_profiles_active_idx on public.membership_access_profiles(membership_id, is_active, valid_from, valid_until);
create index access_scope_assignments_profile_idx on public.access_scope_assignments(membership_profile_id, academic_year_id, valid_from, valid_until);
create index access_audit_events_institution_date_idx on public.access_audit_events(institution_id, occurred_at desc);

insert into public.permissions (code, module, resource, action, label, sensitivity, requires_delegation) values
  ('settings.institution.read', 'settings', 'institution', 'read', 'Consulter l’établissement', 'standard', false),
  ('settings.institution.manage', 'settings', 'institution', 'manage', 'Gérer l’établissement', 'sensitive', true),
  ('settings.access.read', 'settings', 'access', 'read', 'Consulter les accès', 'sensitive', false),
  ('settings.access.manage', 'settings', 'access', 'manage', 'Gérer les accès', 'sensitive', true),
  ('settings.modules.manage', 'settings', 'modules', 'manage', 'Activer les modules', 'sensitive', true),
  ('settings.catalog.read', 'settings', 'catalog', 'read', 'Consulter les catalogues', 'standard', false),
  ('settings.catalog.manage', 'settings', 'catalog', 'manage', 'Gérer les catalogues locaux', 'standard', false),
  ('settings.academic.read', 'settings', 'academic', 'read', 'Consulter le paramétrage scolaire', 'standard', false),
  ('settings.academic.manage', 'settings', 'academic', 'manage', 'Gérer le paramétrage scolaire', 'sensitive', false),
  ('audit.events.read', 'audit', 'events', 'read', 'Consulter le journal d’audit', 'sensitive', true),
  ('schooling.students.read', 'schooling', 'students', 'read', 'Consulter les élèves', 'standard', false),
  ('schooling.students.create', 'schooling', 'students', 'create', 'Créer un élève', 'standard', false),
  ('schooling.students.update', 'schooling', 'students', 'update', 'Modifier un élève', 'standard', false),
  ('schooling.enrollments.read', 'schooling', 'enrollments', 'read', 'Consulter les inscriptions', 'standard', false),
  ('schooling.enrollments.create', 'schooling', 'enrollments', 'create', 'Préparer une inscription', 'standard', false),
  ('schooling.enrollments.validate', 'schooling', 'enrollments', 'validate', 'Valider une inscription', 'sensitive', false),
  ('schooling.guardians.read', 'schooling', 'guardians', 'read', 'Consulter les responsables', 'standard', false),
  ('schooling.guardians.manage', 'schooling', 'guardians', 'manage', 'Gérer les responsables', 'standard', false),
  ('schooling.documents.read', 'schooling', 'documents', 'read', 'Consulter les pièces scolaires', 'standard', false),
  ('schooling.documents.manage', 'schooling', 'documents', 'manage', 'Gérer les pièces scolaires', 'standard', false),
  ('schooling.classes.read', 'schooling', 'classes', 'read', 'Consulter les classes', 'standard', false),
  ('schooling.classes.manage', 'schooling', 'classes', 'manage', 'Gérer les classes', 'sensitive', false),
  ('notes.assessments.read', 'notes', 'assessments', 'read', 'Consulter les évaluations', 'standard', false),
  ('notes.assessments.create', 'notes', 'assessments', 'create', 'Créer une évaluation', 'standard', false),
  ('notes.assessments.update', 'notes', 'assessments', 'update', 'Modifier une évaluation', 'standard', false),
  ('notes.results.read', 'notes', 'results', 'read', 'Consulter les résultats', 'standard', false),
  ('notes.results.enter', 'notes', 'results', 'enter', 'Saisir les résultats', 'standard', false),
  ('notes.results.correct', 'notes', 'results', 'correct', 'Corriger les résultats', 'sensitive', false),
  ('notes.results.correct_after_lock', 'notes', 'results', 'correct_after_lock', 'Corriger après verrouillage', 'sensitive', true),
  ('notes.class_overview.read', 'notes', 'class_overview', 'read', 'Consulter la synthèse de classe', 'standard', false),
  ('notes.class_results.read', 'notes', 'class_results', 'read', 'Consulter le détail des autres cours', 'sensitive', false),
  ('bulletins.reports.read', 'bulletins', 'reports', 'read', 'Consulter les bulletins', 'standard', false),
  ('bulletins.reports.generate', 'bulletins', 'reports', 'generate', 'Générer les bulletins', 'standard', false),
  ('bulletins.reports.validate', 'bulletins', 'reports', 'validate', 'Valider les bulletins', 'sensitive', false),
  ('bulletins.reports.publish', 'bulletins', 'reports', 'publish', 'Publier les bulletins', 'sensitive', true),
  ('finance.payments.read', 'finance', 'payments', 'read', 'Consulter les encaissements', 'standard', false),
  ('finance.payments.collect', 'finance', 'payments', 'collect', 'Encaisser un paiement', 'sensitive', false),
  ('finance.payments.cancel', 'finance', 'payments', 'cancel', 'Annuler un paiement', 'sensitive', true),
  ('finance.pricing.read', 'finance', 'pricing', 'read', 'Consulter les tarifs', 'standard', false),
  ('finance.pricing.manage', 'finance', 'pricing', 'manage', 'Gérer les tarifs', 'sensitive', false),
  ('finance.accounts.read', 'finance', 'accounts', 'read', 'Consulter les comptes élèves', 'standard', false),
  ('finance.accounts.manage', 'finance', 'accounts', 'manage', 'Gérer les comptes élèves', 'sensitive', false),
  ('finance.benefits.read', 'finance', 'benefits', 'read', 'Consulter les avantages', 'standard', false),
  ('finance.benefits.manage', 'finance', 'benefits', 'manage', 'Gérer les avantages', 'sensitive', false),
  ('personnel.employees.read', 'personnel', 'employees', 'read', 'Consulter le personnel', 'standard', false),
  ('personnel.employees.read_self', 'personnel', 'employees', 'read_self', 'Consulter son dossier', 'standard', false),
  ('personnel.employees.manage', 'personnel', 'employees', 'manage', 'Gérer le personnel', 'sensitive', false),
  ('personnel.contracts.read', 'personnel', 'contracts', 'read', 'Consulter les contrats', 'standard', false),
  ('personnel.contracts.manage', 'personnel', 'contracts', 'manage', 'Gérer les contrats', 'sensitive', false),
  ('personnel.leaves.read', 'personnel', 'leaves', 'read', 'Consulter les congés', 'standard', false),
  ('personnel.leaves.manage', 'personnel', 'leaves', 'manage', 'Gérer les congés', 'standard', false),
  ('personnel.leaves.validate', 'personnel', 'leaves', 'validate', 'Valider les congés', 'sensitive', false),
  ('personnel.payroll.read', 'personnel', 'payroll', 'read', 'Consulter la paie', 'sensitive', false),
  ('personnel.payroll.prepare', 'personnel', 'payroll', 'prepare', 'Préparer la paie', 'sensitive', false),
  ('personnel.payroll.validate', 'personnel', 'payroll', 'validate', 'Valider la paie', 'sensitive', true),
  ('personnel.sanctions.read', 'personnel', 'sanctions', 'read', 'Consulter les sanctions', 'sensitive', false),
  ('personnel.sanctions.manage', 'personnel', 'sanctions', 'manage', 'Gérer les sanctions', 'sensitive', true),
  ('documents.files.read', 'documents', 'files', 'read', 'Consulter les fichiers', 'standard', false),
  ('documents.files.upload', 'documents', 'files', 'upload', 'Déposer des fichiers', 'standard', false),
  ('documents.files.delete', 'documents', 'files', 'delete', 'Supprimer des fichiers', 'sensitive', false),
  ('attendance.records.read', 'attendance', 'records', 'read', 'Consulter l’assiduité', 'standard', false),
  ('attendance.records.enter', 'attendance', 'records', 'enter', 'Saisir l’assiduité', 'standard', false),
  ('attendance.records.correct', 'attendance', 'records', 'correct', 'Corriger l’assiduité', 'sensitive', false),
  ('agenda.events.read', 'agenda', 'events', 'read', 'Consulter l’agenda', 'standard', false),
  ('agenda.events.manage', 'agenda', 'events', 'manage', 'Gérer l’agenda', 'standard', false);

insert into public.access_profile_templates (code, name, description, audience) values
  ('administration', 'Administration', 'Paramétrage fonctionnel et gestion déléguée des accès.', 'internal'),
  ('direction', 'Direction', 'Supervision globale et validations sensibles.', 'internal'),
  ('pedagogical_manager', 'Responsable pédagogique', 'Pilotage des cours, notes et bulletins.', 'internal'),
  ('teacher', 'Enseignant', 'Gestion des cours et résultats affectés.', 'internal'),
  ('homeroom_teacher', 'Enseignant principal', 'Synthèse et suivi de la classe principale.', 'internal'),
  ('secretariat', 'Secrétariat', 'Élèves, responsables, inscriptions et documents.', 'internal'),
  ('cashier', 'Encaissement', 'Encaissements et reçus sans gestion tarifaire.', 'internal'),
  ('financial_manager', 'Gestion financière', 'Tarifs, comptes, avantages et contrôle financier.', 'internal'),
  ('personnel_manager', 'Gestion du personnel', 'Employés, contrats, congés et paie.', 'internal'),
  ('parent', 'Parent / Responsable', 'Consultation des élèves liés.', 'personal'),
  ('student', 'Élève', 'Consultation de son propre dossier.', 'personal');

with template_permissions(template_code, permission_code) as (
  values
    ('administration', 'settings.institution.read'), ('administration', 'settings.institution.manage'),
    ('administration', 'settings.access.read'), ('administration', 'settings.access.manage'),
    ('administration', 'settings.modules.manage'),
    ('administration', 'settings.catalog.read'), ('administration', 'settings.catalog.manage'),
    ('administration', 'settings.academic.read'), ('administration', 'settings.academic.manage'),
    ('direction', 'settings.institution.read'), ('direction', 'settings.academic.read'),
    ('direction', 'schooling.students.read'), ('direction', 'schooling.enrollments.read'),
    ('direction', 'schooling.classes.read'), ('direction', 'notes.assessments.read'),
    ('direction', 'notes.results.read'), ('direction', 'notes.class_overview.read'),
    ('direction', 'notes.class_results.read'), ('direction', 'bulletins.reports.read'),
    ('direction', 'bulletins.reports.validate'), ('direction', 'bulletins.reports.publish'),
    ('direction', 'finance.accounts.read'), ('direction', 'finance.payments.read'),
    ('direction', 'personnel.employees.read'), ('direction', 'audit.events.read'),
    ('pedagogical_manager', 'settings.academic.read'), ('pedagogical_manager', 'schooling.students.read'),
    ('pedagogical_manager', 'schooling.classes.read'), ('pedagogical_manager', 'schooling.classes.manage'),
    ('pedagogical_manager', 'notes.assessments.read'), ('pedagogical_manager', 'notes.results.read'),
    ('pedagogical_manager', 'notes.results.correct'), ('pedagogical_manager', 'notes.class_overview.read'),
    ('pedagogical_manager', 'notes.class_results.read'), ('pedagogical_manager', 'bulletins.reports.read'),
    ('pedagogical_manager', 'bulletins.reports.generate'), ('pedagogical_manager', 'bulletins.reports.validate'),
    ('teacher', 'schooling.students.read'), ('teacher', 'schooling.classes.read'),
    ('teacher', 'notes.assessments.read'), ('teacher', 'notes.assessments.create'),
    ('teacher', 'notes.assessments.update'), ('teacher', 'notes.results.read'),
    ('teacher', 'notes.results.enter'), ('teacher', 'attendance.records.read'),
    ('teacher', 'attendance.records.enter'), ('teacher', 'agenda.events.read'),
    ('homeroom_teacher', 'notes.class_overview.read'), ('homeroom_teacher', 'notes.class_results.read'),
    ('homeroom_teacher', 'bulletins.reports.read'), ('homeroom_teacher', 'bulletins.reports.generate'),
    ('secretariat', 'schooling.students.read'), ('secretariat', 'schooling.students.create'),
    ('secretariat', 'schooling.students.update'), ('secretariat', 'schooling.enrollments.read'),
    ('secretariat', 'schooling.enrollments.create'), ('secretariat', 'schooling.guardians.read'),
    ('secretariat', 'schooling.guardians.manage'), ('secretariat', 'schooling.documents.read'),
    ('secretariat', 'schooling.documents.manage'), ('secretariat', 'documents.files.read'),
    ('secretariat', 'documents.files.upload'), ('secretariat', 'agenda.events.read'),
    ('cashier', 'schooling.students.read'), ('cashier', 'finance.payments.read'),
    ('cashier', 'finance.payments.collect'), ('cashier', 'finance.accounts.read'),
    ('financial_manager', 'finance.payments.read'), ('financial_manager', 'finance.payments.collect'),
    ('financial_manager', 'finance.payments.cancel'), ('financial_manager', 'finance.pricing.read'),
    ('financial_manager', 'finance.pricing.manage'), ('financial_manager', 'finance.accounts.read'),
    ('financial_manager', 'finance.accounts.manage'), ('financial_manager', 'finance.benefits.read'),
    ('financial_manager', 'finance.benefits.manage'),
    ('personnel_manager', 'personnel.employees.read'), ('personnel_manager', 'personnel.employees.manage'),
    ('personnel_manager', 'personnel.contracts.read'), ('personnel_manager', 'personnel.contracts.manage'),
    ('personnel_manager', 'personnel.leaves.read'), ('personnel_manager', 'personnel.leaves.manage'),
    ('personnel_manager', 'personnel.leaves.validate'), ('personnel_manager', 'personnel.payroll.read'),
    ('personnel_manager', 'personnel.payroll.prepare'), ('personnel_manager', 'personnel.sanctions.read'),
    ('personnel_manager', 'personnel.sanctions.manage'),
    ('parent', 'schooling.students.read'), ('parent', 'schooling.documents.read'),
    ('parent', 'notes.results.read'), ('parent', 'bulletins.reports.read'),
    ('parent', 'finance.accounts.read'), ('parent', 'attendance.records.read'), ('parent', 'agenda.events.read'),
    ('student', 'schooling.students.read'), ('student', 'schooling.documents.read'),
    ('student', 'notes.results.read'), ('student', 'bulletins.reports.read'),
    ('student', 'finance.accounts.read'), ('student', 'attendance.records.read'), ('student', 'agenda.events.read')
)
insert into public.access_profile_template_permissions(template_id, permission_id)
select template.id, permission.id
from template_permissions mapping
join public.access_profile_templates template on template.code = mapping.template_code
join public.permissions permission on permission.code = mapping.permission_code;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger institutions_set_updated_at before update on public.institutions for each row execute function public.set_updated_at();
create trigger memberships_set_updated_at before update on public.memberships for each row execute function public.set_updated_at();
create trigger access_profiles_set_updated_at before update on public.access_profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_active_member(target_institution_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where institution_id = target_institution_id
      and user_id = (select auth.uid())
      and status = 'active'
      and valid_from <= current_date
      and (valid_until is null or valid_until >= current_date)
  );
$$;

create or replace function public.is_institution_owner(target_institution_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where institution_id = target_institution_id
      and user_id = (select auth.uid())
      and status = 'active'
      and is_owner
      and valid_from <= current_date
      and (valid_until is null or valid_until >= current_date)
  );
$$;

create or replace function public.has_permission(target_institution_id uuid, permission_code text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.permissions requested_permission
    join public.module_catalog module on module.code=requested_permission.module and module.is_active
    join public.institution_modules institution_module
      on institution_module.institution_id=target_institution_id
      and institution_module.module_code=module.code
      and institution_module.is_enabled
    where requested_permission.code=permission_code
      and requested_permission.is_active
      and (
        public.is_institution_owner(target_institution_id)
        or exists (
      select 1
      from public.memberships membership
      join public.membership_access_profiles assignment on assignment.membership_id = membership.id
      join public.access_profiles profile on profile.id = assignment.access_profile_id
      join public.access_profile_permissions profile_permission on profile_permission.access_profile_id = profile.id
      join public.permissions permission on permission.id = profile_permission.permission_id
      where membership.institution_id = target_institution_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and membership.valid_from <= current_date
        and (membership.valid_until is null or membership.valid_until >= current_date)
        and profile.institution_id = membership.institution_id
        and profile.is_active
        and assignment.is_active
        and assignment.valid_from <= current_date
        and (assignment.valid_until is null or assignment.valid_until >= current_date)
            and permission.code = permission_code
        )
      )
  );
$$;

create or replace function public.install_standard_access_profiles(target_institution_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare installed_count integer;
begin
  insert into public.institution_modules(institution_id,module_code,is_enabled,updated_by)
  select target_institution_id,module.code,true,(select auth.uid())
  from public.module_catalog module where module.is_active
  on conflict(institution_id,module_code) do nothing;

  insert into public.access_profiles (
    institution_id, source_template_id, source_template_version, code, name,
    description, is_standard, created_by
  )
  select target_institution_id, template.id, template.version, template.code,
    template.name, template.description, true, (select auth.uid())
  from public.access_profile_templates template
  where template.is_active
  on conflict (institution_id, code) do nothing;
  get diagnostics installed_count = row_count;

  insert into public.access_profile_permissions(access_profile_id, permission_id, created_by)
  select profile.id, template_permission.permission_id, (select auth.uid())
  from public.access_profiles profile
  join public.access_profile_template_permissions template_permission
    on template_permission.template_id = profile.source_template_id
  where profile.institution_id = target_institution_id and profile.is_standard
  on conflict do nothing;

  insert into public.access_profile_permission_delegations(access_profile_id,permission_id)
  select profile.id,permission.id
  from public.access_profiles profile
  cross join public.permissions permission
  where profile.institution_id=target_institution_id
    and profile.code='administration'
    and profile.is_standard
    and permission.is_active
    and permission.is_assignable
    and not permission.requires_delegation
  on conflict do nothing;

  return installed_count;
end;
$$;

-- Compatibilité transitoire pour les politiques historiques de la baseline.
-- Les nouveaux contrôles utilisent public.has_permission avec une action métier.
create or replace function public.has_institution_role(target_institution_id uuid, allowed_roles public.app_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select
    ('owner'::public.app_role = any(allowed_roles) and public.is_institution_owner(target_institution_id))
    or exists (
      select 1
      from public.memberships membership
      join public.membership_access_profiles assignment on assignment.membership_id = membership.id
      join public.access_profiles profile on profile.id = assignment.access_profile_id
      where membership.institution_id = target_institution_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and membership.valid_from <= current_date
        and (membership.valid_until is null or membership.valid_until >= current_date)
        and profile.institution_id = target_institution_id
        and profile.is_active and assignment.is_active
        and assignment.valid_from <= current_date
        and (assignment.valid_until is null or assignment.valid_until >= current_date)
        and case profile.code
          when 'administration' then 'admin'::public.app_role
          when 'secretariat' then 'secretary'::public.app_role
          when 'teacher' then 'teacher'::public.app_role
          when 'homeroom_teacher' then 'teacher'::public.app_role
          when 'cashier' then 'finance'::public.app_role
          when 'financial_manager' then 'finance'::public.app_role
          when 'parent' then 'parent'::public.app_role
          when 'student' then 'student'::public.app_role
          else null
        end = any(allowed_roles)
    );
$$;

create or replace function public.create_institution(institution_name text, institution_slug text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  insert into public.institutions (name, slug)
  values (trim(institution_name), lower(trim(institution_slug))) returning id into new_id;
  insert into public.memberships (institution_id, user_id, is_owner, created_by)
  values (new_id, (select auth.uid()), true, (select auth.uid()));
  perform public.install_standard_access_profiles(new_id);
  return new_id;
end;
$$;

revoke all on function public.create_institution(text, text) from public;
grant execute on function public.create_institution(text, text) to authenticated;
revoke all on function public.is_active_member(uuid) from public;
grant execute on function public.is_active_member(uuid) to authenticated;
revoke all on function public.is_institution_owner(uuid) from public;
grant execute on function public.is_institution_owner(uuid) to authenticated;
revoke all on function public.has_permission(uuid, text) from public;
grant execute on function public.has_permission(uuid, text) to authenticated;
revoke all on function public.install_standard_access_profiles(uuid) from public;
revoke all on function public.has_institution_role(uuid, public.app_role[]) from public;
grant execute on function public.has_institution_role(uuid, public.app_role[]) to authenticated;

create or replace function public.write_access_audit(
  target_institution_id uuid,
  event_action text,
  event_target_type text,
  event_target_id uuid,
  previous_value jsonb,
  next_value jsonb,
  event_reason text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare event_id uuid;
begin
  insert into public.access_audit_events(
    institution_id, actor_user_id, action, target_type, target_id,
    old_value, new_value, reason
  ) values (
    target_institution_id, (select auth.uid()), event_action, event_target_type,
    event_target_id, previous_value, next_value, nullif(trim(event_reason), '')
  ) returning id into event_id;
  return event_id;
end;
$$;

create or replace function public.protect_last_institution_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
declare remaining_owners integer; owner_access_removed boolean := false;
begin
  if old.is_owner then
    if tg_op = 'DELETE' then
      owner_access_removed := true;
    else
      owner_access_removed := not new.is_owner
        or new.status <> 'active'
        or new.valid_from > current_date
        or (new.valid_until is not null and new.valid_until < current_date);
    end if;
  end if;
  if owner_access_removed then
    select count(*) into remaining_owners
    from public.memberships membership
    where membership.institution_id = old.institution_id
      and membership.id <> old.id
      and membership.is_owner
      and membership.status = 'active'
      and membership.valid_from <= current_date
      and (membership.valid_until is null or membership.valid_until >= current_date);
    if remaining_owners = 0 then
      raise exception 'last_owner_protected';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger memberships_protect_last_owner
before update or delete on public.memberships
for each row execute function public.protect_last_institution_owner();

create or replace function public.prevent_access_audit_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'access_audit_is_immutable';
end;
$$;

create trigger access_audit_events_immutable
before update or delete on public.access_audit_events
for each row execute function public.prevent_access_audit_mutation();

create or replace function public.prevent_standard_profile_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.is_standard then
    raise exception 'standard_access_profile_is_immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger access_profiles_standard_immutable
before update or delete on public.access_profiles
for each row execute function public.prevent_standard_profile_mutation();

revoke all on function public.write_access_audit(uuid, text, text, uuid, jsonb, jsonb, text) from public;
revoke all on function public.protect_last_institution_owner() from public;
revoke all on function public.prevent_access_audit_mutation() from public;
revoke all on function public.prevent_standard_profile_mutation() from public;

alter table public.profiles enable row level security;
alter table public.institutions enable row level security;
alter table public.memberships enable row level security;
alter table public.module_catalog enable row level security;
alter table public.institution_modules enable row level security;
alter table public.permissions enable row level security;
alter table public.access_profile_templates enable row level security;
alter table public.access_profile_template_permissions enable row level security;
alter table public.access_profiles enable row level security;
alter table public.access_profile_permissions enable row level security;
alter table public.access_profile_permission_delegations enable row level security;
alter table public.membership_access_profiles enable row level security;
alter table public.access_scope_assignments enable row level security;
alter table public.access_audit_events enable row level security;

create policy profiles_select_self on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy institutions_select_member on public.institutions for select to authenticated using (public.is_active_member(id));
create policy institutions_update_manager on public.institutions for update to authenticated
using (public.has_permission(id, 'settings.institution.manage'))
with check (public.has_permission(id, 'settings.institution.manage'));

create policy memberships_select_authorized on public.memberships for select to authenticated
using (user_id = (select auth.uid()) or public.has_permission(institution_id, 'settings.access.read'));
create policy module_catalog_select_authenticated on public.module_catalog for select to authenticated using (is_active);
create policy institution_modules_select_member on public.institution_modules for select to authenticated
using (public.is_active_member(institution_id));
create policy permissions_select_authenticated on public.permissions for select to authenticated using (is_active);
create policy access_profile_templates_select_authenticated on public.access_profile_templates for select to authenticated using (is_active);
create policy access_profile_template_permissions_select_authenticated on public.access_profile_template_permissions
for select to authenticated using (
  exists (
    select 1 from public.access_profile_templates template
    join public.permissions permission
      on permission.id = public.access_profile_template_permissions.permission_id
    where template.id = public.access_profile_template_permissions.template_id
      and template.is_active and permission.is_active
  )
);
create policy access_profiles_select_authorized on public.access_profiles for select to authenticated
using (public.has_permission(institution_id, 'settings.access.read'));
create policy access_profile_permissions_select_authorized on public.access_profile_permissions for select to authenticated
using (exists (
  select 1 from public.access_profiles profile
  where profile.id = public.access_profile_permissions.access_profile_id
    and public.has_permission(profile.institution_id, 'settings.access.read')
));
create policy access_profile_permission_delegations_select_authorized on public.access_profile_permission_delegations for select to authenticated
using (exists (
  select 1 from public.access_profiles profile
  where profile.id=public.access_profile_permission_delegations.access_profile_id
    and public.has_permission(profile.institution_id,'settings.access.read')
));
create policy membership_access_profiles_select_authorized on public.membership_access_profiles for select to authenticated
using (exists (
  select 1 from public.memberships membership
  where membership.id = public.membership_access_profiles.membership_id
    and (membership.user_id = (select auth.uid()) or public.has_permission(membership.institution_id, 'settings.access.read'))
));
create policy access_scope_assignments_select_authorized on public.access_scope_assignments for select to authenticated
using (public.has_permission(institution_id, 'settings.access.read'));
create policy access_audit_events_select_authorized on public.access_audit_events for select to authenticated
using (public.has_permission(institution_id, 'audit.events.read'));

grant select on public.module_catalog, public.institution_modules,
  public.permissions, public.access_profile_templates,
  public.access_profile_template_permissions, public.access_profiles,
  public.access_profile_permissions, public.access_profile_permission_delegations,
  public.membership_access_profiles,
  public.access_scope_assignments, public.access_audit_events to authenticated;
revoke insert, update, delete on public.memberships, public.institution_modules,
  public.access_profiles,
  public.access_profile_permissions, public.access_profile_permission_delegations,
  public.membership_access_profiles,
  public.access_scope_assignments, public.access_audit_events from authenticated;

create or replace function public.is_recently_authenticated(max_age interval default interval '10 minutes')
returns boolean language sql stable set search_path = '' as $$
  select coalesce(((select auth.jwt()) ->> 'iat')::bigint, 0)
    >= extract(epoch from now() - max_age)::bigint;
$$;

create or replace function public.can_delegate_permission(target_institution_id uuid,permission_code text)
returns boolean language sql stable security definer set search_path='' as $$
  select public.is_institution_owner(target_institution_id)
    or exists(
      select 1
      from public.memberships membership
      join public.membership_access_profiles assignment on assignment.membership_id=membership.id
      join public.access_profiles profile on profile.id=assignment.access_profile_id
      join public.access_profile_permission_delegations delegation on delegation.access_profile_id=profile.id
      join public.permissions permission on permission.id=delegation.permission_id
      where membership.institution_id=target_institution_id
        and membership.user_id=(select auth.uid())
        and membership.status='active'
        and membership.valid_from<=current_date
        and (membership.valid_until is null or membership.valid_until>=current_date)
        and assignment.is_active and profile.is_active
        and assignment.valid_from<=current_date
        and (assignment.valid_until is null or assignment.valid_until>=current_date)
        and permission.code=permission_code
        and permission.is_assignable
    );
$$;

create or replace function public.can_delegate_access_profile(target_access_profile_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.access_profiles profile
    where profile.id = target_access_profile_id
      and (
        public.is_institution_owner(profile.institution_id)
        or (
          public.has_permission(profile.institution_id, 'settings.access.manage')
          and not exists (
            select 1
            from public.access_profile_permissions profile_permission
            join public.permissions permission on permission.id = profile_permission.permission_id
            where profile_permission.access_profile_id = profile.id
              and (
                not permission.is_assignable
                or not public.can_delegate_permission(profile.institution_id, permission.code)
              )
          )
        )
      )
  );
$$;

create or replace function public.list_delegable_permissions(target_institution_id uuid)
returns table(
  id uuid,code text,module text,resource text,action text,label text,description text,
  sensitivity text,is_assignable boolean,is_active boolean,requires_delegation boolean,created_at timestamptz
)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.has_permission(target_institution_id,'settings.access.manage') then raise exception 'permission_denied'; end if;
  return query
  select permission.id,permission.code,permission.module,permission.resource,permission.action,
    permission.label,permission.description,permission.sensitivity,permission.is_assignable,
    permission.is_active,permission.requires_delegation,permission.created_at
  from public.permissions permission
  where permission.is_active and permission.is_assignable
    and public.can_delegate_permission(target_institution_id,permission.code)
  order by permission.module,permission.label;
end;
$$;

create or replace function public.create_custom_access_profile(
  target_institution_id uuid,
  profile_name text,
  profile_description text,
  permission_codes text[],
  source_profile_id uuid default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_profile_id uuid; generated_code text; source_profile public.access_profiles;
begin
  if not public.has_permission(target_institution_id, 'settings.access.manage') then
    raise exception 'permission_denied';
  end if;
  if char_length(trim(profile_name)) < 2 then raise exception 'access_profile_name_required'; end if;
  if coalesce(array_length(permission_codes, 1), 0) = 0 then raise exception 'access_profile_permission_required'; end if;

  if source_profile_id is not null then
    select * into source_profile from public.access_profiles
    where id = source_profile_id and institution_id = target_institution_id and is_active;
    if source_profile.id is null or not public.can_delegate_access_profile(source_profile.id) then
      raise exception 'access_profile_not_delegable';
    end if;
  end if;

  if exists (
    select 1 from unnest(permission_codes) requested(code)
    left join public.permissions permission on permission.code = requested.code
    where permission.id is null
      or not permission.is_assignable
      or not public.can_delegate_permission(target_institution_id, permission.code)
  ) then
    raise exception 'permission_not_delegable';
  end if;

  generated_code := 'local_' || substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 16);
  insert into public.access_profiles(
    institution_id, source_template_id, source_template_version, code, name,
    description, is_standard, created_by
  ) values (
    target_institution_id, source_profile.source_template_id, source_profile.source_template_version,
    generated_code, trim(profile_name), coalesce(trim(profile_description), ''), false, (select auth.uid())
  ) returning id into new_profile_id;

  insert into public.access_profile_permissions(access_profile_id, permission_id, created_by)
  select new_profile_id, permission.id, (select auth.uid())
  from public.permissions permission where permission.code = any(permission_codes);

  perform public.write_access_audit(
    target_institution_id, 'access_profile.created', 'access_profile', new_profile_id,
    null, jsonb_build_object('name', trim(profile_name), 'permissions', permission_codes), null
  );
  return new_profile_id;
end;
$$;

create or replace function public.assign_membership_access_profile(
  target_membership_id uuid,
  target_access_profile_id uuid,
  assignment_valid_from date default current_date,
  assignment_valid_until date default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_membership public.memberships; target_profile public.access_profiles; assignment_id uuid;
begin
  select * into target_membership from public.memberships where id = target_membership_id;
  select * into target_profile from public.access_profiles where id = target_access_profile_id and is_active;
  if target_membership.id is null or target_profile.id is null
    or target_membership.institution_id <> target_profile.institution_id then
    raise exception 'invalid_membership_access_profile';
  end if;
  if assignment_valid_until is not null and assignment_valid_until < assignment_valid_from then
    raise exception 'invalid_access_period';
  end if;
  if not public.can_delegate_access_profile(target_profile.id) then raise exception 'access_profile_not_delegable'; end if;

  insert into public.membership_access_profiles(
    membership_id, access_profile_id, is_active, valid_from, valid_until, assigned_by
  ) values (
    target_membership.id, target_profile.id, true, assignment_valid_from,
    assignment_valid_until, (select auth.uid())
  )
  on conflict (membership_id, access_profile_id) do update
    set is_active = true, valid_from = excluded.valid_from,
      valid_until = excluded.valid_until, assigned_by = excluded.assigned_by
  returning id into assignment_id;

  perform public.write_access_audit(
    target_membership.institution_id, 'membership_profile.assigned', 'membership_access_profile',
    assignment_id, null,
    jsonb_build_object('membershipId', target_membership.id, 'accessProfileId', target_profile.id,
      'validFrom', assignment_valid_from, 'validUntil', assignment_valid_until), null
  );
  return assignment_id;
end;
$$;

create or replace function public.update_custom_access_profile(
  target_access_profile_id uuid,
  profile_name text,
  profile_description text,
  permission_codes text[],
  profile_active boolean default true
)
returns void language plpgsql security definer set search_path='' as $$
declare target_profile public.access_profiles; previous_value jsonb; permission_code text;
begin
  select * into target_profile from public.access_profiles where id=target_access_profile_id for update;
  if target_profile.id is null then raise exception 'access_profile_not_found'; end if;
  if target_profile.is_standard then raise exception 'standard_access_profile_is_immutable'; end if;
  if not public.has_permission(target_profile.institution_id,'settings.access.manage')
    or not public.can_delegate_access_profile(target_profile.id) then raise exception 'access_profile_not_delegable'; end if;
  if char_length(trim(profile_name))<2 then raise exception 'access_profile_name_required'; end if;
  if coalesce(array_length(permission_codes,1),0)=0 then raise exception 'access_profile_permission_required'; end if;
  foreach permission_code in array permission_codes loop
    if not exists(
      select 1 from public.permissions permission
      where permission.code=permission_code and permission.is_active and permission.is_assignable
    ) or not public.can_delegate_permission(target_profile.institution_id,permission_code) then
      raise exception 'permission_not_delegable';
    end if;
  end loop;
  previous_value:=jsonb_build_object(
    'name',target_profile.name,'description',target_profile.description,'isActive',target_profile.is_active,
    'permissions',(select coalesce(jsonb_agg(permission.code),'[]'::jsonb)
      from public.access_profile_permissions profile_permission
      join public.permissions permission on permission.id=profile_permission.permission_id
      where profile_permission.access_profile_id=target_profile.id)
  );
  update public.access_profiles set name=trim(profile_name),description=coalesce(trim(profile_description),''),
    is_active=profile_active where id=target_profile.id;
  delete from public.access_profile_permissions where access_profile_id=target_profile.id;
  insert into public.access_profile_permissions(access_profile_id,permission_id,created_by)
  select target_profile.id,permission.id,(select auth.uid())
  from public.permissions permission where permission.code=any(permission_codes);
  perform public.write_access_audit(
    target_profile.institution_id,'access_profile.updated','access_profile',target_profile.id,previous_value,
    jsonb_build_object('name',trim(profile_name),'description',coalesce(trim(profile_description),''),
      'isActive',profile_active,'permissions',permission_codes),null
  );
end;
$$;

create or replace function public.revoke_membership_access_profile(
  target_assignment_id uuid,
  revocation_reason text
)
returns void language plpgsql security definer set search_path = '' as $$
declare assignment record;
begin
  select membership_profile.*, membership.institution_id
    into assignment
  from public.membership_access_profiles membership_profile
  join public.memberships membership on membership.id = membership_profile.membership_id
  where membership_profile.id = target_assignment_id;
  if assignment.id is null then raise exception 'membership_access_profile_not_found'; end if;
  if not public.can_delegate_access_profile(assignment.access_profile_id) then raise exception 'access_profile_not_delegable'; end if;
  update public.membership_access_profiles set is_active = false where id = assignment.id;
  perform public.write_access_audit(
    assignment.institution_id, 'membership_profile.revoked', 'membership_access_profile', assignment.id,
    jsonb_build_object('isActive', true), jsonb_build_object('isActive', false), revocation_reason
  );
end;
$$;

create or replace function public.set_membership_status(
  target_membership_id uuid,
  next_status public.membership_status,
  status_reason text
)
returns void language plpgsql security definer set search_path = '' as $$
declare target_membership public.memberships;
begin
  select * into target_membership from public.memberships where id = target_membership_id for update;
  if target_membership.id is null then raise exception 'membership_not_found'; end if;
  if target_membership.is_owner then raise exception 'owner_status_requires_owner_action'; end if;
  if not public.has_permission(target_membership.institution_id, 'settings.access.manage') then raise exception 'permission_denied'; end if;
  if exists (
    select 1 from public.membership_access_profiles assignment
    where assignment.membership_id = target_membership.id and assignment.is_active
      and not public.can_delegate_access_profile(assignment.access_profile_id)
  ) then raise exception 'membership_access_not_delegable'; end if;
  update public.memberships set status = next_status where id = target_membership.id;
  perform public.write_access_audit(
    target_membership.institution_id, 'membership.status_changed', 'membership', target_membership.id,
    jsonb_build_object('status', target_membership.status), jsonb_build_object('status', next_status), status_reason
  );
end;
$$;

create or replace function public.set_membership_owner(
  target_membership_id uuid,
  owner_enabled boolean,
  ownership_reason text
)
returns void language plpgsql security definer set search_path = '' as $$
declare target_membership public.memberships;
begin
  select * into target_membership from public.memberships where id = target_membership_id for update;
  if target_membership.id is null then raise exception 'membership_not_found'; end if;
  if not public.is_institution_owner(target_membership.institution_id) then raise exception 'owner_required'; end if;
  if not public.is_recently_authenticated() then raise exception 'recent_authentication_required'; end if;
  update public.memberships set is_owner = owner_enabled, status = 'active' where id = target_membership.id;
  perform public.write_access_audit(
    target_membership.institution_id,
    case when owner_enabled then 'membership.owner_promoted' else 'membership.owner_revoked' end,
    'membership', target_membership.id,
    jsonb_build_object('isOwner', target_membership.is_owner), jsonb_build_object('isOwner', owner_enabled),
    ownership_reason
  );
end;
$$;

create or replace function public.remove_membership(target_membership_id uuid, removal_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare target_membership public.memberships;
begin
  select * into target_membership from public.memberships where id = target_membership_id for update;
  if target_membership.id is null then raise exception 'membership_not_found'; end if;
  if target_membership.is_owner then
    if not public.is_institution_owner(target_membership.institution_id) or not public.is_recently_authenticated() then
      raise exception 'owner_action_forbidden';
    end if;
  elsif not public.has_permission(target_membership.institution_id, 'settings.access.manage') then
    raise exception 'permission_denied';
  end if;
  perform public.write_access_audit(
    target_membership.institution_id, 'membership.removed', 'membership', target_membership.id,
    jsonb_build_object('userId', target_membership.user_id, 'isOwner', target_membership.is_owner), null,
    removal_reason
  );
  delete from public.memberships where id = target_membership.id;
end;
$$;

create or replace function public.get_my_authorization_summary(target_institution_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'institutionId', membership.institution_id,
    'membershipId', membership.id,
    'isOwner', membership.is_owner,
    'status', membership.status,
    'profiles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', profile.id,
        'code', profile.code,
        'name', profile.name,
        'validFrom', assignment.valid_from,
        'validUntil', assignment.valid_until
      ) order by profile.name)
      from public.membership_access_profiles assignment
      join public.access_profiles profile on profile.id = assignment.access_profile_id
      where assignment.membership_id = membership.id
        and assignment.is_active and profile.is_active
        and assignment.valid_from <= current_date
        and (assignment.valid_until is null or assignment.valid_until >= current_date)
    ), '[]'::jsonb),
    'permissions', case when membership.is_owner then '[]'::jsonb else coalesce((
      select jsonb_agg(distinct permission.code)
      from public.membership_access_profiles assignment
      join public.access_profiles profile on profile.id = assignment.access_profile_id
      join public.access_profile_permissions profile_permission on profile_permission.access_profile_id = profile.id
      join public.permissions permission on permission.id = profile_permission.permission_id
      where assignment.membership_id = membership.id
        and assignment.is_active and profile.is_active
        and assignment.valid_from <= current_date
        and (assignment.valid_until is null or assignment.valid_until >= current_date)
    ), '[]'::jsonb) end
  )
  from public.memberships membership
  where membership.institution_id = target_institution_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and membership.valid_from <= current_date
    and (membership.valid_until is null or membership.valid_until >= current_date);
$$;

create or replace function public.set_institution_module_enabled(
  target_institution_id uuid,
  target_module_code text,
  target_enabled boolean,
  change_reason text default null
)
returns void language plpgsql security definer set search_path='' as $$
declare module_row public.module_catalog; previous_enabled boolean;
begin
  if not public.has_permission(target_institution_id,'settings.modules.manage') then raise exception 'permission_denied'; end if;
  select * into module_row from public.module_catalog where code=target_module_code and is_active;
  if module_row.code is null then raise exception 'module_not_found'; end if;
  if module_row.is_mandatory and not target_enabled then raise exception 'mandatory_module_cannot_be_disabled'; end if;
  select is_enabled into previous_enabled from public.institution_modules
  where institution_id=target_institution_id and module_code=target_module_code for update;
  if previous_enabled is null then raise exception 'institution_module_not_found'; end if;
  update public.institution_modules
  set is_enabled=target_enabled,updated_by=(select auth.uid()),updated_at=now()
  where institution_id=target_institution_id and module_code=target_module_code;
  perform public.write_access_audit(
    target_institution_id,'institution_module.changed','institution_module',null,
    jsonb_build_object('module',target_module_code,'enabled',previous_enabled),
    jsonb_build_object('module',target_module_code,'enabled',target_enabled),change_reason
  );
end;
$$;

revoke all on function public.is_recently_authenticated(interval) from public;
revoke all on function public.can_delegate_permission(uuid,text) from public;
revoke all on function public.list_delegable_permissions(uuid) from public;
grant execute on function public.list_delegable_permissions(uuid) to authenticated;
revoke all on function public.can_delegate_access_profile(uuid) from public;
revoke all on function public.create_custom_access_profile(uuid, text, text, text[], uuid) from public;
grant execute on function public.create_custom_access_profile(uuid, text, text, text[], uuid) to authenticated;
revoke all on function public.update_custom_access_profile(uuid,text,text,text[],boolean) from public;
grant execute on function public.update_custom_access_profile(uuid,text,text,text[],boolean) to authenticated;
revoke all on function public.assign_membership_access_profile(uuid, uuid, date, date) from public;
grant execute on function public.assign_membership_access_profile(uuid, uuid, date, date) to authenticated;
revoke all on function public.revoke_membership_access_profile(uuid, text) from public;
grant execute on function public.revoke_membership_access_profile(uuid, text) to authenticated;
revoke all on function public.set_membership_status(uuid, public.membership_status, text) from public;
grant execute on function public.set_membership_status(uuid, public.membership_status, text) to authenticated;
revoke all on function public.set_membership_owner(uuid, boolean, text) from public;
grant execute on function public.set_membership_owner(uuid, boolean, text) to authenticated;
revoke all on function public.remove_membership(uuid, text) from public;
grant execute on function public.remove_membership(uuid, text) to authenticated;
revoke all on function public.get_my_authorization_summary(uuid) from public;
grant execute on function public.get_my_authorization_summary(uuid) to authenticated;
revoke all on function public.set_institution_module_enabled(uuid,text,boolean,text) from public;


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607160002_institution_settings.sql
-- -----------------------------------------------------------------------------

create type public.academic_year_status as enum ('preparation', 'open', 'closed', 'archived');

create table public.academic_years (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 4 and 30),
  starts_on date not null,
  ends_on date not null,
  status public.academic_year_status not null default 'preparation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_years_valid_dates check (starts_on < ends_on),
  constraint academic_years_unique_name unique (institution_id, name)
);

create unique index academic_years_one_open_per_institution_idx
  on public.academic_years (institution_id)
  where status = 'open';
create index academic_years_institution_dates_idx
  on public.academic_years (institution_id, starts_on desc);

create trigger academic_years_set_updated_at
before update on public.academic_years
for each row execute function public.set_updated_at();

create or replace function public.enforce_academic_year_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = old.status then return new; end if;
  if not (
    (old.status = 'preparation' and new.status = 'open') or
    (old.status = 'open' and new.status = 'closed') or
    (old.status = 'closed' and new.status = 'archived')
  ) then
    raise exception 'invalid_academic_year_transition: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$;

create trigger academic_years_enforce_transition
before update of status on public.academic_years
for each row execute function public.enforce_academic_year_transition();

alter table public.academic_years enable row level security;

create policy academic_years_select_member
on public.academic_years for select to authenticated
using (public.is_active_member(institution_id));

create policy academic_years_insert_admin
on public.academic_years for insert to authenticated
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

create policy academic_years_update_admin
on public.academic_years for update to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

create policy academic_years_delete_preparation_admin
on public.academic_years for delete to authenticated
using (
  status = 'preparation'
  and public.has_institution_role(institution_id, array['owner','admin']::public.app_role[])
);


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607160003_authenticated_grants.sql
-- -----------------------------------------------------------------------------

grant usage on schema public to authenticated;

grant select, update
on public.profiles, public.institutions
to authenticated;

grant select on public.memberships to authenticated;
revoke insert, update, delete on public.memberships from authenticated;
grant select, insert, update, delete on public.academic_years to authenticated;

revoke all
on public.profiles, public.institutions, public.memberships, public.academic_years
from anon;


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607160004_academic_structure.sql
-- -----------------------------------------------------------------------------

create table public.academic_cycles (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  code text not null check (code ~ '^[A-Z0-9_-]{2,20}$'),
  sort_order smallint not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, name),
  unique (institution_id, code),
  unique (id, institution_id)
);

create table public.grade_levels (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  cycle_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 80),
  code text not null check (code ~ '^[A-Z0-9_-]{1,20}$'),
  sort_order smallint not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grade_levels_cycle_fk foreign key (cycle_id, institution_id)
    references public.academic_cycles(id, institution_id) on delete restrict,
  unique (cycle_id, name),
  unique (cycle_id, code)
);

create index academic_cycles_institution_order_idx on public.academic_cycles(institution_id, sort_order, name);
create index grade_levels_cycle_order_idx on public.grade_levels(cycle_id, sort_order, name);

create trigger academic_cycles_set_updated_at before update on public.academic_cycles
for each row execute function public.set_updated_at();
create trigger grade_levels_set_updated_at before update on public.grade_levels
for each row execute function public.set_updated_at();

alter table public.academic_cycles enable row level security;
alter table public.grade_levels enable row level security;

create policy academic_cycles_select_member on public.academic_cycles for select to authenticated
using (public.is_active_member(institution_id));
create policy academic_cycles_insert_admin on public.academic_cycles for insert to authenticated
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
create policy academic_cycles_update_admin on public.academic_cycles for update to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

create policy grade_levels_select_member on public.grade_levels for select to authenticated
using (public.is_active_member(institution_id));
create policy grade_levels_insert_admin on public.grade_levels for insert to authenticated
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
create policy grade_levels_update_admin on public.grade_levels for update to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

grant select, insert, update on public.academic_cycles, public.grade_levels to authenticated;
revoke all on public.academic_cycles, public.grade_levels from anon;


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607160005_annual_academic_structure.sql
-- -----------------------------------------------------------------------------

alter table public.academic_years
  add constraint academic_years_id_institution_unique unique (id, institution_id);
alter table public.grade_levels
  add constraint grade_levels_id_cycle_institution_unique unique (id, cycle_id, institution_id),
  add constraint grade_levels_id_institution_unique unique (id, institution_id);

create table public.academic_year_levels (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  cycle_id uuid not null,
  level_id uuid not null,
  cycle_name_snapshot text not null,
  level_name_snapshot text not null,
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  cloned_from_id uuid references public.academic_year_levels(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint annual_levels_year_fk foreign key (academic_year_id, institution_id)
    references public.academic_years(id, institution_id) on delete cascade,
  constraint annual_levels_cycle_fk foreign key (cycle_id, institution_id)
    references public.academic_cycles(id, institution_id) on delete restrict,
  constraint annual_levels_level_fk foreign key (level_id, cycle_id, institution_id)
    references public.grade_levels(id, cycle_id, institution_id) on delete restrict,
  unique (academic_year_id, level_id)
);

create index academic_year_levels_year_cycle_idx
  on public.academic_year_levels(academic_year_id, cycle_id, sort_order);

create or replace function public.prepare_academic_year_level()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cycle_row public.academic_cycles; level_row public.grade_levels;
begin
  select * into cycle_row from public.academic_cycles
  where id = new.cycle_id and institution_id = new.institution_id;
  select * into level_row from public.grade_levels
  where id = new.level_id and cycle_id = new.cycle_id and institution_id = new.institution_id;
  if cycle_row.id is null or level_row.id is null then raise exception 'invalid_academic_structure'; end if;
  new.cycle_name_snapshot = cycle_row.name;
  new.level_name_snapshot = level_row.name;
  new.sort_order = level_row.sort_order;
  return new;
end;
$$;

create trigger academic_year_levels_prepare before insert on public.academic_year_levels
for each row execute function public.prepare_academic_year_level();

create or replace function public.set_academic_year_cycle_levels(
  target_year_id uuid, target_cycle_id uuid, target_level_ids uuid[]
)
returns integer language plpgsql security definer set search_path = '' as $$
declare target_institution_id uuid; target_status public.academic_year_status; inserted_count integer;
begin
  select institution_id, status into target_institution_id, target_status
  from public.academic_years where id = target_year_id;
  if target_institution_id is null then raise exception 'academic_year_not_found'; end if;
  if not public.has_institution_role(target_institution_id, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if target_status <> 'preparation' then raise exception 'academic_year_configuration_locked'; end if;
  if not exists (select 1 from public.academic_cycles where id = target_cycle_id and institution_id = target_institution_id) then raise exception 'cycle_not_found'; end if;
  delete from public.academic_year_levels where academic_year_id = target_year_id and cycle_id = target_cycle_id;
  insert into public.academic_year_levels (
    institution_id, academic_year_id, cycle_id, level_id, cycle_name_snapshot, level_name_snapshot
  )
  select target_institution_id, target_year_id, target_cycle_id, level.id, '', ''
  from public.grade_levels level
  where level.id = any(coalesce(target_level_ids, array[]::uuid[]))
    and level.cycle_id = target_cycle_id and level.institution_id = target_institution_id and level.is_active;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.clone_academic_year_levels(source_year_id uuid, target_year_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare source_institution_id uuid; target_institution_id uuid; target_status public.academic_year_status; inserted_count integer;
begin
  select institution_id into source_institution_id from public.academic_years where id = source_year_id;
  select institution_id, status into target_institution_id, target_status from public.academic_years where id = target_year_id;
  if source_institution_id is null or target_institution_id is null or source_institution_id <> target_institution_id then raise exception 'incompatible_academic_years'; end if;
  if not public.has_institution_role(target_institution_id, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if target_status <> 'preparation' then raise exception 'academic_year_configuration_locked'; end if;
  insert into public.academic_year_levels (
    institution_id, academic_year_id, cycle_id, level_id, cycle_name_snapshot, level_name_snapshot, is_active, cloned_from_id
  )
  select institution_id, target_year_id, cycle_id, level_id, cycle_name_snapshot, level_name_snapshot, is_active, id
  from public.academic_year_levels where academic_year_id = source_year_id
  on conflict (academic_year_id, level_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.enforce_academic_year_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = old.status then return new; end if;
  if new.status = 'open' and not exists (
    select 1 from public.academic_year_levels where academic_year_id = new.id and is_active
  ) then raise exception 'academic_year_requires_active_levels'; end if;
  if not (
    (old.status = 'preparation' and new.status = 'open') or
    (old.status = 'open' and new.status = 'closed') or
    (old.status = 'closed' and new.status = 'archived')
  ) then raise exception 'invalid_academic_year_transition: % -> %', old.status, new.status; end if;
  return new;
end;
$$;

alter table public.academic_year_levels enable row level security;
create policy annual_levels_select_member on public.academic_year_levels for select to authenticated
using (public.is_active_member(institution_id));
create policy annual_levels_write_admin on public.academic_year_levels for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

grant select, insert, update, delete on public.academic_year_levels to authenticated;
revoke all on public.academic_year_levels from anon;
revoke all on function public.set_academic_year_cycle_levels(uuid, uuid, uuid[]) from public;
grant execute on function public.set_academic_year_cycle_levels(uuid, uuid, uuid[]) to authenticated;
revoke all on function public.clone_academic_year_levels(uuid, uuid) from public;
grant execute on function public.clone_academic_year_levels(uuid, uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607160006_annual_settings.sql
-- -----------------------------------------------------------------------------

create table public.subjects (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  code text not null check (char_length(trim(code)) between 1 and 20),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, name),
  unique (institution_id, code),
  unique (id, institution_id)
);

create table public.annual_subjects (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  academic_year_level_id uuid not null references public.academic_year_levels(id) on delete cascade,
  subject_id uuid not null,
  subject_name_snapshot text not null,
  coefficient numeric(6,2) not null default 1 check (coefficient > 0),
  weekly_hours numeric(5,2) not null default 0 check (weekly_hours >= 0),
  created_at timestamptz not null default now(),
  constraint annual_subjects_year_fk foreign key (academic_year_id, institution_id)
    references public.academic_years(id, institution_id) on delete cascade,
  constraint annual_subjects_subject_fk foreign key (subject_id, institution_id)
    references public.subjects(id, institution_id) on delete restrict,
  unique (academic_year_id, academic_year_level_id, subject_id)
);

create table public.assessment_types (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 80),
  code text not null check (char_length(trim(code)) between 1 and 20),
  weight numeric(6,2) not null default 1 check (weight > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint assessment_types_year_fk foreign key (academic_year_id, institution_id)
    references public.academic_years(id, institution_id) on delete cascade,
  unique (academic_year_id, name),
  unique (academic_year_id, code)
);

create table public.grading_formulas (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 100),
  expression text not null check (char_length(trim(expression)) between 1 and 500),
  description text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  constraint grading_formulas_year_fk foreign key (academic_year_id, institution_id)
    references public.academic_years(id, institution_id) on delete cascade,
  unique (academic_year_id, name)
);
create unique index grading_formulas_one_default_idx
  on public.grading_formulas(academic_year_id) where is_default;

create table public.financial_rules (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 100),
  code text not null check (char_length(trim(code)) between 1 and 20),
  amount numeric(14,2) not null check (amount >= 0),
  due_day smallint check (due_day between 1 and 31),
  frequency text not null default 'once' check (frequency in ('once', 'monthly', 'termly')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint financial_rules_year_fk foreign key (academic_year_id, institution_id)
    references public.academic_years(id, institution_id) on delete cascade,
  unique (academic_year_id, code)
);

create table public.academic_year_user_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  responsibility text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint year_user_assignments_year_fk foreign key (academic_year_id, institution_id)
    references public.academic_years(id, institution_id) on delete cascade,
  unique (academic_year_id, membership_id)
);

create policy profiles_select_institution_colleague on public.profiles
for select to authenticated using (
  exists (
    select 1 from public.memberships colleague
    join public.memberships current_member
      on current_member.institution_id = colleague.institution_id
    where colleague.user_id = profiles.id
      and current_member.user_id = (select auth.uid())
      and current_member.status = 'active'
  )
);

create index annual_subjects_year_idx on public.annual_subjects(academic_year_id);
create index assessment_types_year_idx on public.assessment_types(academic_year_id);
create index grading_formulas_year_idx on public.grading_formulas(academic_year_id);
create index financial_rules_year_idx on public.financial_rules(academic_year_id);
create index year_user_assignments_year_idx on public.academic_year_user_assignments(academic_year_id);
create trigger subjects_set_updated_at before update on public.subjects
for each row execute function public.set_updated_at();

create or replace function public.ensure_preparation_year_write()
returns trigger language plpgsql set search_path = '' as $$
declare year_id uuid; year_status public.academic_year_status;
begin
  year_id := case when tg_op = 'DELETE' then old.academic_year_id else new.academic_year_id end;
  select status into year_status from public.academic_years where id = year_id;
  if year_status <> 'preparation' then raise exception 'academic_year_configuration_locked'; end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.prepare_annual_subject()
returns trigger language plpgsql security definer set search_path = '' as $$
declare annual_level public.academic_year_levels; subject_row public.subjects;
begin
  select * into annual_level from public.academic_year_levels where id = new.academic_year_level_id;
  select * into subject_row from public.subjects where id = new.subject_id and institution_id = new.institution_id;
  if annual_level.id is null or annual_level.academic_year_id <> new.academic_year_id
    or annual_level.institution_id <> new.institution_id or subject_row.id is null
  then raise exception 'invalid_annual_subject'; end if;
  new.subject_name_snapshot := subject_row.name;
  return new;
end;
$$;

create trigger annual_subjects_prepare before insert or update on public.annual_subjects
for each row execute function public.prepare_annual_subject();

do $$
declare table_name text;
begin
  foreach table_name in array array['annual_subjects','assessment_types','grading_formulas','financial_rules','academic_year_user_assignments']
  loop
    execute format('create trigger %I_lock before insert or update or delete on public.%I for each row execute function public.ensure_preparation_year_write()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I_select on public.%I for select to authenticated using (public.is_active_member(institution_id))', table_name, table_name);
    execute format('create policy %I_write on public.%I for all to authenticated using (public.has_institution_role(institution_id, array[''owner'',''admin'']::public.app_role[])) with check (public.has_institution_role(institution_id, array[''owner'',''admin'']::public.app_role[]))', table_name, table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('revoke all on public.%I from anon', table_name);
  end loop;
end $$;

alter table public.subjects enable row level security;
create policy subjects_select on public.subjects for select to authenticated using (public.is_active_member(institution_id));
create policy subjects_write on public.subjects for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
grant select, insert, update, delete on public.subjects to authenticated;
revoke all on public.subjects from anon;

create or replace function public.clone_academic_year_configuration(
  source_year_id uuid,
  target_year_id uuid,
  include_structure boolean default true,
  include_subjects boolean default true,
  include_assessments boolean default true,
  include_finance boolean default true,
  include_users boolean default true
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare source_institution uuid; target_institution uuid; target_status public.academic_year_status;
declare structure_count integer := 0; subjects_count integer := 0; assessments_count integer := 0;
declare formulas_count integer := 0; finance_count integer := 0; users_count integer := 0;
begin
  select institution_id into source_institution from public.academic_years where id = source_year_id;
  select institution_id, status into target_institution, target_status from public.academic_years where id = target_year_id;
  if source_institution is null or target_institution is null or source_institution <> target_institution then raise exception 'incompatible_academic_years'; end if;
  if source_year_id = target_year_id then raise exception 'source_and_target_must_differ'; end if;
  if target_status <> 'preparation' then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(target_institution, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;

  if include_structure then
    select public.clone_academic_year_levels(source_year_id, target_year_id) into structure_count;
  end if;
  if include_subjects then
    insert into public.annual_subjects (institution_id, academic_year_id, academic_year_level_id, subject_id, subject_name_snapshot, coefficient, weekly_hours)
    select s.institution_id, target_year_id, target_level.id, s.subject_id, s.subject_name_snapshot, s.coefficient, s.weekly_hours
    from public.annual_subjects s
    join public.academic_year_levels source_level on source_level.id = s.academic_year_level_id
    join public.academic_year_levels target_level on target_level.academic_year_id = target_year_id and target_level.level_id = source_level.level_id
    where s.academic_year_id = source_year_id
    on conflict (academic_year_id, academic_year_level_id, subject_id) do nothing;
    get diagnostics subjects_count = row_count;
  end if;
  if include_assessments then
    insert into public.assessment_types (institution_id, academic_year_id, name, code, weight, is_active)
    select institution_id, target_year_id, name, code, weight, is_active from public.assessment_types where academic_year_id = source_year_id
    on conflict (academic_year_id, code) do nothing;
    get diagnostics assessments_count = row_count;
    insert into public.grading_formulas (institution_id, academic_year_id, name, expression, description, is_default)
    select institution_id, target_year_id, name, expression, description, is_default from public.grading_formulas where academic_year_id = source_year_id
    on conflict (academic_year_id, name) do nothing;
    get diagnostics formulas_count = row_count;
  end if;
  if include_finance then
    insert into public.financial_rules (institution_id, academic_year_id, name, code, amount, due_day, frequency, is_active)
    select institution_id, target_year_id, name, code, amount, due_day, frequency, is_active from public.financial_rules where academic_year_id = source_year_id
    on conflict (academic_year_id, code) do nothing;
    get diagnostics finance_count = row_count;
  end if;
  if include_users then
    insert into public.academic_year_user_assignments (institution_id, academic_year_id, membership_id, responsibility, is_active)
    select institution_id, target_year_id, membership_id, responsibility, is_active from public.academic_year_user_assignments where academic_year_id = source_year_id
    on conflict (academic_year_id, membership_id) do nothing;
    get diagnostics users_count = row_count;
  end if;
  return jsonb_build_object('structure', structure_count, 'subjects', subjects_count, 'assessments', assessments_count, 'formulas', formulas_count, 'finance', finance_count, 'users', users_count);
end;
$$;

revoke all on function public.clone_academic_year_configuration(uuid, uuid, boolean, boolean, boolean, boolean, boolean) from public;
grant execute on function public.clone_academic_year_configuration(uuid, uuid, boolean, boolean, boolean, boolean, boolean) to authenticated;


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607160007_people_periods.sql
-- -----------------------------------------------------------------------------

alter table public.academic_cycles
  add column period_system text not null default 'term' check (period_system in ('term', 'semester', 'custom')),
  add column period_count smallint not null default 3 check (period_count between 1 and 6);

create table public.people (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  first_name text not null check (char_length(trim(first_name)) between 2 and 80),
  last_name text not null check (char_length(trim(last_name)) between 2 and 80),
  email text,
  phone text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, email)
);
create index people_institution_name_idx on public.people(institution_id, last_name, first_name);
create trigger people_set_updated_at before update on public.people
for each row execute function public.set_updated_at();

create table public.person_access_profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  access_profile_id uuid not null references public.access_profiles(id) on delete cascade,
  valid_from date not null default current_date,
  valid_until date,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_until >= valid_from),
  unique (person_id, access_profile_id)
);

create table public.person_invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index person_invitations_person_idx on public.person_invitations(person_id, status);

create table public.academic_periods (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  cycle_id uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 80),
  code text not null check (char_length(trim(code)) between 1 and 20),
  sequence smallint not null check (sequence between 1 and 6),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'planned' check (status in ('planned', 'open', 'closed')),
  created_at timestamptz not null default now(),
  constraint academic_periods_dates check (starts_on <= ends_on),
  constraint academic_periods_year_fk foreign key (academic_year_id, institution_id)
    references public.academic_years(id, institution_id) on delete cascade,
  constraint academic_periods_cycle_fk foreign key (cycle_id, institution_id)
    references public.academic_cycles(id, institution_id) on delete restrict,
  unique (academic_year_id, cycle_id, sequence),
  unique (academic_year_id, cycle_id, code)
);
create index academic_periods_year_cycle_idx on public.academic_periods(academic_year_id, cycle_id, sequence);
create trigger academic_periods_lock before insert or update or delete on public.academic_periods
for each row execute function public.ensure_preparation_year_write();

create or replace function public.sync_academic_year_periods(target_year_id uuid, target_cycle_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare target_institution uuid; target_status public.academic_year_status; year_start date; year_end date;
declare system_name text; number_of_periods integer; period_index integer; period_start date; period_end date;
begin
  select institution_id, status, starts_on, ends_on into target_institution, target_status, year_start, year_end
  from public.academic_years where id = target_year_id;
  select period_system, period_count into system_name, number_of_periods from public.academic_cycles
  where id = target_cycle_id and institution_id = target_institution;
  if target_institution is null or system_name is null then raise exception 'invalid_year_or_cycle'; end if;
  if target_status <> 'preparation' then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(target_institution, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  delete from public.academic_periods where academic_year_id = target_year_id and cycle_id = target_cycle_id;
  for period_index in 1..number_of_periods loop
    period_start := year_start + (((year_end - year_start + 1) * (period_index - 1)) / number_of_periods);
    period_end := case when period_index = number_of_periods then year_end else year_start + (((year_end - year_start + 1) * period_index) / number_of_periods) - 1 end;
    insert into public.academic_periods(institution_id, academic_year_id, cycle_id, name, code, sequence, starts_on, ends_on)
    values(target_institution, target_year_id, target_cycle_id,
      case system_name when 'term' then period_index || case when period_index = 1 then 'er trimestre' else 'e trimestre' end
        when 'semester' then period_index || case when period_index = 1 then 'er semestre' else 'e semestre' end
        else 'Période ' || period_index end,
      'P' || period_index, period_index, period_start, period_end);
  end loop;
  return number_of_periods;
end;
$$;

create or replace function public.create_person_invitation(target_person_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare person_row public.people; raw_token text;
begin
  select * into person_row from public.people where id = target_person_id;
  if person_row.id is null or person_row.email is null then raise exception 'person_email_required'; end if;
  if not public.has_permission(person_row.institution_id, 'settings.access.manage') then raise exception 'permission_denied'; end if;
  update public.person_invitations set status = 'cancelled' where person_id = target_person_id and status = 'pending';
  raw_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.person_invitations(institution_id, person_id, email, token_hash, expires_at)
  values(person_row.institution_id, person_row.id, person_row.email, encode(extensions.digest(raw_token, 'sha256'), 'hex'), now() + interval '7 days');
  return raw_token;
end;
$$;

create or replace function public.sync_all_academic_year_periods(target_year_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare cycle_row record; total_count integer := 0;
begin
  for cycle_row in select distinct cycle_id from public.academic_year_levels where academic_year_id = target_year_id loop
    total_count := total_count + public.sync_academic_year_periods(target_year_id, cycle_row.cycle_id);
  end loop;
  return total_count;
end;
$$;

create or replace function public.save_person(
  target_institution_id uuid, target_person_id uuid, person_first_name text,
  person_last_name text, person_email text, person_phone text,
  person_status text, assigned_access_profile_ids uuid[]
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare saved_id uuid; profile_id uuid;
begin
  if not public.has_permission(target_institution_id, 'settings.access.manage') then raise exception 'permission_denied'; end if;
  if coalesce(array_length(assigned_access_profile_ids, 1), 0) = 0 then raise exception 'person_access_profile_required'; end if;
  foreach profile_id in array assigned_access_profile_ids loop
    if not exists (
      select 1 from public.access_profiles profile
      where profile.id = profile_id and profile.institution_id = target_institution_id and profile.is_active
    ) or not public.can_delegate_access_profile(profile_id) then
      raise exception 'access_profile_not_delegable';
    end if;
  end loop;
  if target_person_id is null then
    insert into public.people(institution_id, first_name, last_name, email, phone, status)
    values(target_institution_id, trim(person_first_name), trim(person_last_name), nullif(lower(trim(person_email)), ''), nullif(trim(person_phone), ''), person_status)
    returning id into saved_id;
  else
    update public.people set first_name=trim(person_first_name), last_name=trim(person_last_name),
      email=nullif(lower(trim(person_email)), ''), phone=nullif(trim(person_phone), ''), status=person_status
    where id=target_person_id and institution_id=target_institution_id returning id into saved_id;
    if saved_id is null then raise exception 'person_not_found'; end if;
  end if;
  delete from public.person_access_profiles where person_id=saved_id;
  insert into public.person_access_profiles(institution_id, person_id, access_profile_id, assigned_by)
  select target_institution_id, saved_id, requested_profile_id, (select auth.uid())
  from unnest(assigned_access_profile_ids) requested_profile_id;
  perform public.write_access_audit(
    target_institution_id, 'person.access_profiles_saved', 'person', saved_id, null,
    jsonb_build_object('accessProfileIds', assigned_access_profile_ids), null
  );
  return saved_id;
end;
$$;

create or replace function public.accept_person_invitation(raw_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invitation public.person_invitations; membership_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  select * into invitation from public.person_invitations
  where token_hash = encode(extensions.digest(raw_token, 'sha256'), 'hex') and status = 'pending' and expires_at > now() for update;
  if invitation.id is null then raise exception 'invalid_or_expired_invitation'; end if;
  if lower(coalesce((select auth.jwt() ->> 'email'), '')) <> lower(invitation.email) then raise exception 'invitation_email_mismatch'; end if;
  update public.people set auth_user_id = (select auth.uid()) where id = invitation.person_id and auth_user_id is null;
  if not exists (select 1 from public.person_access_profiles where person_id = invitation.person_id) then
    raise exception 'person_access_profile_required';
  end if;
  insert into public.memberships(institution_id, user_id, status, created_by)
  values(invitation.institution_id, (select auth.uid()), 'active', null)
  on conflict (institution_id, user_id) do update set status = 'active'
  returning id into membership_id;
  insert into public.membership_access_profiles(
    membership_id, access_profile_id, is_active, valid_from, valid_until, assigned_by
  )
  select membership_id, person_profile.access_profile_id, true, person_profile.valid_from,
    person_profile.valid_until, person_profile.assigned_by
  from public.person_access_profiles person_profile
  where person_profile.person_id = invitation.person_id
  on conflict (membership_id, access_profile_id) do update
    set is_active = true, valid_from = excluded.valid_from, valid_until = excluded.valid_until;
  update public.person_invitations set status = 'accepted', accepted_at = now() where id = invitation.id;
  return membership_id;
end;
$$;

create or replace function public.delete_person(target_person_id uuid, deletion_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare person_row public.people;
begin
  select * into person_row from public.people where id = target_person_id for update;
  if person_row.id is null then raise exception 'person_not_found'; end if;
  if not public.has_permission(person_row.institution_id, 'settings.access.manage') then raise exception 'permission_denied'; end if;
  if person_row.auth_user_id is not null then raise exception 'linked_person_cannot_be_deleted'; end if;
  perform public.write_access_audit(
    person_row.institution_id, 'person.deleted', 'person', person_row.id,
    jsonb_build_object('email', person_row.email), null, deletion_reason
  );
  delete from public.people where id = person_row.id;
end;
$$;

create or replace function public.list_teacher_candidates(target_institution_id uuid)
returns table(id uuid,first_name text,last_name text)
language plpgsql stable security definer set search_path='' as $$
begin
  if not (
    public.has_permission(target_institution_id,'schooling.classes.manage')
    or public.has_permission(target_institution_id,'settings.academic.manage')
  ) then raise exception 'permission_denied'; end if;
  return query
  select distinct person.id,person.first_name,person.last_name
  from public.people person
  join public.person_access_profiles person_profile on person_profile.person_id=person.id
  join public.access_profiles profile on profile.id=person_profile.access_profile_id
  where person.institution_id=target_institution_id
    and person.status='active'
    and profile.institution_id=target_institution_id
    and profile.code in('teacher','homeroom_teacher')
    and profile.is_active
    and person_profile.valid_from<=current_date
    and (person_profile.valid_until is null or person_profile.valid_until>=current_date)
  order by person.last_name,person.first_name;
end;
$$;

do $$ declare table_name text; begin
  foreach table_name in array array['people','person_access_profiles','person_invitations','academic_periods'] loop
    execute format('alter table public.%I enable row level security', table_name);
    if table_name = 'academic_periods' then
      execute format('create policy %I_select on public.%I for select to authenticated using (public.is_active_member(institution_id))', table_name, table_name);
      execute format('create policy %I_write on public.%I for all to authenticated using (public.has_permission(institution_id, ''settings.academic.manage'')) with check (public.has_permission(institution_id, ''settings.academic.manage''))', table_name, table_name);
      execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    else
      execute format('create policy %I_select on public.%I for select to authenticated using (public.has_permission(institution_id, ''settings.access.read''))', table_name, table_name);
      execute format('grant select on public.%I to authenticated', table_name);
      execute format('revoke insert, update, delete on public.%I from authenticated', table_name);
    end if;
    execute format('revoke all on public.%I from anon', table_name);
  end loop;
end $$;

revoke all on function public.sync_academic_year_periods(uuid, uuid) from public;
grant execute on function public.sync_academic_year_periods(uuid, uuid) to authenticated;
revoke all on function public.sync_all_academic_year_periods(uuid) from public;
grant execute on function public.sync_all_academic_year_periods(uuid) to authenticated;
revoke all on function public.create_person_invitation(uuid) from public;
grant execute on function public.create_person_invitation(uuid) to authenticated;
revoke all on function public.save_person(uuid, uuid, text, text, text, text, text, uuid[]) from public;
grant execute on function public.save_person(uuid, uuid, text, text, text, text, text, uuid[]) to authenticated;
revoke all on function public.accept_person_invitation(text) from public;
grant execute on function public.accept_person_invitation(text) to authenticated;
revoke all on function public.delete_person(uuid, text) from public;
grant execute on function public.delete_person(uuid, text) to authenticated;
revoke all on function public.list_teacher_candidates(uuid) from public;
grant execute on function public.list_teacher_candidates(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607160008_open_year_structure_edits.sql
-- -----------------------------------------------------------------------------

create policy academic_cycles_delete_admin on public.academic_cycles for delete to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
create policy grade_levels_delete_admin on public.grade_levels for delete to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
grant delete on public.academic_cycles, public.grade_levels to authenticated;

create or replace function public.set_academic_year_cycle_levels(
  target_year_id uuid, target_cycle_id uuid, target_level_ids uuid[]
)
returns integer language plpgsql security definer set search_path = '' as $$
declare target_institution_id uuid; target_status public.academic_year_status; inserted_count integer;
begin
  select institution_id, status into target_institution_id, target_status from public.academic_years where id = target_year_id;
  if target_institution_id is null then raise exception 'academic_year_not_found'; end if;
  if not public.has_institution_role(target_institution_id, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if target_status in ('closed', 'archived') then raise exception 'academic_year_configuration_locked'; end if;
  if not exists (select 1 from public.academic_cycles where id = target_cycle_id and institution_id = target_institution_id) then raise exception 'cycle_not_found'; end if;
  delete from public.academic_year_levels where academic_year_id = target_year_id and cycle_id = target_cycle_id;
  insert into public.academic_year_levels(institution_id, academic_year_id, cycle_id, level_id, cycle_name_snapshot, level_name_snapshot)
  select target_institution_id, target_year_id, target_cycle_id, level.id, '', '' from public.grade_levels level
  where level.id = any(coalesce(target_level_ids, array[]::uuid[])) and level.cycle_id = target_cycle_id
    and level.institution_id = target_institution_id and level.is_active;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.ensure_open_year_period_write()
returns trigger language plpgsql set search_path = '' as $$
declare year_id uuid; year_status public.academic_year_status;
begin
  year_id := case when tg_op = 'DELETE' then old.academic_year_id else new.academic_year_id end;
  select status into year_status from public.academic_years where id = year_id;
  if year_status in ('closed','archived') then raise exception 'academic_year_configuration_locked'; end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
drop trigger academic_periods_lock on public.academic_periods;
create trigger academic_periods_lock before insert or update or delete on public.academic_periods
for each row execute function public.ensure_open_year_period_write();

drop trigger annual_subjects_lock on public.annual_subjects;
create trigger annual_subjects_lock before insert or update or delete on public.annual_subjects
for each row execute function public.ensure_open_year_period_write();

create or replace function public.set_annual_level_subjects(target_year_level_id uuid, target_subject_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare annual_level public.academic_year_levels; year_status public.academic_year_status; changed_count integer;
begin
  select * into annual_level from public.academic_year_levels where id=target_year_level_id;
  if annual_level.id is null then raise exception 'annual_level_not_found'; end if;
  select status into year_status from public.academic_years where id=annual_level.academic_year_id;
  if year_status in ('closed','archived') then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(annual_level.institution_id, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  delete from public.annual_subjects where academic_year_level_id=annual_level.id
    and not (subject_id = any(coalesce(target_subject_ids, array[]::uuid[])));
  insert into public.annual_subjects(institution_id, academic_year_id, academic_year_level_id, subject_id, subject_name_snapshot)
  select annual_level.institution_id, annual_level.academic_year_id, annual_level.id, subject.id, ''
  from public.subjects subject where subject.institution_id=annual_level.institution_id and subject.is_active
    and subject.id=any(coalesce(target_subject_ids, array[]::uuid[]))
  on conflict (academic_year_id, academic_year_level_id, subject_id) do nothing;
  get diagnostics changed_count = row_count;
  return changed_count;
end;
$$;
revoke all on function public.set_annual_level_subjects(uuid, uuid[]) from public;
grant execute on function public.set_annual_level_subjects(uuid, uuid[]) to authenticated;

create or replace function public.sync_academic_year_periods(target_year_id uuid, target_cycle_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare target_institution uuid; target_status public.academic_year_status; year_start date; year_end date;
declare system_name text; number_of_periods integer; period_index integer; period_start date; period_end date;
begin
  select institution_id, status, starts_on, ends_on into target_institution, target_status, year_start, year_end from public.academic_years where id = target_year_id;
  select period_system, period_count into system_name, number_of_periods from public.academic_cycles where id = target_cycle_id and institution_id = target_institution;
  if target_institution is null or system_name is null then raise exception 'invalid_year_or_cycle'; end if;
  if target_status in ('closed','archived') then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(target_institution, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  delete from public.academic_periods where academic_year_id = target_year_id and cycle_id = target_cycle_id;
  for period_index in 1..number_of_periods loop
    period_start := year_start + (((year_end - year_start + 1) * (period_index - 1)) / number_of_periods);
    period_end := case when period_index = number_of_periods then year_end else year_start + (((year_end - year_start + 1) * period_index) / number_of_periods) - 1 end;
    insert into public.academic_periods(institution_id, academic_year_id, cycle_id, name, code, sequence, starts_on, ends_on)
    values(target_institution, target_year_id, target_cycle_id,
      case system_name when 'term' then period_index || case when period_index = 1 then 'er trimestre' else 'e trimestre' end
      when 'semester' then period_index || case when period_index = 1 then 'er semestre' else 'e semestre' end else 'Période ' || period_index end,
      'P' || period_index, period_index, period_start, period_end);
  end loop;
  return number_of_periods;
end;
$$;


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607160009_annual_cycles_and_code_uniqueness.sql
-- -----------------------------------------------------------------------------

alter table public.academic_cycles drop constraint if exists academic_cycles_institution_id_name_key;
alter table public.academic_cycles drop constraint if exists academic_cycles_institution_id_code_key;
alter table public.grade_levels drop constraint if exists grade_levels_cycle_id_name_key;
alter table public.grade_levels drop constraint if exists grade_levels_cycle_id_code_key;
alter table public.subjects drop constraint if exists subjects_institution_id_name_key;
alter table public.assessment_types drop constraint if exists assessment_types_academic_year_id_name_key;
alter table public.grading_formulas drop constraint if exists grading_formulas_academic_year_id_name_key;

alter table public.grading_formulas add column code text;
update public.grading_formulas set code = 'F' || row_number from (
  select id, row_number() over (partition by academic_year_id order by created_at, id) from public.grading_formulas
) numbered where grading_formulas.id = numbered.id;
alter table public.grading_formulas alter column code set not null;
alter table public.grading_formulas add constraint grading_formulas_year_code_unique unique (academic_year_id, code);

create table public.academic_year_cycles (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  cycle_id uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 80),
  code text not null check (code ~ '^[A-Z0-9_-]{1,20}$'),
  sort_order smallint not null default 0 check (sort_order >= 0),
  period_system text not null default 'term' check (period_system in ('term','semester','custom')),
  period_count smallint not null default 3 check (period_count between 1 and 6),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint annual_cycles_year_fk foreign key (academic_year_id, institution_id)
    references public.academic_years(id, institution_id) on delete cascade,
  constraint annual_cycles_catalog_fk foreign key (cycle_id, institution_id)
    references public.academic_cycles(id, institution_id) on delete restrict,
  unique (academic_year_id, cycle_id),
  unique (academic_year_id, code),
  unique (id, academic_year_id, cycle_id)
);
create index academic_year_cycles_year_order_idx on public.academic_year_cycles(academic_year_id, sort_order, name);

insert into public.academic_year_cycles(institution_id, academic_year_id, cycle_id, name, code, sort_order, period_system, period_count)
select distinct levels.institution_id, levels.academic_year_id, levels.cycle_id,
  cycle.name, cycle.code, cycle.sort_order, cycle.period_system, cycle.period_count
from public.academic_year_levels levels join public.academic_cycles cycle on cycle.id=levels.cycle_id
on conflict (academic_year_id, cycle_id) do nothing;

alter table public.academic_year_levels add column academic_year_cycle_id uuid;
alter table public.academic_year_levels add column level_code_snapshot text;
update public.academic_year_levels levels set
  academic_year_cycle_id = cycle.id,
  level_code_snapshot = catalog.code
from public.academic_year_cycles cycle, public.grade_levels catalog
where cycle.academic_year_id=levels.academic_year_id and cycle.cycle_id=levels.cycle_id and catalog.id=levels.level_id;
alter table public.academic_year_levels alter column academic_year_cycle_id set not null;
alter table public.academic_year_levels alter column level_code_snapshot set not null;
alter table public.academic_year_levels add constraint annual_levels_annual_cycle_fk
  foreign key (academic_year_cycle_id, academic_year_id, cycle_id)
  references public.academic_year_cycles(id, academic_year_id, cycle_id) on delete cascade;
alter table public.academic_year_levels add constraint annual_levels_year_code_unique
  unique (academic_year_id, level_code_snapshot);

create or replace function public.prepare_academic_year_level()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cycle_row public.academic_cycles; level_row public.grade_levels; annual_cycle_id uuid;
begin
  select * into cycle_row from public.academic_cycles where id=new.cycle_id and institution_id=new.institution_id;
  select * into level_row from public.grade_levels where id=new.level_id and cycle_id=new.cycle_id and institution_id=new.institution_id;
  select id into annual_cycle_id from public.academic_year_cycles where academic_year_id=new.academic_year_id and cycle_id=new.cycle_id;
  if cycle_row.id is null or level_row.id is null or annual_cycle_id is null then raise exception 'invalid_academic_structure'; end if;
  new.academic_year_cycle_id := annual_cycle_id;
  new.cycle_name_snapshot := cycle_row.name;
  new.level_name_snapshot := level_row.name;
  new.level_code_snapshot := level_row.code;
  new.sort_order := level_row.sort_order;
  return new;
end;
$$;

create or replace function public.save_academic_year_cycle(
  target_year_id uuid, target_annual_cycle_id uuid, cycle_name text, cycle_code text,
  cycle_sort_order smallint, cycle_period_system text, cycle_period_count smallint, cycle_is_active boolean
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare institution uuid; year_status public.academic_year_status; catalog_id uuid; saved_id uuid;
begin
  select institution_id, status into institution, year_status from public.academic_years where id=target_year_id;
  if institution is null then raise exception 'academic_year_not_found'; end if;
  if year_status in ('closed','archived') then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(institution, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if target_annual_cycle_id is null then
    insert into public.academic_cycles(institution_id,name,code,sort_order,period_system,period_count,is_active)
    values(institution,trim(cycle_name),upper(trim(cycle_code)),cycle_sort_order,cycle_period_system,cycle_period_count,cycle_is_active)
    returning id into catalog_id;
    insert into public.academic_year_cycles(institution_id,academic_year_id,cycle_id,name,code,sort_order,period_system,period_count,is_active)
    values(institution,target_year_id,catalog_id,trim(cycle_name),upper(trim(cycle_code)),cycle_sort_order,cycle_period_system,cycle_period_count,cycle_is_active)
    returning id into saved_id;
  else
    update public.academic_year_cycles set name=trim(cycle_name),code=upper(trim(cycle_code)),sort_order=cycle_sort_order,
      period_system=cycle_period_system,period_count=cycle_period_count,is_active=cycle_is_active
    where id=target_annual_cycle_id and academic_year_id=target_year_id returning id,cycle_id into saved_id,catalog_id;
    if saved_id is null then raise exception 'annual_cycle_not_found'; end if;
    update public.academic_cycles set name=trim(cycle_name),code=upper(trim(cycle_code)),sort_order=cycle_sort_order,
      period_system=cycle_period_system,period_count=cycle_period_count,is_active=cycle_is_active where id=catalog_id;
  end if;
  return saved_id;
end;
$$;

create or replace function public.set_academic_year_cycle_levels(
  target_year_id uuid, target_cycle_id uuid, target_level_ids uuid[]
)
returns integer language plpgsql security definer set search_path = '' as $$
declare target_institution_id uuid; target_status public.academic_year_status; inserted_count integer;
begin
  select institution_id,status into target_institution_id,target_status from public.academic_years where id=target_year_id;
  if target_institution_id is null then raise exception 'academic_year_not_found'; end if;
  if target_status in ('closed','archived') then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(target_institution_id,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if not exists(select 1 from public.academic_year_cycles where academic_year_id=target_year_id and cycle_id=target_cycle_id)
    then raise exception 'annual_cycle_not_found'; end if;
  delete from public.academic_year_levels where academic_year_id=target_year_id and cycle_id=target_cycle_id;
  insert into public.academic_year_levels(institution_id,academic_year_id,cycle_id,level_id,cycle_name_snapshot,level_name_snapshot)
  select target_institution_id,target_year_id,target_cycle_id,level.id,'','' from public.grade_levels level
  where level.id=any(coalesce(target_level_ids,array[]::uuid[])) and level.cycle_id=target_cycle_id
    and level.institution_id=target_institution_id and level.is_active;
  get diagnostics inserted_count=row_count;
  return inserted_count;
end;
$$;

create or replace function public.clone_academic_year_levels(source_year_id uuid, target_year_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare source_institution uuid; target_institution uuid; target_status public.academic_year_status; inserted_count integer;
begin
  select institution_id into source_institution from public.academic_years where id=source_year_id;
  select institution_id,status into target_institution,target_status from public.academic_years where id=target_year_id;
  if source_institution is null or target_institution is null or source_institution<>target_institution then raise exception 'incompatible_academic_years'; end if;
  if target_status<>'preparation' then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(target_institution,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  insert into public.academic_year_cycles(institution_id,academic_year_id,cycle_id,name,code,sort_order,period_system,period_count,is_active)
  select institution_id,target_year_id,cycle_id,name,code,sort_order,period_system,period_count,is_active
  from public.academic_year_cycles where academic_year_id=source_year_id
  on conflict (academic_year_id,cycle_id) do nothing;
  insert into public.academic_year_levels(institution_id,academic_year_id,cycle_id,level_id,cycle_name_snapshot,level_name_snapshot,level_code_snapshot,academic_year_cycle_id,is_active,cloned_from_id)
  select levels.institution_id,target_year_id,levels.cycle_id,levels.level_id,levels.cycle_name_snapshot,levels.level_name_snapshot,
    levels.level_code_snapshot,target_cycle.id,levels.is_active,levels.id
  from public.academic_year_levels levels join public.academic_year_cycles target_cycle
    on target_cycle.academic_year_id=target_year_id and target_cycle.cycle_id=levels.cycle_id
  where levels.academic_year_id=source_year_id on conflict (academic_year_id,level_id) do nothing;
  get diagnostics inserted_count=row_count;
  return inserted_count;
end;
$$;

alter table public.academic_year_cycles enable row level security;
create policy annual_cycles_select on public.academic_year_cycles for select to authenticated using(public.is_active_member(institution_id));
create policy annual_cycles_write on public.academic_year_cycles for all to authenticated
using(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]))
with check(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]));
grant select,insert,update,delete on public.academic_year_cycles to authenticated;
revoke all on public.academic_year_cycles from anon;
revoke all on function public.save_academic_year_cycle(uuid,uuid,text,text,smallint,text,smallint,boolean) from public;
grant execute on function public.save_academic_year_cycle(uuid,uuid,text,text,smallint,text,smallint,boolean) to authenticated;
create trigger academic_year_cycles_lock before insert or update or delete on public.academic_year_cycles
for each row execute function public.ensure_open_year_period_write();

create or replace function public.sync_all_academic_year_periods(target_year_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare cycle_row record; total_count integer:=0;
begin
  for cycle_row in select cycle_id from public.academic_year_cycles
    where academic_year_id=target_year_id and is_active loop
    total_count:=total_count+public.sync_academic_year_periods(target_year_id,cycle_row.cycle_id);
  end loop;
  return total_count;
end;
$$;

drop trigger assessment_types_lock on public.assessment_types;
create trigger assessment_types_lock before insert or update or delete on public.assessment_types
for each row execute function public.ensure_open_year_period_write();
drop trigger grading_formulas_lock on public.grading_formulas;
create trigger grading_formulas_lock before insert or update or delete on public.grading_formulas
for each row execute function public.ensure_open_year_period_write();

create or replace function public.clone_academic_year_configuration(
  source_year_id uuid,target_year_id uuid,include_structure boolean default true,include_subjects boolean default true,
  include_assessments boolean default true,include_finance boolean default true,include_users boolean default true
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare source_institution uuid;target_institution uuid;target_status public.academic_year_status;
declare structure_count integer:=0;subjects_count integer:=0;assessments_count integer:=0;formulas_count integer:=0;finance_count integer:=0;users_count integer:=0;
begin
  select institution_id into source_institution from public.academic_years where id=source_year_id;
  select institution_id,status into target_institution,target_status from public.academic_years where id=target_year_id;
  if source_institution is null or target_institution is null or source_institution<>target_institution then raise exception 'incompatible_academic_years'; end if;
  if source_year_id=target_year_id then raise exception 'source_and_target_must_differ'; end if;
  if target_status<>'preparation' then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(target_institution,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if include_structure then select public.clone_academic_year_levels(source_year_id,target_year_id) into structure_count; end if;
  if include_subjects then
    insert into public.annual_subjects(institution_id,academic_year_id,academic_year_level_id,subject_id,subject_name_snapshot,coefficient,weekly_hours)
    select s.institution_id,target_year_id,target_level.id,s.subject_id,s.subject_name_snapshot,s.coefficient,s.weekly_hours
    from public.annual_subjects s join public.academic_year_levels source_level on source_level.id=s.academic_year_level_id
    join public.academic_year_levels target_level on target_level.academic_year_id=target_year_id and target_level.level_id=source_level.level_id
    where s.academic_year_id=source_year_id on conflict (academic_year_id,academic_year_level_id,subject_id) do nothing;
    get diagnostics subjects_count=row_count;
  end if;
  if include_assessments then
    insert into public.assessment_types(institution_id,academic_year_id,name,code,weight,is_active)
    select institution_id,target_year_id,name,code,weight,is_active from public.assessment_types where academic_year_id=source_year_id
    on conflict (academic_year_id,code) do nothing; get diagnostics assessments_count=row_count;
    insert into public.grading_formulas(institution_id,academic_year_id,name,code,expression,description,is_default)
    select institution_id,target_year_id,name,code,expression,description,is_default from public.grading_formulas where academic_year_id=source_year_id
    on conflict (academic_year_id,code) do nothing; get diagnostics formulas_count=row_count;
  end if;
  if include_finance then
    insert into public.financial_rules(institution_id,academic_year_id,name,code,amount,due_day,frequency,is_active)
    select institution_id,target_year_id,name,code,amount,due_day,frequency,is_active from public.financial_rules where academic_year_id=source_year_id
    on conflict (academic_year_id,code) do nothing; get diagnostics finance_count=row_count;
  end if;
  if include_users then
    insert into public.academic_year_user_assignments(institution_id,academic_year_id,membership_id,responsibility,is_active)
    select institution_id,target_year_id,membership_id,responsibility,is_active from public.academic_year_user_assignments where academic_year_id=source_year_id
    on conflict (academic_year_id,membership_id) do nothing; get diagnostics users_count=row_count;
  end if;
  return jsonb_build_object('structure',structure_count,'subjects',subjects_count,'assessments',assessments_count,'formulas',formulas_count,'finance',finance_count,'users',users_count);
end;
$$;


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607160010_finish_settings_business_rules.sql
-- -----------------------------------------------------------------------------

alter table public.academic_cycles
  add column subjects_period_scope text not null default 'all' check(subjects_period_scope in ('all','selectable')),
  add column grading_scale numeric(6,2) not null default 20 check(grading_scale>0),
  add column pass_average numeric(6,2) not null default 10 check(pass_average>=0 and pass_average<=grading_scale),
  add column ranking_enabled boolean not null default true,
  add column absences_on_report boolean not null default true;

alter table public.academic_year_cycles
  add column subjects_period_scope text not null default 'all' check(subjects_period_scope in ('all','selectable')),
  add column grading_scale numeric(6,2) not null default 20 check(grading_scale>0),
  add column pass_average numeric(6,2) not null default 10 check(pass_average>=0 and pass_average<=grading_scale),
  add column ranking_enabled boolean not null default true,
  add column absences_on_report boolean not null default true;

alter table public.grade_levels
  add column capacity integer check(capacity is null or capacity>0),
  add column next_level_id uuid references public.grade_levels(id) on delete set null,
  add column repeat_allowed boolean not null default true;

alter table public.annual_subjects
  add column applies_all_periods boolean not null default true,
  add column period_ids uuid[] not null default '{}';

alter table public.financial_rules
  add column fee_type text not null default 'other' check(fee_type in ('enrollment','reenrollment','tuition','other')),
  add column is_mandatory boolean not null default true,
  add column discount_allowed boolean not null default false,
  add column amount_editable boolean not null default false,
  add column installment_count smallint not null default 1 check(installment_count between 1 and 12);

drop function public.save_academic_year_cycle(uuid,uuid,text,text,smallint,text,smallint,boolean);
create function public.save_academic_year_cycle(
  target_year_id uuid,target_annual_cycle_id uuid,cycle_name text,cycle_code text,
  cycle_sort_order smallint,cycle_period_system text,cycle_period_count smallint,cycle_is_active boolean,
  cycle_subjects_period_scope text,cycle_grading_scale numeric,cycle_pass_average numeric,
  cycle_ranking_enabled boolean,cycle_absences_on_report boolean
)
returns uuid language plpgsql security definer set search_path='' as $$
declare institution uuid;year_status public.academic_year_status;catalog_id uuid;saved_id uuid;
begin
  select institution_id,status into institution,year_status from public.academic_years where id=target_year_id;
  if institution is null then raise exception 'academic_year_not_found'; end if;
  if year_status in ('closed','archived') then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(institution,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if target_annual_cycle_id is null then
    insert into public.academic_cycles(institution_id,name,code,sort_order,period_system,period_count,is_active,subjects_period_scope,grading_scale,pass_average,ranking_enabled,absences_on_report)
    values(institution,trim(cycle_name),upper(trim(cycle_code)),cycle_sort_order,cycle_period_system,cycle_period_count,cycle_is_active,cycle_subjects_period_scope,cycle_grading_scale,cycle_pass_average,cycle_ranking_enabled,cycle_absences_on_report)
    returning id into catalog_id;
    insert into public.academic_year_cycles(institution_id,academic_year_id,cycle_id,name,code,sort_order,period_system,period_count,is_active,subjects_period_scope,grading_scale,pass_average,ranking_enabled,absences_on_report)
    values(institution,target_year_id,catalog_id,trim(cycle_name),upper(trim(cycle_code)),cycle_sort_order,cycle_period_system,cycle_period_count,cycle_is_active,cycle_subjects_period_scope,cycle_grading_scale,cycle_pass_average,cycle_ranking_enabled,cycle_absences_on_report)
    returning id into saved_id;
  else
    update public.academic_year_cycles set name=trim(cycle_name),code=upper(trim(cycle_code)),sort_order=cycle_sort_order,period_system=cycle_period_system,
      period_count=cycle_period_count,is_active=cycle_is_active,subjects_period_scope=cycle_subjects_period_scope,grading_scale=cycle_grading_scale,
      pass_average=cycle_pass_average,ranking_enabled=cycle_ranking_enabled,absences_on_report=cycle_absences_on_report
    where id=target_annual_cycle_id and academic_year_id=target_year_id returning id,cycle_id into saved_id,catalog_id;
    if saved_id is null then raise exception 'annual_cycle_not_found'; end if;
    update public.academic_cycles set name=trim(cycle_name),code=upper(trim(cycle_code)),sort_order=cycle_sort_order,period_system=cycle_period_system,
      period_count=cycle_period_count,is_active=cycle_is_active,subjects_period_scope=cycle_subjects_period_scope,grading_scale=cycle_grading_scale,
      pass_average=cycle_pass_average,ranking_enabled=cycle_ranking_enabled,absences_on_report=cycle_absences_on_report where id=catalog_id;
  end if;
  return saved_id;
end; $$;
revoke all on function public.save_academic_year_cycle(uuid,uuid,text,text,smallint,text,smallint,boolean,text,numeric,numeric,boolean,boolean) from public;
grant execute on function public.save_academic_year_cycle(uuid,uuid,text,text,smallint,text,smallint,boolean,text,numeric,numeric,boolean,boolean) to authenticated;

create table public.financial_rule_levels(
  financial_rule_id uuid not null references public.financial_rules(id) on delete cascade,
  academic_year_level_id uuid not null references public.academic_year_levels(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  primary key(financial_rule_id,academic_year_level_id),
  constraint financial_rule_levels_year_fk foreign key(academic_year_id,institution_id)
    references public.academic_years(id,institution_id) on delete cascade
);
alter table public.financial_rule_levels enable row level security;
create policy financial_rule_levels_select on public.financial_rule_levels for select to authenticated
  using(public.is_active_member(institution_id));
create policy financial_rule_levels_write on public.financial_rule_levels for all to authenticated
  using(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]))
  with check(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]));
create trigger financial_rule_levels_lock before insert or update or delete on public.financial_rule_levels
  for each row execute function public.ensure_open_year_period_write();
grant select,insert,update,delete on public.financial_rule_levels to authenticated;
revoke all on public.financial_rule_levels from anon;

create or replace function public.set_financial_rule_levels(target_rule_id uuid,target_level_ids uuid[])
returns integer language plpgsql security definer set search_path='' as $$
declare rule public.financial_rules; changed integer;
begin
  select * into rule from public.financial_rules where id=target_rule_id;
  if rule.id is null then raise exception 'financial_rule_not_found'; end if;
  if not public.has_institution_role(rule.institution_id,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if (select status from public.academic_years where id=rule.academic_year_id) in ('closed','archived') then raise exception 'academic_year_configuration_locked'; end if;
  delete from public.financial_rule_levels where financial_rule_id=rule.id;
  insert into public.financial_rule_levels(financial_rule_id,academic_year_level_id,institution_id,academic_year_id)
  select rule.id,level.id,rule.institution_id,rule.academic_year_id from public.academic_year_levels level
  where level.id=any(coalesce(target_level_ids,'{}'::uuid[])) and level.academic_year_id=rule.academic_year_id;
  get diagnostics changed=row_count;
  return changed;
end; $$;
revoke all on function public.set_financial_rule_levels(uuid,uuid[]) from public;
grant execute on function public.set_financial_rule_levels(uuid,uuid[]) to authenticated;

create or replace function public.validate_annual_subject_periods()
returns trigger language plpgsql set search_path='' as $$
declare cycle_scope text; valid_count integer;
begin
  select cycle.subjects_period_scope into cycle_scope
  from public.academic_year_levels level join public.academic_year_cycles cycle
    on cycle.id=level.academic_year_cycle_id where level.id=new.academic_year_level_id;
  if cycle_scope='all' then new.applies_all_periods:=true; new.period_ids:='{}'; end if;
  if not new.applies_all_periods then
    select count(*) into valid_count from public.academic_periods period
    where period.id=any(new.period_ids) and period.academic_year_id=new.academic_year_id;
    if cardinality(new.period_ids)=0 or valid_count<>cardinality(new.period_ids) then raise exception 'invalid_subject_periods'; end if;
  else new.period_ids:='{}'; end if;
  return new;
end; $$;
create trigger annual_subjects_validate_periods before insert or update on public.annual_subjects
  for each row execute function public.validate_annual_subject_periods();

create or replace function public.clone_academic_year_levels(source_year_id uuid,target_year_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare source_institution uuid;target_institution uuid;target_status public.academic_year_status;inserted_count integer;
begin
  select institution_id into source_institution from public.academic_years where id=source_year_id;
  select institution_id,status into target_institution,target_status from public.academic_years where id=target_year_id;
  if source_institution is null or target_institution is null or source_institution<>target_institution then raise exception 'incompatible_academic_years'; end if;
  if target_status<>'preparation' then raise exception 'academic_year_configuration_locked'; end if;
  if not public.has_institution_role(target_institution,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  insert into public.academic_year_cycles(institution_id,academic_year_id,cycle_id,name,code,sort_order,period_system,period_count,is_active,subjects_period_scope,grading_scale,pass_average,ranking_enabled,absences_on_report)
  select institution_id,target_year_id,cycle_id,name,code,sort_order,period_system,period_count,is_active,subjects_period_scope,grading_scale,pass_average,ranking_enabled,absences_on_report
  from public.academic_year_cycles where academic_year_id=source_year_id on conflict(academic_year_id,cycle_id) do nothing;
  insert into public.academic_year_levels(institution_id,academic_year_id,cycle_id,level_id,cycle_name_snapshot,level_name_snapshot,level_code_snapshot,academic_year_cycle_id,is_active,cloned_from_id)
  select levels.institution_id,target_year_id,levels.cycle_id,levels.level_id,levels.cycle_name_snapshot,levels.level_name_snapshot,levels.level_code_snapshot,target_cycle.id,levels.is_active,levels.id
  from public.academic_year_levels levels join public.academic_year_cycles target_cycle on target_cycle.academic_year_id=target_year_id and target_cycle.cycle_id=levels.cycle_id
  where levels.academic_year_id=source_year_id on conflict(academic_year_id,level_id) do nothing;
  get diagnostics inserted_count=row_count; return inserted_count;
end; $$;

create or replace function public.enforce_academic_year_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status='archived' and new.status<>old.status then raise exception 'archived_year_is_immutable'; end if;
  if old.status='closed' and new.status not in ('closed','archived') then raise exception 'closed_year_cannot_reopen'; end if;
  if new.status='open' and not exists(select 1 from public.academic_year_levels where academic_year_id=new.id and is_active)
    then raise exception 'academic_structure_required'; end if;
  return new;
end; $$;


-- -----------------------------------------------------------------------------
-- Source consolidée : 202607170011_cycle_catalog.sql
-- -----------------------------------------------------------------------------

create table public.cycle_catalog(
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  code text not null unique check(code ~ '^[A-Z0-9_-]{2,20}$'),
  description text,
  icon text not null default 'pi-book',
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.cycle_catalog(name,code,description,icon,sort_order) values
('Préscolaire','PRESCOLAIRE','Premières années et préparation au primaire','pi-sparkles',10),
('Primaire','PRIMAIRE','Enseignement primaire','pi-pencil',20),
('Collège','COLLEGE','Premier cycle du secondaire','pi-book',30),
('Lycée','LYCEE','Second cycle du secondaire','pi-graduation-cap',40);

create table public.institution_cycles(
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  catalog_cycle_id uuid not null references public.cycle_catalog(id) on delete restrict,
  academic_cycle_id uuid references public.academic_cycles(id) on delete restrict,
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(institution_id,catalog_cycle_id),
  unique(institution_id,academic_cycle_id)
);

insert into public.institution_cycles(institution_id,catalog_cycle_id,academic_cycle_id,sort_order,is_active)
select cycle.institution_id,catalog.id,cycle.id,cycle.sort_order,cycle.is_active
from public.academic_cycles cycle join public.cycle_catalog catalog on catalog.code=cycle.code
on conflict(institution_id,catalog_cycle_id) do nothing;

alter table public.cycle_catalog enable row level security;
alter table public.institution_cycles enable row level security;
create policy cycle_catalog_read on public.cycle_catalog for select to authenticated using(is_active);
create policy institution_cycles_read on public.institution_cycles for select to authenticated using(public.is_active_member(institution_id));
create policy institution_cycles_write on public.institution_cycles for all to authenticated
using(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]))
with check(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]));
grant select on public.cycle_catalog to authenticated;
grant select,insert,update on public.institution_cycles to authenticated;
revoke all on public.cycle_catalog,public.institution_cycles from anon;

create or replace function public.set_institution_cycle(target_institution_id uuid,target_catalog_cycle_id uuid,target_active boolean,target_year_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare catalog public.cycle_catalog;catalog_cycle uuid;activation_id uuid;annual_id uuid;
begin
  if not public.has_institution_role(target_institution_id,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  select * into catalog from public.cycle_catalog where id=target_catalog_cycle_id and is_active;
  if catalog.id is null then raise exception 'catalog_cycle_not_found'; end if;
  select academic_cycle_id into catalog_cycle from public.institution_cycles where institution_id=target_institution_id and catalog_cycle_id=catalog.id;
  if catalog_cycle is null and target_active then
    insert into public.academic_cycles(institution_id,name,code,sort_order,is_active)
    values(target_institution_id,catalog.name,catalog.code,catalog.sort_order,true) returning id into catalog_cycle;
  end if;
  insert into public.institution_cycles(institution_id,catalog_cycle_id,academic_cycle_id,sort_order,is_active)
  values(target_institution_id,catalog.id,catalog_cycle,catalog.sort_order,target_active)
  on conflict(institution_id,catalog_cycle_id) do update set is_active=excluded.is_active
  returning id into activation_id;
  if catalog_cycle is not null then update public.academic_cycles set is_active=target_active where id=catalog_cycle; end if;
  if target_active and target_year_id is not null and not exists(select 1 from public.academic_year_cycles where academic_year_id=target_year_id and cycle_id=catalog_cycle) then
    insert into public.academic_year_cycles(institution_id,academic_year_id,cycle_id,name,code,sort_order)
    values(target_institution_id,target_year_id,catalog_cycle,catalog.name,catalog.code,catalog.sort_order) returning id into annual_id;
  end if;
  return activation_id;
end; $$;
revoke all on function public.set_institution_cycle(uuid,uuid,boolean,uuid) from public;
grant execute on function public.set_institution_cycle(uuid,uuid,boolean,uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Catalogue GeEcole immuable : niveaux et matières
-- -----------------------------------------------------------------------------

create table public.grade_level_catalog (
  id uuid primary key default extensions.gen_random_uuid(),
  cycle_catalog_id uuid not null references public.cycle_catalog(id) on delete restrict,
  code text not null unique check (code ~ '^[A-Z0-9_-]{2,30}$'),
  name text not null check (char_length(trim(name)) between 2 and 80),
  short_name text not null check (char_length(trim(short_name)) between 1 and 30),
  description text,
  sort_order smallint not null default 0 check (sort_order >= 0),
  is_exam_level boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (cycle_catalog_id, sort_order)
);

insert into public.grade_level_catalog (
  cycle_catalog_id, code, name, short_name, description, sort_order, is_exam_level
)
select cycle.id, value.code, value.name, value.short_name, value.description, value.sort_order, value.is_exam_level
from public.cycle_catalog cycle
join (values
  ('PRESCOLAIRE','PRESCO_PS','Petite section','PS','Première année du préscolaire',10,false),
  ('PRESCOLAIRE','PRESCO_MS','Moyenne section','MS','Deuxième année du préscolaire',20,false),
  ('PRESCOLAIRE','PRESCO_GS','Grande section','GS','Dernière année du préscolaire',30,false),
  ('PRIMAIRE','PRIM_01','1ère année','CP1','Cours préparatoire 1',10,false),
  ('PRIMAIRE','PRIM_02','2ème année','CP2','Cours préparatoire 2',20,false),
  ('PRIMAIRE','PRIM_03','3ème année','CE1','Cours élémentaire 1',30,false),
  ('PRIMAIRE','PRIM_04','4ème année','CE2','Cours élémentaire 2',40,false),
  ('PRIMAIRE','PRIM_05','5ème année','CM1','Cours moyen 1',50,false),
  ('PRIMAIRE','PRIM_06','6ème année','CM2','Cours moyen 2 — niveau du CEE',60,true),
  ('COLLEGE','COLL_07','7ème année','7ème','Première année du collège',10,false),
  ('COLLEGE','COLL_08','8ème année','8ème','Deuxième année du collège',20,false),
  ('COLLEGE','COLL_09','9ème année','9ème','Troisième année du collège',30,false),
  ('COLLEGE','COLL_10','10ème année','10ème','Dernière année du collège — niveau du BEPC',40,true),
  ('LYCEE','LYC_11','11ème année','11ème','Première année du lycée',10,false),
  ('LYCEE','LYC_12','12ème année','12ème','Deuxième année du lycée',20,false),
  ('LYCEE','LYC_TLE','Terminale','Tle','Dernière année du lycée — niveau du Baccalauréat unique',30,true)
) as value(cycle_code, code, name, short_name, description, sort_order, is_exam_level)
  on value.cycle_code = cycle.code;

create table public.subject_catalog (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{2,30}$'),
  name text not null check (char_length(trim(name)) between 2 and 100),
  category text not null check (category in ('language','science','humanities','arts','physical','technology','citizenship','preschool','other')),
  description text,
  sort_order smallint not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.subject_catalog(code,name,category,description,sort_order) values
  ('LANGAGE','Langage et expression','preschool','Communication orale et découverte du langage',10),
  ('PRE_MATHS','Prémathématiques','preschool','Premières notions de nombre, forme et espace',20),
  ('GRAPHISME','Graphisme et préécriture','preschool','Préparation au geste graphique et à l’écriture',30),
  ('EVEIL','Éveil et découverte du monde','preschool','Observation de l’environnement et activités d’éveil',40),
  ('MOTRICITE','Motricité','physical','Développement moteur et coordination',50),
  ('FRANCAIS','Français','language','Langue française, lecture et expression',100),
  ('MATHEMATIQUES','Mathématiques','science','Nombres, calcul, géométrie et raisonnement',110),
  ('ANGLAIS','Anglais','language','Langue anglaise',120),
  ('ARABE','Arabe','language','Langue arabe proposée selon le projet de l’établissement',130),
  ('SCIENCES_OBS','Sciences d’observation','science','Découverte scientifique au primaire',140),
  ('BIOLOGIE','Biologie','science','Sciences de la vie',150),
  ('PHYSIQUE','Physique','science','Sciences physiques',160),
  ('CHIMIE','Chimie','science','Sciences chimiques',170),
  ('HISTOIRE','Histoire','humanities','Histoire de la Guinée, de l’Afrique et du monde',180),
  ('GEOGRAPHIE','Géographie','humanities','Géographie de la Guinée, de l’Afrique et du monde',190),
  ('ECM','Éducation civique et morale','citizenship','Citoyenneté, civisme et vie collective',200),
  ('PHILOSOPHIE','Philosophie','humanities','Philosophie et réflexion critique',210),
  ('ECONOMIE','Économie','humanities','Notions et sciences économiques',220),
  ('SOCIOLOGIE','Sociologie','humanities','Notions de sociologie et étude de la société',230),
  ('INFORMATIQUE','Informatique','technology','Culture numérique et informatique',240),
  ('TECHNOLOGIE','Technologie','technology','Initiation technologique',250),
  ('EPS','Éducation physique et sportive','physical','Activités physiques et sportives',260),
  ('ARTS','Éducation artistique','arts','Dessin, musique et expression artistique',270),
  ('TECH_EXPRESSION','Techniques d’expression','language','Expression écrite et orale',280);

create table public.subject_catalog_cycles (
  subject_catalog_id uuid not null references public.subject_catalog(id) on delete cascade,
  cycle_catalog_id uuid not null references public.cycle_catalog(id) on delete cascade,
  is_recommended boolean not null default true,
  primary key (subject_catalog_id, cycle_catalog_id)
);

insert into public.subject_catalog_cycles(subject_catalog_id,cycle_catalog_id)
select subject.id, cycle.id
from public.subject_catalog subject
cross join public.cycle_catalog cycle
where
  (cycle.code = 'PRESCOLAIRE' and subject.code in ('LANGAGE','PRE_MATHS','GRAPHISME','EVEIL','MOTRICITE','ARTS'))
  or (cycle.code = 'PRIMAIRE' and subject.code in ('FRANCAIS','MATHEMATIQUES','SCIENCES_OBS','HISTOIRE','GEOGRAPHIE','ECM','EPS','ARTS','ANGLAIS','ARABE','INFORMATIQUE'))
  or (cycle.code = 'COLLEGE' and subject.code in ('FRANCAIS','MATHEMATIQUES','ANGLAIS','ARABE','BIOLOGIE','PHYSIQUE','CHIMIE','HISTOIRE','GEOGRAPHIE','ECM','INFORMATIQUE','TECHNOLOGIE','EPS','ARTS','TECH_EXPRESSION'))
  or (cycle.code = 'LYCEE' and subject.code in ('FRANCAIS','MATHEMATIQUES','ANGLAIS','ARABE','BIOLOGIE','PHYSIQUE','CHIMIE','HISTOIRE','GEOGRAPHIE','ECM','PHILOSOPHIE','ECONOMIE','SOCIOLOGIE','INFORMATIQUE','EPS','TECH_EXPRESSION'));

alter table public.grade_levels
  add column catalog_id uuid references public.grade_level_catalog(id) on delete restrict;
create unique index grade_levels_institution_catalog_idx
  on public.grade_levels(institution_id,catalog_id) where catalog_id is not null;

alter table public.subjects
  add column catalog_id uuid references public.subject_catalog(id) on delete restrict;
create unique index subjects_institution_catalog_idx
  on public.subjects(institution_id,catalog_id) where catalog_id is not null;

alter table public.grade_level_catalog enable row level security;
alter table public.subject_catalog enable row level security;
alter table public.subject_catalog_cycles enable row level security;
create policy grade_level_catalog_read on public.grade_level_catalog for select to authenticated using(is_active);
create policy subject_catalog_read on public.subject_catalog for select to authenticated using(is_active);
create policy subject_catalog_cycles_read on public.subject_catalog_cycles for select to authenticated
  using(exists(select 1 from public.subject_catalog subject where subject.id=subject_catalog_id and subject.is_active));
grant select on public.grade_level_catalog,public.subject_catalog,public.subject_catalog_cycles to authenticated;
revoke all on public.grade_level_catalog,public.subject_catalog,public.subject_catalog_cycles from anon;

create or replace function public.install_grade_level_catalog(target_institution_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare inserted_count integer;
begin
  if not public.has_institution_role(target_institution_id,array['owner','admin']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  insert into public.grade_levels(institution_id,cycle_id,catalog_id,name,code,sort_order,is_active)
  select target_institution_id,activation.academic_cycle_id,level.id,level.name,level.code,level.sort_order,true
  from public.grade_level_catalog level
  join public.institution_cycles activation
    on activation.catalog_cycle_id=level.cycle_catalog_id
   and activation.institution_id=target_institution_id
   and activation.is_active
   and activation.academic_cycle_id is not null
  where level.is_active
  on conflict(institution_id,code) do nothing;
  get diagnostics inserted_count=row_count;
  return inserted_count;
end; $$;

create or replace function public.install_subject_catalog(target_institution_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare inserted_count integer;
begin
  if not public.has_institution_role(target_institution_id,array['owner','admin']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  insert into public.subjects(institution_id,catalog_id,name,code,is_active)
  select target_institution_id,id,name,code,true from public.subject_catalog where is_active
  on conflict(institution_id,code) do nothing;
  get diagnostics inserted_count=row_count;
  return inserted_count;
end; $$;

revoke all on function public.install_grade_level_catalog(uuid) from public;
revoke all on function public.install_subject_catalog(uuid) from public;
grant execute on function public.install_grade_level_catalog(uuid) to authenticated;
grant execute on function public.install_subject_catalog(uuid) to authenticated;
