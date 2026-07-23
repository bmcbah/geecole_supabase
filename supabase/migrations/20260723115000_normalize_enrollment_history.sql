-- Normalize the legacy enrollment history table before the Phase 1 foundation.
-- The original schema used previous_status/new_status/changed_by/changed_at,
-- while the consolidated schooling specification uses
-- from_status/to_status/performed_by/performed_at.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrollment_status_history'
      and column_name = 'previous_status'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrollment_status_history'
      and column_name = 'from_status'
  ) then
    alter table public.enrollment_status_history rename column previous_status to from_status;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrollment_status_history'
      and column_name = 'new_status'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrollment_status_history'
      and column_name = 'to_status'
  ) then
    alter table public.enrollment_status_history rename column new_status to to_status;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrollment_status_history'
      and column_name = 'changed_by'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrollment_status_history'
      and column_name = 'performed_by'
  ) then
    alter table public.enrollment_status_history rename column changed_by to performed_by;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrollment_status_history'
      and column_name = 'changed_at'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrollment_status_history'
      and column_name = 'performed_at'
  ) then
    alter table public.enrollment_status_history rename column changed_at to performed_at;
  end if;
end
$$;

alter table public.enrollment_status_history
  alter column from_status drop not null;
