alter table public.grading_formulas
  add column if not exists definition jsonb not null default '{"method":"weighted_average","missing_grade_policy":"ignore","components":[]}'::jsonb,
  add column if not exists is_active boolean not null default true,
  add column if not exists version integer not null default 1,
  add column if not exists updated_at timestamptz not null default now();

alter table public.grading_formulas
  drop constraint if exists grading_formulas_definition_check;

alter table public.grading_formulas
  add constraint grading_formulas_definition_check check (
    definition ? 'method'
    and definition ? 'missing_grade_policy'
    and definition ? 'components'
    and definition->>'method' = 'weighted_average'
    and definition->>'missing_grade_policy' in ('ignore', 'block')
    and jsonb_typeof(definition->'components') = 'array'
  );

create unique index if not exists grading_formulas_year_code_unique
  on public.grading_formulas (institution_id, academic_year_id, upper(code));

create unique index if not exists grading_formulas_one_default_per_year
  on public.grading_formulas (institution_id, academic_year_id)
  where is_default and is_active;

create or replace function public.touch_grading_formula_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.definition is distinct from new.definition then
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

comment on column public.grading_formulas.definition is
  'School-owned structured calculation definition. GeeCole executes this definition but does not impose its weights.';
comment on column public.grading_formulas.version is
  'Automatically incremented whenever the structured definition changes.';
comment on column public.grading_formulas.expression is
  'Legacy readable snapshot kept for compatibility; definition is the calculation source of truth.';
