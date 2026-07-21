-- Invalidate an unpublished validation when one of its pedagogical inputs changes.
create or replace function public.invalidate_unpublished_bulletins()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  target_student uuid;
  target_period uuid;
  target_class uuid;
begin
  if tg_table_name = 'note_results' then
    target_student := case when tg_op = 'DELETE' then old.student_id else new.student_id end;
    select note.period_id, note.class_id
      into target_period, target_class
      from public.gradebook_notes note
      where note.id = case when tg_op = 'DELETE' then old.note_id else new.note_id end;
  else
    target_student := case when tg_op = 'DELETE' then old.student_id else new.student_id end;
    target_period := case when tg_op = 'DELETE' then old.period_id else new.period_id end;
    target_class := case when tg_op = 'DELETE' then old.class_id else new.class_id end;
  end if;

  update public.bulletin_versions
     set status = 'generated',
         validation_comment = 'Validation annulée automatiquement après modification des données pédagogiques.',
         validated_by = null,
         validated_at = null
   where student_id = target_student
     and period_id = target_period
     and class_id = target_class
     and status in ('pending_validation', 'validated');
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger note_results_invalidate_bulletins
after insert or update or delete on public.note_results
for each row execute function public.invalidate_unpublished_bulletins();

create trigger subject_appreciations_invalidate_bulletins
after insert or update or delete on public.subject_appreciations
for each row execute function public.invalidate_unpublished_bulletins();

create trigger audit_bulletin_versions
after insert or update or delete on public.bulletin_versions
for each row execute function public.audit_notes_change();
