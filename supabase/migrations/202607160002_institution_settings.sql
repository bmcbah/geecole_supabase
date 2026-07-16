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
