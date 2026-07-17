create table public.school_classes (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  academic_year_level_id uuid not null references public.academic_year_levels(id) on delete restrict,
  name text not null,
  code text not null,
  capacity integer check (capacity is null or capacity > 0),
  room text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, academic_year_id, code)
);
create table public.class_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  class_id uuid not null references public.school_classes(id) on delete restrict,
  starts_on date not null default current_date,
  ends_on date,
  end_reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index class_assignments_one_active on public.class_assignments(enrollment_id) where ends_on is null;

create table public.document_requirements (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  code text not null,
  required_for_pre_registration boolean not null default false,
  required_for_confirmation boolean not null default true,
  expires boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, code)
);
create table public.student_documents (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  enrollment_id uuid references public.enrollments(id) on delete restrict,
  requirement_id uuid not null references public.document_requirements(id) on delete restrict,
  status text not null default 'missing' check (status in ('missing','provided','not_applicable','rejected')),
  file_path text,
  notes text,
  received_on date,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, enrollment_id, requirement_id)
);

create trigger school_classes_set_updated_at before update on public.school_classes for each row execute function public.set_updated_at();
create trigger document_requirements_set_updated_at before update on public.document_requirements for each row execute function public.set_updated_at();
create trigger student_documents_set_updated_at before update on public.student_documents for each row execute function public.set_updated_at();

create or replace function public.assign_enrollment_to_class(target_enrollment uuid, target_class uuid, change_reason text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare enrollment_row public.enrollments%rowtype; class_row public.school_classes%rowtype; policy public.enrollment_policies%rowtype; active_count integer; assignment_id uuid;
begin
  select * into enrollment_row from public.enrollments where id = target_enrollment;
  if not found or not public.has_institution_role(enrollment_row.institution_id, array['owner','admin','secretary']::public.app_role[]) then raise exception 'permission_denied'; end if;
  select * into class_row from public.school_classes where id = target_class and is_active;
  if not found or class_row.institution_id <> enrollment_row.institution_id or class_row.academic_year_id <> enrollment_row.academic_year_id or class_row.academic_year_level_id <> enrollment_row.academic_year_level_id then raise exception 'class_enrollment_mismatch'; end if;
  select * into policy from public.enrollment_policies where institution_id = enrollment_row.institution_id;
  select count(*) into active_count from public.class_assignments where class_id = target_class and ends_on is null;
  if class_row.capacity is not null and active_count >= class_row.capacity and policy.capacity_mode = 'blocking' then raise exception 'class_capacity_reached'; end if;
  update public.class_assignments set ends_on = current_date, end_reason = coalesce(nullif(trim(change_reason),''),'Changement de classe') where enrollment_id = target_enrollment and ends_on is null;
  insert into public.class_assignments(institution_id,academic_year_id,enrollment_id,class_id,created_by)
  values(enrollment_row.institution_id,enrollment_row.academic_year_id,target_enrollment,target_class,(select auth.uid())) returning id into assignment_id;
  return assignment_id;
end; $$;
revoke all on function public.assign_enrollment_to_class(uuid,uuid,text) from public;
grant execute on function public.assign_enrollment_to_class(uuid,uuid,text) to authenticated;

alter table public.school_classes enable row level security;
alter table public.class_assignments enable row level security;
alter table public.document_requirements enable row level security;
alter table public.student_documents enable row level security;
create policy school_classes_select on public.school_classes for select to authenticated using(public.is_active_member(institution_id));
create policy school_classes_manage on public.school_classes for all to authenticated using(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[])) with check(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[]));
create policy class_assignments_select on public.class_assignments for select to authenticated using(public.is_active_member(institution_id));
create policy class_assignments_manage on public.class_assignments for all to authenticated using(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[])) with check(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[]));
create policy document_requirements_select on public.document_requirements for select to authenticated using(public.is_active_member(institution_id));
create policy document_requirements_manage on public.document_requirements for all to authenticated using(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[])) with check(public.has_institution_role(institution_id,array['owner','admin']::public.app_role[]));
create policy student_documents_select on public.student_documents for select to authenticated using(public.is_active_member(institution_id));
create policy student_documents_manage on public.student_documents for all to authenticated using(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[])) with check(public.has_institution_role(institution_id,array['owner','admin','secretary']::public.app_role[]));
grant select,insert,update on public.school_classes,public.class_assignments,public.document_requirements,public.student_documents to authenticated;
revoke all on public.school_classes,public.class_assignments,public.document_requirements,public.student_documents from anon;

insert into public.document_requirements(institution_id,name,code,required_for_confirmation)
select id,'Extrait de naissance','BIRTH_CERTIFICATE',true from public.institutions on conflict do nothing;
create or replace function public.create_default_document_requirement() returns trigger language plpgsql security definer set search_path='' as $$ begin
  insert into public.document_requirements(institution_id,name,code,required_for_confirmation) values(new.id,'Extrait de naissance','BIRTH_CERTIFICATE',true) on conflict do nothing;
  return new;
end; $$;
create trigger institutions_create_default_document after insert on public.institutions for each row execute function public.create_default_document_requirement();
