-- Complète les workflows administratifs du module Scolarité sans modifier les données existantes.

create table if not exists public.enrollment_status_history (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  previous_status public.enrollment_status,
  next_status public.enrollment_status not null,
  reason text,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);
create index if not exists enrollment_status_history_enrollment_idx
  on public.enrollment_status_history(enrollment_id, changed_at desc);

create or replace function public.change_enrollment_status(
  target_enrollment_id uuid,
  target_status public.enrollment_status,
  change_reason text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  current_row public.enrollments%rowtype;
begin
  select * into current_row from public.enrollments where id = target_enrollment_id for update;
  if not found then raise exception 'enrollment_not_found'; end if;
  if not public.has_institution_role(current_row.institution_id, array['owner','admin','secretary']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  if current_row.status = target_status then return; end if;
  if target_status in ('rejected','withdrawn','cancelled','transferred') and nullif(trim(change_reason), '') is null then
    raise exception 'reason_required';
  end if;
  if current_row.status = 'confirmed' and target_status in ('draft','pre_registered','rejected') then
    raise exception 'invalid_status_transition';
  end if;
  update public.enrollments
  set status = target_status,
      cancellation_reason = case when target_status in ('cancelled','rejected','withdrawn','transferred') then trim(change_reason) else cancellation_reason end,
      confirmed_at = case when target_status = 'confirmed' then coalesce(confirmed_at, now()) else confirmed_at end
  where id = target_enrollment_id;
  insert into public.enrollment_status_history(institution_id,enrollment_id,previous_status,next_status,reason,changed_by)
  values(current_row.institution_id,current_row.id,current_row.status,target_status,nullif(trim(change_reason),''),(select auth.uid()));
end;
$$;

create table if not exists public.student_attendance_records (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  class_id uuid references public.school_classes(id) on delete set null,
  attendance_date date not null,
  slot_label text,
  kind text not null check (kind in ('absence','late')),
  justification_status text not null default 'unjustified' check (justification_status in ('unjustified','pending','justified')),
  reason text,
  justification_document_path text,
  notified_at timestamptz,
  recorded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists student_attendance_year_date_idx
  on public.student_attendance_records(academic_year_id, attendance_date desc);
create index if not exists student_attendance_enrollment_idx
  on public.student_attendance_records(enrollment_id, attendance_date desc);

create table if not exists public.schooling_document_requirements (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid references public.academic_years(id) on delete cascade,
  annual_cycle_id uuid references public.academic_year_cycles(id) on delete cascade,
  annual_level_id uuid references public.academic_year_levels(id) on delete cascade,
  code text not null,
  name text not null,
  required_for_pre_registration boolean not null default false,
  required_for_confirmation boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(institution_id, academic_year_id, annual_level_id, code)
);

create table if not exists public.enrollment_documents (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  requirement_id uuid references public.schooling_document_requirements(id) on delete set null,
  document_code text not null,
  document_name text not null,
  status text not null default 'requested' check (status in ('requested','received','verified','rejected','expired')),
  storage_path text,
  rejection_reason text,
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(enrollment_id, document_code)
);

alter table public.enrollment_status_history enable row level security;
alter table public.student_attendance_records enable row level security;
alter table public.schooling_document_requirements enable row level security;
alter table public.enrollment_documents enable row level security;

drop policy if exists enrollment_history_select_member on public.enrollment_status_history;
drop policy if exists enrollment_history_manage_schooling on public.enrollment_status_history;
drop policy if exists attendance_select_member on public.student_attendance_records;
drop policy if exists attendance_manage_schooling on public.student_attendance_records;
drop policy if exists schooling_requirements_select_member on public.schooling_document_requirements;
drop policy if exists schooling_requirements_manage_admin on public.schooling_document_requirements;
drop policy if exists enrollment_documents_select_member on public.enrollment_documents;
drop policy if exists enrollment_documents_manage_schooling on public.enrollment_documents;

create policy enrollment_history_select_member on public.enrollment_status_history for select to authenticated
using (public.is_active_member(institution_id));
create policy enrollment_history_manage_schooling on public.enrollment_status_history for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]));

create policy attendance_select_member on public.student_attendance_records for select to authenticated
using (public.is_active_member(institution_id));
create policy attendance_manage_schooling on public.student_attendance_records for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin','secretary','teacher']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin','secretary','teacher']::public.app_role[]));

create policy schooling_requirements_select_member on public.schooling_document_requirements for select to authenticated
using (public.is_active_member(institution_id));
create policy schooling_requirements_manage_admin on public.schooling_document_requirements for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]));

create policy enrollment_documents_select_member on public.enrollment_documents for select to authenticated
using (public.is_active_member(institution_id));
create policy enrollment_documents_manage_schooling on public.enrollment_documents for all to authenticated
using (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]))
with check (public.has_institution_role(institution_id, array['owner','admin','secretary']::public.app_role[]));

grant select, insert, update on public.enrollment_status_history, public.student_attendance_records, public.schooling_document_requirements, public.enrollment_documents to authenticated;
revoke all on function public.change_enrollment_status(uuid, public.enrollment_status, text) from public;
grant execute on function public.change_enrollment_status(uuid, public.enrollment_status, text) to authenticated;
