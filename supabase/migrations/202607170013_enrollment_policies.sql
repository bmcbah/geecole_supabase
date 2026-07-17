create table public.enrollment_policies (
  institution_id uuid primary key references public.institutions(id) on delete cascade,
  allow_pre_registration boolean not null default true,
  allow_direct_enrollment boolean not null default true,
  require_payment_before_confirmation boolean not null default false,
  require_class_assignment boolean not null default false,
  count_pre_registration_in_capacity boolean not null default false,
  capacity_mode text not null default 'warning' check (capacity_mode in ('information','warning','blocking')),
  allow_missing_documents boolean not null default true,
  student_number_pattern text not null default 'EL-{YYYY}-{SEQ}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger enrollment_policies_set_updated_at before update on public.enrollment_policies
  for each row execute function public.set_updated_at();
alter table public.enrollment_policies enable row level security;
create policy enrollment_policies_select_member on public.enrollment_policies for select to authenticated
  using (public.is_active_member(institution_id));
create policy enrollment_policies_manage_admin on public.enrollment_policies for all to authenticated
  using (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]))
  with check (public.has_institution_role(institution_id, array['owner','admin']::public.app_role[]));
grant select, insert, update on public.enrollment_policies to authenticated;
revoke all on public.enrollment_policies from anon;

insert into public.enrollment_policies (institution_id)
select id from public.institutions on conflict do nothing;

create or replace function public.ensure_enrollment_policy()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.enrollment_policies (institution_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger institutions_create_enrollment_policy after insert on public.institutions
  for each row execute function public.ensure_enrollment_policy();

create or replace function public.enforce_enrollment_policy()
returns trigger language plpgsql set search_path = '' as $$
declare policy public.enrollment_policies%rowtype;
begin
  select * into policy from public.enrollment_policies where institution_id = new.institution_id;
  if new.status = 'pre_registered' and not policy.allow_pre_registration then
    raise exception 'pre_registration_disabled';
  end if;
  if new.status = 'confirmed' and not policy.allow_direct_enrollment then
    raise exception 'direct_enrollment_disabled';
  end if;
  return new;
end;
$$;
create trigger enrollments_enforce_policy before insert or update of status on public.enrollments
  for each row execute function public.enforce_enrollment_policy();
