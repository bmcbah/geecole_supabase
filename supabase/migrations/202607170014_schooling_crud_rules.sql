create table public.enrollment_status_history (
  id uuid primary key default extensions.gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  previous_status public.enrollment_status not null,
  new_status public.enrollment_status not null,
  reason text,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);
create index enrollment_status_history_enrollment_idx on public.enrollment_status_history(enrollment_id, changed_at desc);
alter table public.enrollment_status_history enable row level security;
create policy enrollment_status_history_select_member on public.enrollment_status_history for select to authenticated
  using (public.is_active_member(institution_id));
grant select on public.enrollment_status_history to authenticated;
revoke all on public.enrollment_status_history from anon;

create or replace function public.change_enrollment_status(
  target_enrollment_id uuid,
  target_status public.enrollment_status,
  change_reason text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare current_enrollment public.enrollments%rowtype;
declare target_year public.academic_years%rowtype;
begin
  select * into current_enrollment from public.enrollments where id = target_enrollment_id for update;
  if not found then raise exception 'enrollment_not_found'; end if;
  if not public.has_institution_role(current_enrollment.institution_id, array['owner','admin','secretary']::public.app_role[]) then raise exception 'permission_denied'; end if;
  select * into target_year from public.academic_years where id = current_enrollment.academic_year_id;
  if target_year.status in ('closed','archived') then raise exception 'academic_year_read_only'; end if;
  if not (
    (current_enrollment.status = 'draft' and target_status in ('pre_registered','confirmed','cancelled')) or
    (current_enrollment.status = 'pre_registered' and target_status in ('confirmed','rejected','withdrawn','cancelled')) or
    (current_enrollment.status = 'confirmed' and target_status in ('cancelled','transferred'))
  ) then raise exception 'invalid_enrollment_transition'; end if;
  if target_status in ('cancelled','rejected','withdrawn','transferred') and char_length(trim(coalesce(change_reason,''))) < 3 then
    raise exception 'reason_required';
  end if;
  update public.enrollments set status = target_status,
    cancellation_reason = case when target_status in ('cancelled','rejected','withdrawn') then trim(change_reason) else cancellation_reason end,
    confirmed_at = case when target_status = 'confirmed' then now() else confirmed_at end
  where id = target_enrollment_id;
  insert into public.enrollment_status_history(enrollment_id,institution_id,previous_status,new_status,reason,changed_by)
  values(target_enrollment_id,current_enrollment.institution_id,current_enrollment.status,target_status,nullif(trim(change_reason),''),(select auth.uid()));
end;
$$;
revoke all on function public.change_enrollment_status(uuid,public.enrollment_status,text) from public;
grant execute on function public.change_enrollment_status(uuid,public.enrollment_status,text) to authenticated;
