create table public.cycle_responsibility_types (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  code text not null check (code ~ '^[A-Z0-9_-]{2,40}$'),
  description text,
  can_validate_bulletins boolean not null default false,
  can_manage_periods boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, code)
);

create table public.cycle_responsibilities (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null,
  cycle_id uuid not null,
  responsibility_type_id uuid not null references public.cycle_responsibility_types(id) on delete restrict,
  person_id uuid not null references public.people(id) on delete restrict,
  capacity text not null default 'holder' check (capacity in ('holder', 'acting', 'deputy')),
  starts_on date not null,
  ends_on date,
  replaced_person_id uuid references public.people(id) on delete restrict,
  status text not null default 'active' check (status in ('draft', 'active', 'closed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cycle_responsibilities_dates check (ends_on is null or starts_on <= ends_on),
  constraint cycle_responsibilities_year_fk foreign key (academic_year_id, institution_id)
    references public.academic_years(id, institution_id) on delete cascade,
  constraint cycle_responsibilities_cycle_fk foreign key (cycle_id, institution_id)
    references public.academic_cycles(id, institution_id) on delete restrict,
  constraint cycle_responsibilities_replacement check (
    (capacity = 'acting' and replaced_person_id is not null)
    or (capacity <> 'acting' and replaced_person_id is null)
  )
);

create index cycle_responsibilities_scope_idx
  on public.cycle_responsibilities(institution_id, academic_year_id, cycle_id, status);
create unique index cycle_responsibilities_one_active_holder_idx
  on public.cycle_responsibilities(academic_year_id, cycle_id, responsibility_type_id)
  where status = 'active' and capacity = 'holder';

create trigger cycle_responsibility_types_set_updated_at before update on public.cycle_responsibility_types
for each row execute function public.set_updated_at();
create trigger cycle_responsibilities_set_updated_at before update on public.cycle_responsibilities
for each row execute function public.set_updated_at();

insert into public.cycle_responsibility_types(
  institution_id, name, code, description, can_validate_bulletins, can_manage_periods
)
select institution.id, defaults.name, defaults.code, defaults.description,
       defaults.can_validate_bulletins, defaults.can_manage_periods
from public.institutions institution
cross join (values
  ('Responsable de cycle', 'CYCLE_MANAGER', 'Responsable principal du cycle.', true, true),
  ('Responsable pédagogique', 'PEDAGOGICAL_MANAGER', 'Coordonne le suivi pédagogique du cycle.', true, false),
  ('Censeur', 'CENSEUR', 'Fonction de suivi pédagogique du secondaire.', true, true),
  ('Principal', 'PRINCIPAL', 'Responsable du collège.', true, true),
  ('Proviseur', 'PROVISEUR', 'Responsable du lycée.', true, true),
  ('Directeur des études', 'STUDIES_DIRECTOR', 'Coordonne les études et les validations pédagogiques.', true, true)
) as defaults(name, code, description, can_validate_bulletins, can_manage_periods)
on conflict (institution_id, code) do nothing;

alter table public.cycle_responsibility_types enable row level security;
alter table public.cycle_responsibilities enable row level security;

create policy cycle_responsibility_types_read on public.cycle_responsibility_types
for select to authenticated using (public.is_active_member(institution_id));
create policy cycle_responsibility_types_write on public.cycle_responsibility_types
for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
create policy cycle_responsibilities_read on public.cycle_responsibilities
for select to authenticated using (public.is_active_member(institution_id));
create policy cycle_responsibilities_write on public.cycle_responsibilities
for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));

grant select, insert, update, delete on public.cycle_responsibility_types to authenticated;
grant select, insert, update, delete on public.cycle_responsibilities to authenticated;
revoke all on public.cycle_responsibility_types, public.cycle_responsibilities from anon;
