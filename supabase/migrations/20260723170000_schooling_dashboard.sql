create or replace function public.get_schooling_dashboard(
  target_institution_id uuid,
  target_academic_year_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  enrolled_count integer := 0;
  in_progress_count integer := 0;
  pre_registered_count integer := 0;
  without_class_count integer := 0;
  attendance_count integer := 0;
  documents_count integer := 0;
  pending_bulletins_count integer := 0;
  notes_not_started_count integer := 0;
  recent_actions jsonb := '[]'::jsonb;
  alerts jsonb := '[]'::jsonb;
begin
  if not public.is_active_member(target_institution_id) then
    raise exception 'permission_denied';
  end if;

  select count(*)::integer
  into enrolled_count
  from public.enrollments enrollment
  where enrollment.institution_id = target_institution_id
    and enrollment.academic_year_id = target_academic_year_id
    and enrollment.status::text = 'confirmed';

  select count(*)::integer
  into in_progress_count
  from public.enrollments enrollment
  where enrollment.institution_id = target_institution_id
    and enrollment.academic_year_id = target_academic_year_id
    and enrollment.status::text in ('draft', 'pending', 'pre_registered');

  select count(*)::integer
  into pre_registered_count
  from public.enrollments enrollment
  where enrollment.institution_id = target_institution_id
    and enrollment.academic_year_id = target_academic_year_id
    and enrollment.status::text = 'pre_registered';

  select count(*)::integer
  into without_class_count
  from public.enrollments enrollment
  where enrollment.institution_id = target_institution_id
    and enrollment.academic_year_id = target_academic_year_id
    and enrollment.status::text = 'confirmed'
    and not exists (
      select 1
      from public.class_assignments assignment
      where assignment.enrollment_id = enrollment.id
        and assignment.ends_on is null
    );

  if to_regclass('public.student_attendance_records') is not null then
    execute $query$
      select count(*)::integer
      from public.student_attendance_records attendance
      where attendance.institution_id = $1
        and attendance.academic_year_id = $2
        and attendance.justification_status::text <> 'justified'
    $query$
    into attendance_count
    using target_institution_id, target_academic_year_id;
  end if;

  select count(*)::integer
  into documents_count
  from public.student_documents document
  join public.enrollments enrollment on enrollment.id = document.enrollment_id
  where document.institution_id = target_institution_id
    and enrollment.academic_year_id = target_academic_year_id
    and document.status in ('missing', 'provided', 'rejected');

  if to_regclass('public.bulletin_versions') is not null then
    execute $query$
      select count(*)::integer
      from public.bulletin_versions bulletin
      where bulletin.institution_id = $1
        and bulletin.academic_year_id = $2
        and bulletin.status::text in ('generated', 'pending_validation', 'validated')
    $query$
    into pending_bulletins_count
    using target_institution_id, target_academic_year_id;
  end if;

  if to_regclass('public.notes_average_controls') is not null then
    execute $query$
      select count(*)::integer
      from public.notes_average_controls control
      where control.institution_id = $1
        and control.academic_year_id = $2
        and control.state = 'not_started'
    $query$
    into notes_not_started_count
    using target_institution_id, target_academic_year_id;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', enrollment.id,
        'entity', 'enrollment',
        'title', concat_ws(' ', student.first_name, student.last_name),
        'description', case enrollment.status::text
          when 'confirmed' then 'Inscription confirmée'
          when 'pre_registered' then 'Préinscription mise à jour'
          when 'draft' then 'Brouillon d’inscription mis à jour'
          else 'Dossier d’inscription mis à jour'
        end,
        'occurredAt', enrollment.updated_at,
        'route', case
          when enrollment.status::text = 'confirmed'
            then '/scolarite/eleves/' || student.id::text
          else '/scolarite/inscriptions'
        end
      )
      order by enrollment.updated_at desc
    ),
    '[]'::jsonb
  )
  into recent_actions
  from (
    select *
    from public.enrollments
    where institution_id = target_institution_id
      and academic_year_id = target_academic_year_id
    order by updated_at desc
    limit 8
  ) enrollment
  join public.students student on student.id = enrollment.student_id;

  alerts := jsonb_build_array(
    jsonb_build_object(
      'id', 'students_without_class',
      'title', 'Élèves inscrits sans classe',
      'description', 'Les inscriptions sont confirmées mais aucune classe active n’est affectée.',
      'count', without_class_count,
      'severity', 'warning',
      'domain', 'Scolarité',
      'route', '/scolarite/eleves?controle=sans-classe'
    ),
    jsonb_build_object(
      'id', 'documents_to_review',
      'title', 'Documents à contrôler',
      'description', 'Pièces manquantes, reçues ou rejetées nécessitant un suivi.',
      'count', documents_count,
      'severity', 'warning',
      'domain', 'Documents',
      'route', '/scolarite/documents'
    ),
    jsonb_build_object(
      'id', 'attendance_to_review',
      'title', 'Assiduité à traiter',
      'description', 'Absences et retards dont la justification reste ouverte.',
      'count', attendance_count,
      'severity', 'information',
      'domain', 'Assiduité',
      'route', '/scolarite/assiduite'
    ),
    jsonb_build_object(
      'id', 'notes_not_started',
      'title', 'Cours sans note',
      'description', 'Cours actifs pour lesquels aucune évaluation n’a encore été saisie.',
      'count', notes_not_started_count,
      'severity', 'information',
      'domain', 'Notes',
      'route', '/notes-bulletins/controle-moyennes?etat=not_started'
    ),
    jsonb_build_object(
      'id', 'bulletins_pending',
      'title', 'Bulletins non publiés',
      'description', 'Bulletins générés, à valider ou validés qui ne sont pas encore publiés.',
      'count', pending_bulletins_count,
      'severity', 'warning',
      'domain', 'Bulletins',
      'route', '/notes-bulletins/bulletins?publication=pending'
    )
  );

  select coalesce(jsonb_agg(item), '[]'::jsonb)
  into alerts
  from jsonb_array_elements(alerts) item
  where coalesce((item ->> 'count')::integer, 0) > 0;

  return jsonb_build_object(
    'kpis', jsonb_build_object(
      'enrolledStudents', enrolled_count,
      'enrollmentsInProgress', in_progress_count,
      'preRegistrations', pre_registered_count,
      'studentsWithoutClass', without_class_count,
      'attendanceToReview', attendance_count,
      'documentsToReview', documents_count
    ),
    'alerts', alerts,
    'recentActions', recent_actions
  );
end;
$$;

revoke all on function public.get_schooling_dashboard(uuid, uuid) from public;
grant execute on function public.get_schooling_dashboard(uuid, uuid) to authenticated;
