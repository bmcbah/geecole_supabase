alter table public.assessment_types
  add column if not exists description text,
  add column if not exists icon text not null default 'pi pi-file-edit',
  add column if not exists color text not null default '#64748b',
  add column if not exists sort_order integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

comment on column public.assessment_types.weight is
  'Legacy field kept for compatibility. Evaluation weighting is configured in grading formulas.';

comment on column public.assessment_types.icon is
  'PrimeIcons class used to identify the evaluation type in the interface.';

comment on column public.assessment_types.color is
  'Hex color used to identify the evaluation type in the interface.';

comment on column public.assessment_types.sort_order is
  'School-defined display order for the evaluation type.';

update public.assessment_types
set sort_order = ranked.position
from (
  select id, row_number() over (
    partition by institution_id, academic_year_id
    order by name, created_at
  ) - 1 as position
  from public.assessment_types
) ranked
where public.assessment_types.id = ranked.id
  and public.assessment_types.sort_order = 0;

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
