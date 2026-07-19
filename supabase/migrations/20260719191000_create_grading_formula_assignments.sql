alter table public.grading_formulas
  alter column expression set not null;

comment on column public.grading_formulas.expression is
  'Source of truth written by the school with assessment type codes, for example (EVAL + COMP * 2) / 3.';

create table if not exists public.grading_formula_assignments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  grading_formula_id uuid not null references public.grading_formulas(id) on delete restrict,
  academic_cycle_id uuid references public.academic_cycles(id) on delete cascade,
  academic_year_level_id uuid references public.academic_year_levels(id) on delete cascade,
  annual_subject_id uuid references public.annual_subjects(id) on delete cascade,
  period_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grading_formula_assignment_scope_check check (
    academic_cycle_id is not null
    or academic_year_level_id is not null
    or annual_subject_id is not null
    or period_code is not null
  )
);

create unique index if not exists grading_formula_assignment_scope_unique
  on public.grading_formula_assignments (
    institution_id,
    academic_year_id,
    coalesce(academic_cycle_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(academic_year_level_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(annual_subject_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(period_code, '')
  )
  where is_active;

create index if not exists grading_formula_assignments_resolution_idx
  on public.grading_formula_assignments (
    academic_year_id,
    annual_subject_id,
    academic_year_level_id,
    academic_cycle_id,
    period_code
  )
  where is_active;

alter table public.grading_formula_assignments enable row level security;

create policy grading_formula_assignments_read
  on public.grading_formula_assignments
  for select
  using (public.is_institution_member(institution_id));

create policy grading_formula_assignments_manage
  on public.grading_formula_assignments
  for all
  using (public.has_institution_role(institution_id, array['owner', 'admin']::public.app_role[]))
  with check (public.has_institution_role(institution_id, array['owner', 'admin']::public.app_role[]));

create or replace function public.touch_grading_formula_assignment_updated_at()
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

create trigger grading_formula_assignments_touch_updated_at
before update on public.grading_formula_assignments
for each row execute function public.touch_grading_formula_assignment_updated_at();
