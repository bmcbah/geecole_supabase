create sequence if not exists public.student_certificate_reference_sequence;

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
  cert_ref:=upper(substr(target_type,1,3))||'-'||to_char(current_date,'YYYY')||'-'||lpad(nextval('public.student_certificate_reference_sequence')::text,6,'0');
  insert into public.student_certificates(institution_id,academic_year_id,student_id,enrollment_id,certificate_type,reference,issued_by,snapshot)
  values(e.institution_id,e.academic_year_id,e.student_id,e.id,target_type,cert_ref,(select auth.uid()),jsonb_build_object(
    'student_name',trim(s.first_name||' '||s.last_name),'matricule',s.matricule,'level',e.level_name_snapshot,
    'cycle',e.cycle_name_snapshot,'admission_date',e.admission_date,'status',e.status
  )) returning id into cert_id;
  return cert_id;
end; $$;

revoke all on function public.issue_student_certificate(uuid,text) from public;
grant execute on function public.issue_student_certificate(uuid,text) to authenticated;
