alter table public.employees
  add column if not exists person_id uuid references public.people(id) on delete restrict;

create unique index if not exists employees_person_id_unique_idx
  on public.employees(person_id) where person_id is not null;

create or replace function public.sync_employee_person()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_person_id uuid;
begin
  resolved_person_id := new.person_id;
  if resolved_person_id is null and nullif(lower(trim(new.email)), '') is not null then
    select id into resolved_person_id
    from public.people
    where institution_id = new.institution_id
      and lower(email) = lower(trim(new.email))
    order by created_at
    limit 1;
  end if;

  if resolved_person_id is null then
    insert into public.people(
      institution_id, first_name, last_name, email, phone, status
    ) values (
      new.institution_id, new.first_name, new.last_name,
      nullif(lower(trim(new.email)), ''), new.phone,
      case when new.status = 'active' then 'active' else 'inactive' end
    ) returning id into resolved_person_id;
  else
    update public.people
    set first_name = new.first_name,
        last_name = new.last_name,
        email = nullif(lower(trim(new.email)), ''),
        phone = new.phone,
        status = case when new.status = 'active' then 'active' else 'inactive' end,
        updated_at = now()
    where id = resolved_person_id and institution_id = new.institution_id;
    if not found then raise exception 'employee_person_context_mismatch'; end if;
  end if;

  new.person_id := resolved_person_id;
  return new;
end;
$$;

drop trigger if exists employees_sync_person_before_write on public.employees;
create trigger employees_sync_person_before_write
before insert or update of first_name,last_name,email,phone,status,person_id
on public.employees
for each row execute function public.sync_employee_person();

create or replace function public.sync_employee_teacher_role(target_employee_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  employee_row public.employees%rowtype;
  is_teacher boolean;
begin
  select * into employee_row from public.employees where id = target_employee_id;
  if employee_row.id is null or employee_row.person_id is null then return; end if;

  select exists(
    select 1
    from public.employee_functions function_assignment
    join public.personnel_catalog_items catalog
      on catalog.id = function_assignment.function_item_id
    where function_assignment.employee_id = employee_row.id
      and function_assignment.is_active
      and (function_assignment.ends_on is null or function_assignment.ends_on >= current_date)
      and upper(catalog.code) = 'TEACHER'
  ) and employee_row.status = 'active' into is_teacher;

  if is_teacher then
    insert into public.person_roles(institution_id,person_id,role)
    values(employee_row.institution_id,employee_row.person_id,'teacher')
    on conflict(person_id,role) do nothing;
  else
    delete from public.person_roles
    where institution_id = employee_row.institution_id
      and person_id = employee_row.person_id
      and role = 'teacher';
  end if;
end;
$$;

create or replace function public.sync_employee_teacher_role_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_employee_teacher_role(
    case when tg_op = 'DELETE' then old.employee_id else new.employee_id end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists employee_functions_sync_teacher_role on public.employee_functions;
create trigger employee_functions_sync_teacher_role
after insert or update or delete on public.employee_functions
for each row execute function public.sync_employee_teacher_role_trigger();

create or replace function public.sync_employee_status_teacher_role_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_employee_teacher_role(new.id);
  return new;
end;
$$;

drop trigger if exists employees_sync_teacher_role_after_status on public.employees;
create trigger employees_sync_teacher_role_after_status
after insert or update of status on public.employees
for each row execute function public.sync_employee_status_teacher_role_trigger();

-- Backfill existing personnel records and their teacher eligibility.
update public.employees
set first_name = first_name;

do $$
declare employee_id uuid;
begin
  for employee_id in select id from public.employees loop
    perform public.sync_employee_teacher_role(employee_id);
  end loop;
end;
$$;

comment on column public.employees.person_id is
  'Identité applicative stable utilisée par les affectations pédagogiques, même sans compte utilisateur.';
