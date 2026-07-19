-- Reconstruction du catalogue d'évaluation et des formules à partir du schéma réel.
-- La migration est rejouable sur une base propre ou partiellement modifiée.

begin;

-- Nettoyage de l'ancien modèle d'affectation séparé, jamais retenu fonctionnellement.
drop table if exists public.grading_formula_assignments cascade;
drop function if exists public.touch_grading_formula_assignment_updated_at();

-- Types d'évaluation : enrichissement uniquement, sans pondération métier.
alter table public.assessment_types
  add column if not exists description text,
  add column if not exists icon text not null default 'pi pi-file-edit',
  add column if not exists color text not null default '#64748b',
  add column if not exists sort_order integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

update public.assessment_types set weight = 1 where weight is distinct from 1;

create index if not exists assessment_types_year_sort_idx
  on public.assessment_types (academic_year_id, sort_order, name);

create or replace function public.touch_assessment_type_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists assessment_types_touch_updated_at on public.assessment_types;
create trigger assessment_types_touch_updated_at
before update on public.assessment_types
for each row execute function public.touch_assessment_type_updated_at();

-- Formule et périmètre sont un seul objet métier.
-- Une formule s'applique obligatoirement à toute l'année ou à une période réelle.
alter table public.grading_formulas
  drop constraint if exists grading_formulas_definition_check;
alter table public.grading_formulas
  drop constraint if exists grading_formulas_temporal_scope_check;

alter table public.grading_formulas
  add column if not exists definition jsonb,
  add column if not exists is_active boolean not null default true,
  add column if not exists version integer not null default 1,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists academic_year_cycle_id uuid,
  add column if not exists academic_year_level_id uuid,
  add column if not exists annual_subject_id uuid,
  add column if not exists temporal_scope text,
  add column if not exists period_id uuid;

-- Retire la tentative précédente fondée sur un numéro de période.
alter table public.grading_formulas drop column if exists period_index;

-- Convertit toutes les anciennes définitions avant de poser le nouveau CHECK.
update public.grading_formulas
set definition = jsonb_build_object(
      'language_version', 1,
      'variables', '[]'::jsonb,
      'missing_grade_policy', case
        when definition->>'missing_grade_policy' in ('ignore', 'block')
          then definition->>'missing_grade_policy'
        else 'block'
      end
    ),
    temporal_scope = coalesce(temporal_scope, 'year')
where definition is null
   or not (definition ? 'language_version')
   or not (definition ? 'variables')
   or not (definition ? 'missing_grade_policy');

update public.grading_formulas
set temporal_scope = 'year', period_id = null
where temporal_scope is null or temporal_scope not in ('year', 'period');

alter table public.grading_formulas
  alter column definition set default '{"language_version":1,"variables":[],"missing_grade_policy":"block"}'::jsonb,
  alter column definition set not null,
  alter column temporal_scope set default 'year',
  alter column temporal_scope set not null,
  alter column expression set not null;

-- Ajout des FK après nettoyage des colonnes.
alter table public.grading_formulas
  drop constraint if exists grading_formulas_academic_year_cycle_id_fkey,
  drop constraint if exists grading_formulas_academic_year_level_id_fkey,
  drop constraint if exists grading_formulas_annual_subject_id_fkey,
  drop constraint if exists grading_formulas_period_id_fkey;

alter table public.grading_formulas
  add constraint grading_formulas_academic_year_cycle_id_fkey
    foreign key (academic_year_cycle_id) references public.academic_year_cycles(id) on delete cascade,
  add constraint grading_formulas_academic_year_level_id_fkey
    foreign key (academic_year_level_id) references public.academic_year_levels(id) on delete cascade,
  add constraint grading_formulas_annual_subject_id_fkey
    foreign key (annual_subject_id) references public.annual_subjects(id) on delete cascade,
  add constraint grading_formulas_period_id_fkey
    foreign key (period_id) references public.academic_periods(id) on delete cascade;

alter table public.grading_formulas
  add constraint grading_formulas_definition_check check (
    definition ? 'language_version'
    and definition ? 'variables'
    and definition ? 'missing_grade_policy'
    and jsonb_typeof(definition->'variables') = 'array'
    and definition->>'missing_grade_policy' in ('ignore', 'block')
  ),
  add constraint grading_formulas_temporal_scope_check check (
    (temporal_scope = 'year' and period_id is null)
    or (temporal_scope = 'period' and period_id is not null)
  );

-- Valide la cohérence établissement / année / cycle / niveau / matière / période.
create or replace function public.validate_grading_formula_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  selected_cycle public.academic_year_cycles%rowtype;
  selected_level public.academic_year_levels%rowtype;
  selected_subject public.annual_subjects%rowtype;
  selected_period public.academic_periods%rowtype;
begin
  if new.academic_year_cycle_id is not null then
    select * into selected_cycle from public.academic_year_cycles where id = new.academic_year_cycle_id;
    if selected_cycle.id is null
       or selected_cycle.institution_id <> new.institution_id
       or selected_cycle.academic_year_id <> new.academic_year_id then
      raise exception 'invalid_grading_formula_cycle';
    end if;
  end if;

  if new.academic_year_level_id is not null then
    select * into selected_level from public.academic_year_levels where id = new.academic_year_level_id;
    if selected_level.id is null
       or selected_level.institution_id <> new.institution_id
       or selected_level.academic_year_id <> new.academic_year_id
       or (new.academic_year_cycle_id is not null and selected_level.academic_year_cycle_id <> new.academic_year_cycle_id) then
      raise exception 'invalid_grading_formula_level';
    end if;
  end if;

  if new.annual_subject_id is not null then
    select * into selected_subject from public.annual_subjects where id = new.annual_subject_id;
    if selected_subject.id is null
       or selected_subject.institution_id <> new.institution_id
       or selected_subject.academic_year_id <> new.academic_year_id
       or (new.academic_year_level_id is not null and selected_subject.academic_year_level_id <> new.academic_year_level_id) then
      raise exception 'invalid_grading_formula_subject';
    end if;
  end if;

  if new.temporal_scope = 'period' then
    select * into selected_period from public.academic_periods where id = new.period_id;
    if selected_period.id is null
       or selected_period.institution_id <> new.institution_id
       or selected_period.academic_year_id <> new.academic_year_id
       or (selected_cycle.id is not null and selected_period.cycle_id <> selected_cycle.cycle_id) then
      raise exception 'invalid_grading_formula_period';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists grading_formulas_validate_scope on public.grading_formulas;
create trigger grading_formulas_validate_scope
before insert or update on public.grading_formulas
for each row execute function public.validate_grading_formula_scope();

-- Supprime les anciennes règles de défaut globales, incompatibles avec les périmètres.
drop index if exists public.grading_formulas_one_default_idx;
drop index if exists public.grading_formulas_one_default_per_year;
drop index if exists public.grading_formulas_one_default_per_scope;

create unique index grading_formulas_one_default_per_scope
  on public.grading_formulas (
    institution_id,
    academic_year_id,
    coalesce(academic_year_cycle_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(academic_year_level_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(annual_subject_id, '00000000-0000-0000-0000-000000000000'::uuid),
    temporal_scope,
    coalesce(period_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where is_default and is_active;

create index if not exists grading_formulas_resolution_idx
  on public.grading_formulas (
    academic_year_id,
    annual_subject_id,
    academic_year_level_id,
    academic_year_cycle_id,
    temporal_scope,
    period_id
  )
  where is_active;

create or replace function public.touch_grading_formula_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.expression is distinct from new.expression
     or old.definition is distinct from new.definition
     or old.academic_year_cycle_id is distinct from new.academic_year_cycle_id
     or old.academic_year_level_id is distinct from new.academic_year_level_id
     or old.annual_subject_id is distinct from new.annual_subject_id
     or old.temporal_scope is distinct from new.temporal_scope
     or old.period_id is distinct from new.period_id then
    new.version = old.version + 1;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists grading_formulas_touch_updated_at on public.grading_formulas;
create trigger grading_formulas_touch_updated_at
before update on public.grading_formulas
for each row execute function public.touch_grading_formula_updated_at();

comment on column public.grading_formulas.expression is
  'Source de vérité écrite par l’établissement, par exemple (EVAL + COMP * 2) / 3.';
comment on column public.grading_formulas.temporal_scope is
  'Périmètre temporel obligatoire : year ou period.';
comment on column public.grading_formulas.period_id is
  'Période réelle du calendrier académique ; null lorsque la formule couvre toute l’année.';
comment on column public.assessment_types.weight is
  'Champ historique neutralisé à 1 ; il ne participe plus aux calculs.';

commit;
