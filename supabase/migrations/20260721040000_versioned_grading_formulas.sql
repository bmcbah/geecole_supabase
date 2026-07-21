-- Versioned, guided grading formulas. A formula applies to a cycle or a level,
-- never to a period. Level assignments override cycle assignments.

create table public.assessment_type_catalog (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  default_scale numeric(6,2) not null default 20 check (default_scale > 0),
  sort_order smallint not null default 0,
  is_active boolean not null default true
);

insert into public.assessment_type_catalog(code,name,description,sort_order) values
  ('INTERRO','Interrogation','Contrôle court écrit ou oral',10),
  ('DEVOIR','Devoir','Travail évalué en classe',20),
  ('DS','Devoir surveillé','Épreuve surveillée',30),
  ('DM','Devoir à domicile','Travail réalisé hors classe',40),
  ('EVALUATION','Évaluation','Évaluation pédagogique générique',50),
  ('COMPO','Composition','Composition de fin de période',60),
  ('EXAM','Examen','Examen interne',70),
  ('EXAM-BLANC','Examen blanc','Préparation au DEF ou au Baccalauréat',80),
  ('ORAL','Évaluation orale','Interrogation ou présentation orale',90),
  ('TP','Travaux pratiques','Travail pratique évalué',100),
  ('TD','Travaux dirigés','Exercices dirigés évalués',110),
  ('PROJET','Projet','Projet individuel ou collectif',120),
  ('EXPOSE','Exposé','Présentation préparée',130),
  ('CONTINU','Contrôle continu','Résultat consolidé du contrôle continu',140),
  ('RATTRAPAGE','Rattrapage','Évaluation de remplacement',150);

alter table public.assessment_types
  add column if not exists catalog_id uuid references public.assessment_type_catalog(id) on delete restrict;

create table public.grading_formula_series (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  code text not null,
  name text not null,
  formula_type text not null default 'course_average' check (formula_type in ('course_average')),
  description text,
  created_at timestamptz not null default now(),
  constraint grading_formula_series_year_fk foreign key (academic_year_id,institution_id)
    references public.academic_years(id,institution_id) on delete cascade,
  unique(academic_year_id,code)
);

create table public.grading_formula_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  series_id uuid not null references public.grading_formula_series(id) on delete cascade,
  version integer not null check (version > 0),
  rules jsonb not null default '{"expression":"","rounding":2}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint grading_formula_versions_year_fk foreign key (academic_year_id,institution_id)
    references public.academic_years(id,institution_id) on delete cascade,
  constraint grading_formula_rules_shape check (
    jsonb_typeof(rules)='object'
    and length(trim(coalesce(rules->>'expression',''))) between 1 and 1000
    and coalesce((rules->>'rounding')::integer,2) between 0 and 4
  ),
  unique(series_id,version)
);

create table public.grading_formula_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  formula_version_id uuid not null references public.grading_formula_versions(id) on delete restrict,
  cycle_id uuid references public.academic_cycles(id) on delete cascade,
  academic_year_level_id uuid references public.academic_year_levels(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint grading_formula_assignment_scope check (
    (cycle_id is not null)::integer + (academic_year_level_id is not null)::integer = 1
  ),
  constraint grading_formula_assignments_year_fk foreign key (academic_year_id,institution_id)
    references public.academic_years(id,institution_id) on delete cascade
);

create unique index grading_formula_assignment_cycle_active_idx
  on public.grading_formula_assignments(academic_year_id,cycle_id) where is_active and cycle_id is not null;
create unique index grading_formula_assignment_level_active_idx
  on public.grading_formula_assignments(academic_year_id,academic_year_level_id) where is_active and academic_year_level_id is not null;

create or replace function public.prevent_formula_version_mutation()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception 'grading_formula_version_is_immutable';
end; $$;
create trigger grading_formula_versions_immutable before update or delete on public.grading_formula_versions
for each row execute function public.prevent_formula_version_mutation();

create or replace function public.validate_grading_formula_data()
returns trigger language plpgsql set search_path='' as $$
declare expected_institution uuid; expected_year uuid; scope_institution uuid; scope_year uuid;
begin
  if tg_table_name='grading_formula_versions' then
    select institution_id,academic_year_id into expected_institution,expected_year
    from public.grading_formula_series where id=new.series_id;
    if expected_institution is distinct from new.institution_id or expected_year is distinct from new.academic_year_id then
      raise exception 'formula_series_context_mismatch';
    end if;
  else
    select institution_id,academic_year_id into expected_institution,expected_year
    from public.grading_formula_versions where id=new.formula_version_id;
    if new.cycle_id is not null then
      select institution_id,null::uuid into scope_institution,scope_year from public.academic_cycles where id=new.cycle_id;
    else
      select institution_id,academic_year_id into scope_institution,scope_year from public.academic_year_levels where id=new.academic_year_level_id;
    end if;
    if expected_institution is distinct from new.institution_id or expected_year is distinct from new.academic_year_id
      or scope_institution is distinct from new.institution_id
      or (new.academic_year_level_id is not null and scope_year is distinct from new.academic_year_id) then
      raise exception 'formula_assignment_context_mismatch';
    end if;
  end if;
  return new;
end; $$;
create trigger grading_formula_versions_validate before insert on public.grading_formula_versions
for each row execute function public.validate_grading_formula_data();
create trigger grading_formula_assignments_validate before insert or update on public.grading_formula_assignments
for each row execute function public.validate_grading_formula_data();

create or replace function public.install_assessment_type_catalog(target_institution_id uuid,target_year_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare inserted_count integer;
begin
  if not public.has_institution_role(target_institution_id,array['owner','admin']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  insert into public.assessment_types(institution_id,academic_year_id,catalog_id,name,code,weight,scale,is_active)
  select target_institution_id,target_year_id,id,name,code,1,default_scale,true
  from public.assessment_type_catalog where is_active
  on conflict(academic_year_id,code) do nothing;
  get diagnostics inserted_count=row_count;
  return inserted_count;
end; $$;

alter table public.assessment_type_catalog enable row level security;
create policy assessment_type_catalog_read on public.assessment_type_catalog for select to authenticated using(is_active);
grant select on public.assessment_type_catalog to authenticated;
grant execute on function public.install_assessment_type_catalog(uuid,uuid) to authenticated;

do $$ declare table_name text; begin
  foreach table_name in array array['grading_formula_series','grading_formula_versions','grading_formula_assignments'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('create policy %I_select on public.%I for select to authenticated using(public.is_active_member(institution_id))',table_name,table_name);
    execute format('create policy %I_write on public.%I for all to authenticated using(public.has_institution_role(institution_id,array[''owner'',''admin'']::public.app_role[])) with check(public.has_institution_role(institution_id,array[''owner'',''admin'']::public.app_role[]))',table_name,table_name);
    execute format('grant select,insert,update,delete on public.%I to authenticated',table_name);
  end loop;
end $$;

create trigger grading_formula_series_lock before insert or update or delete on public.grading_formula_series
for each row execute function public.ensure_preparation_year_write();
create trigger grading_formula_versions_lock before insert on public.grading_formula_versions
for each row execute function public.ensure_preparation_year_write();
create trigger grading_formula_assignments_lock before insert or update or delete on public.grading_formula_assignments
for each row execute function public.ensure_preparation_year_write();
