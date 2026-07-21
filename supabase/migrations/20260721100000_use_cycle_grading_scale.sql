create or replace function public.prepare_gradebook_note()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  selected_type public.assessment_types;
  selected_scale numeric(6,2);
begin
  select * into selected_type from public.assessment_types
  where id = new.note_type_id and institution_id = new.institution_id
    and academic_year_id = new.academic_year_id and is_active;
  if selected_type.id is null then raise exception 'inactive_or_invalid_note_type'; end if;

  select cycle.grading_scale into selected_scale
  from public.school_classes class
  join public.academic_year_levels level on level.id = class.academic_year_level_id
  join public.academic_year_cycles cycle
    on cycle.academic_year_id = class.academic_year_id
   and cycle.cycle_id = level.cycle_id
  join public.academic_periods period
    on period.id = new.period_id
   and period.academic_year_id = class.academic_year_id
   and period.cycle_id = level.cycle_id
  where class.id = new.class_id and class.academic_year_id = new.academic_year_id;
  if selected_scale is null then raise exception 'cycle_grading_scale_not_found'; end if;

  if not exists (
    select 1 from public.pedagogical_assignments assignment
    where assignment.institution_id = new.institution_id
      and assignment.academic_year_id = new.academic_year_id
      and assignment.class_id = new.class_id
      and (assignment.subject_id = new.subject_id or assignment.role = 'main_teacher')
      and assignment.teacher_id = new.teacher_id and assignment.is_active
      and (assignment.all_periods or exists (
        select 1 from public.pedagogical_assignment_periods scope
        where scope.assignment_id = assignment.id and scope.period_id = new.period_id
      ))
  ) then raise exception 'course_not_accessible'; end if;
  if not public.has_institution_role(new.institution_id, array['owner','admin']::public.app_role[])
    and not exists (
      select 1 from public.people person
      where person.id = new.teacher_id and person.auth_user_id = auth.uid()
    ) then raise exception 'teacher_course_access_denied'; end if;
  new.scale_snapshot := selected_scale;
  return new;
end;
$$;

comment on column public.gradebook_notes.scale_snapshot is
  'Barème annuel du cycle figé au moment de la création de la note.';
