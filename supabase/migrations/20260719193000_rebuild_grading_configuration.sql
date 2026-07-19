-- Rebuild propre du catalogue des types et des formules.
-- Cette migration remplace les migrations 20260719183000, 20260719190000 et 20260719191000.

-- Nettoyage d'une éventuelle application partielle de l'ancien modèle séparé.
drop table if exists public.grading_formula_assignments cascade;
drop function if exists public.touch_grading_formula_assignment_updated_at();

alter table public.assessment_types
  add column if not exists description text,
  add column if not exists icon text not null default 'pi pi-file-edit',
  add column if not exists color text not null default '#64748b',
  add column if not exists sort_order integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

update public.assessment_types
set weight = 1
where weight is distinct from 1;

create unique index if not exists assessment_types_year_code_unique
  on public.assessment_types (institution_id, academic_year_id, upper(code));

create index if not exists assessment_types_year_sort_idx
  on public.assessment_types (academic_year_id, sort_order, name);

create or replace function public.touch_assessment_type_updated_at()
returns trigger
language plpgsql
security invoker
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

-- La formule et son affectation sont un seul objet métier.
alter table public.grading_formulas
  add column if not exists definition jsonb not null default '{"language_version":1,"variables":[],"missing_grade_policy":"block"}'::jsonb,
  add column if not exists is_active boolean not null default true,
  add column if not exists version integer not null default 1,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists academic_year_cycle_id uuid references public.academic_year_cycles(id) on delete cascade,
  add column if not exists academic_year_level_id uuid references public.academic_year_levels(id) on delete cascade,
  add column if not exists annual_subject_id uuid references public.annual_subjects(id) on delete cascade,
  add column if not exists temporal_scope text not null default 'year',
  add column if not exists period_index integer;

alter table public.grading_formulas
  alter column expression set not null;

alter table public.grading_formulas
  drop constraint if exists grading_formulas_definition_check,
  drop constraint if exists grading_formulas_temporal_scope_check;

alter table public.grading_formulas
  add constraint grading_formulas_definition_check check (
    definition ? 'language_version'
    and definition ? 'variables'
    and definition ? 'missing_grade_policy'
    and jsonb_typeof(definition->'variables') = 'array'
    and definition->>'missing_grade_policy' in ('ignore', 'block')
  ),
  add constraint grading_formulas_temporal_scope_check check (
    (temporal_scope = 'year' and period_index is null)
    or (temporal_scope = 'period' and period_index is not null and period_index > 0)
  );

create unique index if not exists grading_formulas_year_code_unique
  on public.grading_formulas (institution_id, academic_year_id, upper(code));

drop index if exists public.grading_formulas_one_default_per_year;
create unique index grading_formulas_one_default_per_scope
  on public.grading_formulas (
    institution_id,
    academic_year_id,
    coalesce(academic_year_cycle_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(academic_year_level_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(annual_subject_id, '00000000-0000-0000-0000-000000000000'::uuid),
    temporal_scope,
    coalesce(period_index, 0)
  )
  where is_default and is_active;

create index if not exists grading_formulas_resolution_idx
  on public.grading_formulas (
    academic_year_id,
    annual_subject_id,
    academic_year_level_id,
    academic_year_cycle_id,
    temporal_scope,
    period_index
  )
  where is_active;

create or replace function public.touch_grading_formula_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.expression is distinct from new.expression
     or old.definition is distinct from new.definition then
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
comment on column public.grading_formulas.period_index is
  'Numéro de période dans le calendrier du cycle ; null lorsque la formule couvre toute l’année.';
comment on column public.assessment_types.weight is
  'Champ historique neutralisé à 1 ; il ne participe plus aux calculs.';
