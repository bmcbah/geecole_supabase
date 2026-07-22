-- Notifications d'assiduité et lecture paginée des élèves.

create or replace function public.queue_attendance_guardian_notification()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  target_student_id uuid;
  target_guardian_id uuid;
begin
  select e.student_id into target_student_id from public.enrollments e where e.id=new.enrollment_id;
  select sg.guardian_id into target_guardian_id
  from public.student_guardians sg
  where sg.student_id=target_student_id and sg.is_primary_contact and sg.receives_communications
  order by sg.guardian_id limit 1;
  insert into public.schooling_notifications(
    institution_id,academic_year_id,student_id,guardian_id,channel,event_type,payload,created_by
  ) values (
    new.institution_id,new.academic_year_id,target_student_id,target_guardian_id,'in_app','attendance_recorded',
    jsonb_build_object('attendance_id',new.id,'date',new.attendance_date,'kind',new.kind,'slot',new.slot_label),
    (select auth.uid())
  );
  return new;
end; $$;

drop trigger if exists student_attendance_queue_notification on public.student_attendance_records;
create trigger student_attendance_queue_notification
after insert on public.student_attendance_records
for each row execute function public.queue_attendance_guardian_notification();

create or replace function public.list_students_page(
  target_institution_id uuid,
  target_academic_year_id uuid,
  search_text text default null,
  status_filter public.enrollment_status default null,
  page_offset integer default 0,
  page_limit integer default 25
) returns table(
  student_id uuid,enrollment_id uuid,matricule text,first_name text,last_name text,gender text,birth_date date,
  enrollment_status public.enrollment_status,cycle_name text,level_name text,guardian_name text,guardian_phone text,total_count bigint
)
language sql stable security definer set search_path='' as $$
  with source as (
    select s.id student_id,e.id enrollment_id,s.matricule,s.first_name,s.last_name,s.gender,s.birth_date,
      e.status enrollment_status,e.cycle_name_snapshot cycle_name,e.level_name_snapshot level_name,
      trim(coalesce(g.first_name,'')||' '||coalesce(g.last_name,'')) guardian_name,coalesce(g.primary_phone,'') guardian_phone
    from public.enrollments e
    join public.students s on s.id=e.student_id
    left join public.student_guardians sg on sg.student_id=s.id and sg.is_primary_contact
    left join public.guardians g on g.id=sg.guardian_id
    where e.institution_id=target_institution_id and e.academic_year_id=target_academic_year_id
      and e.status<>'cancelled'::public.enrollment_status
      and public.is_active_member(target_institution_id)
      and (status_filter is null or e.status=status_filter)
      and (nullif(trim(search_text),'') is null or concat_ws(' ',s.first_name,s.last_name,s.matricule,g.first_name,g.last_name,g.primary_phone) ilike '%'||trim(search_text)||'%')
  )
  select source.*,count(*) over() total_count
  from source
  order by last_name,first_name
  offset greatest(coalesce(page_offset,0),0)
  limit greatest(1,least(coalesce(page_limit,25),100));
$$;

revoke all on function public.list_students_page(uuid,uuid,text,public.enrollment_status,integer,integer) from public;
grant execute on function public.list_students_page(uuid,uuid,text,public.enrollment_status,integer,integer) to authenticated;
