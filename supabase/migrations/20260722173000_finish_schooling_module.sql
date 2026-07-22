-- Compléments finaux du module Scolarité. Migration additive et non destructive.

alter table public.institutions
  add column if not exists schooling_capacity_mode text not null default 'warning'
    check (schooling_capacity_mode in ('information','warning','blocking'));

create table if not exists public.schooling_notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid references public.academic_years(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  guardian_id uuid references public.guardians(id) on delete set null,
  channel text not null check (channel in ('in_app','sms','email','whatsapp')),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','sent','failed','cancelled')),
  sent_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.student_medical_profiles (
  student_id uuid primary key references public.students(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  blood_group text,
  allergies text,
  chronic_conditions text,
  emergency_instructions text,
  confidential_notes text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_import_batches (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  file_name text not null,
  status text not null default 'draft' check (status in ('draft','validated','importing','completed','failed')),
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  error_rows integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.student_import_rows (
  id uuid primary key default extensions.gen_random_uuid(),
  batch_id uuid not null references public.student_import_batches(id) on delete cascade,
  row_number integer not null,
  raw_data jsonb not null,
  normalized_data jsonb,
  status text not null default 'pending' check (status in ('pending','valid','error','imported','skipped')),
  errors text[] not null default '{}',
  student_id uuid references public.students(id) on delete set null,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  unique(batch_id,row_number)
);

create table if not exists public.student_certificates (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  enrollment_id uuid references public.enrollments(id) on delete restrict,
  certificate_type text not null check (certificate_type in ('enrollment','schooling','transfer','withdrawal')),
  reference text not null,
  issued_at timestamptz not null default now(),
  issued_by uuid references auth.users(id),
  revoked_at timestamptz,
  revocation_reason text,
  snapshot jsonb not null,
  unique(institution_id,reference)
);

create index if not exists schooling_notifications_student_idx on public.schooling_notifications(student_id,created_at desc);
create index if not exists student_import_batches_year_idx on public.student_import_batches(academic_year_id,created_at desc);
create index if not exists student_import_rows_batch_status_idx on public.student_import_rows(batch_id,status);
create index if not exists student_certificates_student_idx on public.student_certificates(student_id,issued_at desc);

create or replace function public.find_probable_student_duplicates(
  target_institution_id uuid,
  target_first_name text,
  target_last_name text,
  target_birth_date date default null,
  target_limit integer default 10
) returns table(student_id uuid, matricule text, first_name text, last_name text, birth_date date, score integer)
language sql security definer set search_path='' as $$
  select s.id,s.matricule,s.first_name,s.last_name,s.birth_date,
    (case when lower(trim(s.first_name))=lower(trim(target_first_name)) then 35 else 0 end
     + case when lower(trim(s.last_name))=lower(trim(target_last_name)) then 45 else 0 end
     + case when target_birth_date is not null and s.birth_date=target_birth_date then 20 else 0 end)::integer as score
  from public.students s
  where s.institution_id=target_institution_id
    and public.is_active_member(target_institution_id)
    and (
      lower(s.first_name) like '%'||lower(trim(target_first_name))||'%'
      or lower(s.last_name) like '%'||lower(trim(target_last_name))||'%'
      or (target_birth_date is not null and s.birth_date=target_birth_date)
    )
  order by score desc,s.last_name,s.first_name
  limit greatest(1,least(coalesce(target_limit,10),50));
$$;

create or replace function public.batch_assign_enrollments_to_class(
  target_enrollment_ids uuid[],
  target_class_id uuid,
  change_reason text default null
) returns table(enrollment_id uuid, success boolean, error_code text)
language plpgsql security definer set search_path='' as $$
declare
  target_class public.school_classes%rowtype;
  item uuid;
  current_count integer;
  capacity_mode text;
begin
  select * into target_class from public.school_classes where id=target_class_id and is_active;
  if not found then raise exception 'class_not_found'; end if;
  if not public.has_institution_role(target_class.institution_id,array['owner','admin','secretary']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  select schooling_capacity_mode into capacity_mode from public.institutions where id=target_class.institution_id;
  select count(*) into current_count from public.class_assignments where class_id=target_class_id and ends_on is null;
  foreach item in array target_enrollment_ids loop
    begin
      if target_class.capacity is not null and capacity_mode='blocking' and current_count>=target_class.capacity then
        enrollment_id:=item; success:=false; error_code:='class_capacity_reached'; return next; continue;
      end if;
      perform public.assign_enrollment_to_class(item,target_class_id,nullif(trim(change_reason),''));
      current_count:=current_count+1;
      enrollment_id:=item; success:=true; error_code:=null; return next;
    exception when others then
      enrollment_id:=item; success:=false; error_code:=sqlerrm; return next;
    end;
  end loop;
end; $$;

create or replace function public.issue_student_certificate(
  target_enrollment_id uuid,
  target_type text
) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  e public.enrollments%rowtype;
  s public.students%rowtype;
  cert_id uuid;
  cert_ref text;
begin
  select * into e from public.enrollments where id=target_enrollment_id;
  if not found then raise exception 'enrollment_not_found'; end if;
  if not public.has_institution_role(e.institution_id,array['owner','admin','secretary']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if target_type not in ('enrollment','schooling','transfer','withdrawal') then raise exception 'invalid_certificate_type'; end if;
  select * into s from public.students where id=e.student_id;
  cert_ref:=upper(substr(target_type,1,3))||'-'||to_char(current_date,'YYYY')||'-'||lpad(nextval('public.student_matricule_sequence')::text,6,'0');
  insert into public.student_certificates(institution_id,academic_year_id,student_id,enrollment_id,certificate_type,reference,issued_by,snapshot)
  values(e.institution_id,e.academic_year_id,e.student_id,e.id,target_type,cert_ref,(select auth.uid()),jsonb_build_object(
    'student_name',trim(s.first_name||' '||s.last_name),'matricule',s.matricule,'level',e.level_name_snapshot,
    'cycle',e.cycle_name_snapshot,'admission_date',e.admission_date,'status',e.status
  )) returning id into cert_id;
  return cert_id;
end; $$;

revoke all on function public.find_probable_student_duplicates(uuid,text,text,date,integer) from public;
revoke all on function public.batch_assign_enrollments_to_class(uuid[],uuid,text) from public;
revoke all on function public.issue_student_certificate(uuid,text) from public;
grant execute on function public.find_probable_student_duplicates(uuid,text,text,date,integer) to authenticated;
grant execute on function public.batch_assign_enrollments_to_class(uuid[],uuid,text) to authenticated;
grant execute on function public.issue_student_certificate(uuid,text) to authenticated;

alter table public.schooling_notifications enable row level security;
alter table public.student_medical_profiles enable row level security;
alter table public.student_import_batches enable row level security;
alter table public.student_import_rows enable row level security;
alter table public.student_certificates enable row level security;

create policy schooling_notifications_member on public.schooling_notifications for select to authenticated using(public.is_active_member(institution_id));
create policy schooling_notifications_admin on public.schooling_notifications for all to authenticated using(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[])) with check(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[]));
create policy medical_profiles_restricted on public.student_medical_profiles for all to authenticated using(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[])) with check(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[]));
create policy import_batches_admin on public.student_import_batches for all to authenticated using(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[])) with check(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[]));
create policy import_rows_admin on public.student_import_rows for all to authenticated using(exists(select 1 from public.student_import_batches b where b.id=batch_id and public.has_institution_role(b.institution_id,array['owner','admin','secretary']::public.app_role[]))) with check(exists(select 1 from public.student_import_batches b where b.id=batch_id and public.has_institution_role(b.institution_id,array['owner','admin','secretary']::public.app_role[])));
create policy certificates_member on public.student_certificates for select to authenticated using(public.is_active_member(institution_id));
create policy certificates_admin on public.student_certificates for all to authenticated using(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[])) with check(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[]));

grant select,insert,update on public.schooling_notifications,public.student_medical_profiles,public.student_import_batches,public.student_import_rows,public.student_certificates to authenticated;
