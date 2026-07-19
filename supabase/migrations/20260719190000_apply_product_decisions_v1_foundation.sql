-- GeeCole — socle technique des décisions produit V1
-- Migration additive : ne modifie aucune migration déjà partagée.

-- V1-006 — Une seule année scolaire ouverte à la fois par établissement.
create unique index if not exists academic_years_one_open_per_institution_idx
  on public.academic_years (institution_id)
  where status = 'open';

-- V1-007 / V1-014 — Les exigences documentaires sont configurables et
-- l'espace documentaire couvre aussi les documents scolaires générés.
alter table public.document_requirements
  add column if not exists is_required boolean not null default false,
  add column if not exists used_in_enrollment boolean not null default true,
  add column if not exists missing_document_policy text not null default 'incomplete';

update public.document_requirements
set
  is_required = coalesce(required_for_confirmation, false),
  used_in_enrollment = coalesce(required_for_pre_registration, false)
    or coalesce(required_for_confirmation, false)
where is_required = false
  and used_in_enrollment = true;

alter table public.document_requirements
  drop constraint if exists document_requirements_missing_document_policy_check;

alter table public.document_requirements
  add constraint document_requirements_missing_document_policy_check
  check (missing_document_policy in ('information', 'incomplete', 'blocking'));

alter table public.student_documents
  add column if not exists category text not null default 'administrative',
  add column if not exists title text,
  add column if not exists generated_by_geecole boolean not null default false,
  add column if not exists generated_document_type text;

alter table public.student_documents
  drop constraint if exists student_documents_category_check;

alter table public.student_documents
  add constraint student_documents_category_check
  check (
    category in (
      'administrative',
      'report_card',
      'grade_transcript',
      'certificate',
      'other_school_document'
    )
  );

-- Les documents générés par GeeCole ne dépendent pas nécessairement d'une
-- exigence administrative configurée par l'établissement.
alter table public.student_documents
  alter column requirement_id drop not null;

-- V1-008 / V1-009 — Un parent est réutilisé avant d'être recréé.
-- Le téléphone reste l'identifiant principal ; l'email est facultatif.
alter table public.guardians
  add column if not exists email text;

create unique index if not exists guardians_institution_phone_unique_idx
  on public.guardians (institution_id, regexp_replace(primary_phone, '\\s+', '', 'g'));

create index if not exists guardians_institution_email_idx
  on public.guardians (institution_id, lower(email))
  where email is not null;

create or replace function public.find_parent_by_contact(
  p_institution_id uuid,
  p_phone text,
  p_email text default null
)
returns setof public.guardians
language sql
stable
security invoker
set search_path = public
as $$
  select g.*
  from public.guardians g
  where g.institution_id = p_institution_id
    and (
      regexp_replace(g.primary_phone, '\\s+', '', 'g') = regexp_replace(p_phone, '\\s+', '', 'g')
      or (
        p_email is not null
        and g.email is not null
        and lower(g.email) = lower(p_email)
      )
    )
  order by
    case
      when regexp_replace(g.primary_phone, '\\s+', '', 'g') = regexp_replace(p_phone, '\\s+', '', 'g') then 0
      else 1
    end,
    g.updated_at desc;
$$;

comment on function public.find_parent_by_contact(uuid, text, text) is
  'Recherche un parent existant par téléphone, puis par email facultatif, avant création.';

-- V1-010 — La fratrie est calculée à partir des parents partagés.
create or replace view public.student_siblings
with (security_invoker = true)
as
select distinct
  sg1.student_id,
  sg2.student_id as sibling_student_id,
  sg1.guardian_id as shared_parent_id
from public.student_guardians sg1
join public.student_guardians sg2
  on sg2.guardian_id = sg1.guardian_id
 and sg2.student_id <> sg1.student_id;

comment on view public.student_siblings is
  'Fratrie calculée : deux élèves sont liés lorsqu’ils partagent au moins un parent.';

-- V1-004 — Le mode d'organisation des classes est configuré par année/niveau.
alter table public.academic_year_levels
  add column if not exists class_organization_mode text not null default 'multiple_classes',
  add column if not exists configuration jsonb not null default '{}'::jsonb;

alter table public.academic_year_levels
  drop constraint if exists academic_year_levels_class_organization_mode_check;

alter table public.academic_year_levels
  add constraint academic_year_levels_class_organization_mode_check
  check (class_organization_mode in ('level_is_class', 'multiple_classes'));

alter table public.school_classes
  add column if not exists section text,
  add column if not exists code_is_generated boolean not null default true;

-- La salle et la capacité sont déjà facultatives. Le code peut désormais être
-- généré par le service applicatif au lieu d'être demandé à l'utilisateur.
alter table public.school_classes
  alter column code drop not null;

-- V1-005 — L'affectation reste un acte séparé de la création d'une classe.
-- On bloque les affectations vers une classe inactive.
create or replace function public.ensure_active_class_assignment()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  class_is_active boolean;
begin
  select sc.is_active
  into class_is_active
  from public.school_classes sc
  where sc.id = new.class_id;

  if class_is_active is distinct from true then
    raise exception 'La classe cible doit être active.';
  end if;

  return new;
end;
$$;

drop trigger if exists class_assignments_require_active_class on public.class_assignments;
create trigger class_assignments_require_active_class
before insert or update of class_id
on public.class_assignments
for each row
execute function public.ensure_active_class_assignment();

-- V1-006 — Une année clôturée conserve son historique : les modifications
-- ordinaires de sa structure pédagogique sont refusées.
create or replace function public.prevent_closed_year_structure_changes()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_year_id uuid;
  target_status public.academic_year_status;
begin
  target_year_id := coalesce(new.academic_year_id, old.academic_year_id);

  select ay.status
  into target_status
  from public.academic_years ay
  where ay.id = target_year_id;

  if target_status in ('closed', 'archived') then
    raise exception 'La structure pédagogique d’une année clôturée ou archivée ne peut plus être modifiée.';
  end if;

  return coalesce(new, old);
end;
$$;

do $$
begin
  if to_regclass('public.academic_year_levels') is not null then
    execute 'drop trigger if exists academic_year_levels_lock_closed_year on public.academic_year_levels';
    execute 'create trigger academic_year_levels_lock_closed_year before insert or update or delete on public.academic_year_levels for each row execute function public.prevent_closed_year_structure_changes()';
  end if;

  if to_regclass('public.school_classes') is not null then
    execute 'drop trigger if exists school_classes_lock_closed_year on public.school_classes';
    execute 'create trigger school_classes_lock_closed_year before insert or update or delete on public.school_classes for each row execute function public.prevent_closed_year_structure_changes()';
  end if;
end
$$;

-- V1-011 / V1-012 — Les inscriptions préparées ou réinscrites conservent leur
-- origine et leur inscription source. Ces colonnes existent déjà ; on renforce
-- les valeurs métier autorisées sans casser les données historiques.
alter table public.enrollments
  drop constraint if exists enrollments_origin_product_v1_check;

alter table public.enrollments
  add constraint enrollments_origin_product_v1_check
  check (
    origin in (
      'manual',
      'direct_enrollment',
      'pre_registration',
      'reenrollment',
      'import'
    )
  ) not valid;

-- Les permissions suivent les politiques RLS des tables sous-jacentes.
grant execute on function public.find_parent_by_contact(uuid, text, text) to authenticated;
grant select on public.student_siblings to authenticated;
