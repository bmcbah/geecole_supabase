create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('owner', 'admin', 'secretary', 'teacher', 'finance');
create type public.membership_status as enum ('active', 'suspended');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.institutions (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  phone text,
  email text,
  address text,
  currency text not null default 'GNF' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Africa/Conakry',
  locale text not null default 'fr-GN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (institution_id, user_id)
);

create index memberships_user_id_idx on public.memberships(user_id);
create index memberships_institution_status_idx on public.memberships(institution_id, status);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger institutions_set_updated_at before update on public.institutions for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_active_member(target_institution_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where institution_id = target_institution_id and user_id = (select auth.uid()) and status = 'active'
  );
$$;

create or replace function public.has_institution_role(target_institution_id uuid, allowed_roles public.app_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where institution_id = target_institution_id and user_id = (select auth.uid())
      and status = 'active' and role = any(allowed_roles)
  );
$$;

create or replace function public.create_institution(institution_name text, institution_slug text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  insert into public.institutions (name, slug)
  values (trim(institution_name), lower(trim(institution_slug))) returning id into new_id;
  insert into public.memberships (institution_id, user_id, role)
  values (new_id, (select auth.uid()), 'owner');
  return new_id;
end;
$$;

revoke all on function public.create_institution(text, text) from public;
grant execute on function public.create_institution(text, text) to authenticated;
revoke all on function public.is_active_member(uuid) from public;
grant execute on function public.is_active_member(uuid) to authenticated;
revoke all on function public.has_institution_role(uuid, public.app_role[]) from public;
grant execute on function public.has_institution_role(uuid, public.app_role[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.institutions enable row level security;
alter table public.memberships enable row level security;

create policy profiles_select_self on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy institutions_select_member on public.institutions for select to authenticated using (public.is_active_member(id));
create policy institutions_update_admin on public.institutions for update to authenticated using (public.has_institution_role(id, array['owner','admin']::public.app_role[])) with check (public.has_institution_role(id, array['owner','admin']::public.app_role[]));

create policy memberships_select_member on public.memberships for select to authenticated using (public.is_active_member(institution_id));
create policy memberships_insert_admin on public.memberships for insert to authenticated with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
create policy memberships_update_admin on public.memberships for update to authenticated using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[])) with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
create policy memberships_delete_owner on public.memberships for delete to authenticated using (public.has_institution_role(institution_id, array['owner']::public.app_role[]) and role <> 'owner');
