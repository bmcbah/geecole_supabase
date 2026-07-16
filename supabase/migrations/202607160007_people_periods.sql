alter type public.app_role add value if not exists 'parent';
alter type public.app_role add value if not exists 'student';

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

create table public.person_roles (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (person_id, role)
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
  if not public.has_institution_role(person_row.institution_id, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
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
  person_status text, assigned_roles public.app_role[]
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare saved_id uuid;
begin
  if not public.has_institution_role(target_institution_id, array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if coalesce(array_length(assigned_roles, 1), 0) = 0 then raise exception 'person_role_required'; end if;
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
  delete from public.person_roles where person_id=saved_id;
  insert into public.person_roles(institution_id, person_id, role)
  select target_institution_id, saved_id, role from unnest(assigned_roles) role;
  return saved_id;
end;
$$;

create or replace function public.accept_person_invitation(raw_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invitation public.person_invitations; assigned_role public.app_role; membership_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  select * into invitation from public.person_invitations
  where token_hash = encode(extensions.digest(raw_token, 'sha256'), 'hex') and status = 'pending' and expires_at > now() for update;
  if invitation.id is null then raise exception 'invalid_or_expired_invitation'; end if;
  if lower(coalesce((select auth.jwt() ->> 'email'), '')) <> lower(invitation.email) then raise exception 'invitation_email_mismatch'; end if;
  update public.people set auth_user_id = (select auth.uid()) where id = invitation.person_id and auth_user_id is null;
  select role into assigned_role from public.person_roles where person_id = invitation.person_id
  order by case role::text when 'owner' then 1 when 'admin' then 2 when 'secretary' then 3 when 'finance' then 4 when 'teacher' then 5 when 'parent' then 6 else 7 end limit 1;
  if assigned_role is null then raise exception 'person_role_required'; end if;
  insert into public.memberships(institution_id, user_id, role)
  values(invitation.institution_id, (select auth.uid()), assigned_role)
  on conflict (institution_id, user_id) do update set status = 'active'
  returning id into membership_id;
  update public.person_invitations set status = 'accepted', accepted_at = now() where id = invitation.id;
  return membership_id;
end;
$$;

do $$ declare table_name text; begin
  foreach table_name in array array['people','person_roles','person_invitations','academic_periods'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I_select on public.%I for select to authenticated using (public.is_active_member(institution_id))', table_name, table_name);
    execute format('create policy %I_write on public.%I for all to authenticated using (public.has_institution_role(institution_id, array[''owner'',''admin'']::public.app_role[])) with check (public.has_institution_role(institution_id, array[''owner'',''admin'']::public.app_role[]))', table_name, table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('revoke all on public.%I from anon', table_name);
  end loop;
end $$;

revoke all on function public.sync_academic_year_periods(uuid, uuid) from public;
grant execute on function public.sync_academic_year_periods(uuid, uuid) to authenticated;
revoke all on function public.sync_all_academic_year_periods(uuid) from public;
grant execute on function public.sync_all_academic_year_periods(uuid) to authenticated;
revoke all on function public.create_person_invitation(uuid) from public;
grant execute on function public.create_person_invitation(uuid) to authenticated;
revoke all on function public.save_person(uuid, uuid, text, text, text, text, text, public.app_role[]) from public;
grant execute on function public.save_person(uuid, uuid, text, text, text, text, text, public.app_role[]) to authenticated;
revoke all on function public.accept_person_invitation(text) from public;
grant execute on function public.accept_person_invitation(text) to authenticated;
