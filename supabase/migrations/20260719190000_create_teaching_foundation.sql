-- GeeCole V1 — migration isolée Supabase/React du socle pédagogique.
-- Réutilise les concepts existants afin de préserver la compatibilité :
-- academic_periods, subjects, people, person_roles et school_classes.

alter table public.subjects add column if not exists description text;

create table public.academic_cycle_subjects (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  academic_year_cycle_id uuid not null references public.academic_year_cycles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  coefficient numeric(8, 2) not null default 1 check (coefficient > 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year_cycle_id, subject_id)
);

create table public.teaching_assignments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  class_id uuid not null references public.school_classes(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete restrict,
  teacher_person_id uuid not null references public.people(id) on delete restrict,
  assignment_kind text not null default 'subject'
    check (assignment_kind in ('primary', 'subject')),
  whole_year boolean not null default true,
  academic_period_id uuid references public.academic_periods(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (whole_year and academic_period_id is null)
    or (not whole_year and academic_period_id is not null)
  ),
  check (
    (assignment_kind = 'primary' and subject_id is null)
    or (assignment_kind = 'subject' and subject_id is not null)
  )
);

create unique index teaching_assignments_unique_whole_year
  on public.teaching_assignments (
    class_id,
    coalesce(subject_id, '00000000-0000-0000-0000-000000000000'::uuid),
    assignment_kind
  ) where whole_year and is_active;

create unique index teaching_assignments_unique_period
  on public.teaching_assignments (
    class_id,
    coalesce(subject_id, '00000000-0000-0000-0000-000000000000'::uuid),
    assignment_kind,
    academic_period_id
  ) where not whole_year and is_active;

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  teaching_assignment_id uuid not null unique
    references public.teaching_assignments(id) on delete cascade,
  class_id uuid not null references public.school_classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  teacher_person_id uuid not null references public.people(id) on delete restrict,
  whole_year boolean not null default true,
  academic_period_id uuid references public.academic_periods(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (whole_year and academic_period_id is null)
    or (not whole_year and academic_period_id is not null)
  )
);

create index academic_cycle_subjects_cycle_idx
  on public.academic_cycle_subjects (academic_year_cycle_id, sort_order);
create index teaching_assignments_teacher_idx
  on public.teaching_assignments (teacher_person_id, academic_year_id);
create index teaching_assignments_class_idx
  on public.teaching_assignments (class_id, subject_id);
create index courses_class_idx on public.courses (class_id, subject_id);
create index courses_teacher_idx
  on public.courses (teacher_person_id, academic_year_id);

create or replace function public.validate_teaching_foundation_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  scope_institution_id uuid;
  scope_year_id uuid;
begin
  if tg_table_name = 'academic_cycle_subjects' then
    select institution_id, academic_year_id
      into scope_institution_id, scope_year_id
    from public.academic_year_cycles
    where id = new.academic_year_cycle_id;

    if scope_institution_id is distinct from new.institution_id
      or scope_year_id is distinct from new.academic_year_id then
      raise exception 'academic_cycle_subjects_scope_mismatch';
    end if;

    if not exists (
      select 1 from public.subjects
      where id = new.subject_id and institution_id = new.institution_id
    ) then
      raise exception 'academic_cycle_subjects_subject_mismatch';
    end if;
  else
    select institution_id, academic_year_id
      into scope_institution_id, scope_year_id
    from public.school_classes
    where id = new.class_id;

    if scope_institution_id is distinct from new.institution_id
      or scope_year_id is distinct from new.academic_year_id then
      raise exception 'teaching_assignment_class_scope_mismatch';
    end if;

    if not exists (
      select 1 from public.people p
      join public.person_roles pr
        on pr.person_id = p.id
       and pr.institution_id = p.institution_id
       and pr.role = 'teacher'
      where p.id = new.teacher_person_id
        and p.institution_id = new.institution_id
        and p.status = 'active'
    ) then
      raise exception 'teaching_assignment_active_teacher_required';
    end if;

    if new.subject_id is not null and not exists (
      select 1 from public.subjects
      where id = new.subject_id
        and institution_id = new.institution_id
        and is_active
    ) then
      raise exception 'teaching_assignment_subject_scope_mismatch';
    end if;

    if new.academic_period_id is not null and not exists (
      select 1 from public.academic_periods
      where id = new.academic_period_id
        and institution_id = new.institution_id
        and academic_year_id = new.academic_year_id
    ) then
      raise exception 'teaching_assignment_period_scope_mismatch';
    end if;
  end if;

  return new;
end;
$$;

create trigger validate_academic_cycle_subject_scope
before insert or update on public.academic_cycle_subjects
for each row execute function public.validate_teaching_foundation_scope();

create trigger validate_teaching_assignment_scope
before insert or update on public.teaching_assignments
for each row execute function public.validate_teaching_foundation_scope();

create or replace function public.sync_course_from_teaching_assignment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.courses where teaching_assignment_id = old.id;
    return old;
  end if;

  if new.assignment_kind = 'subject' and new.is_active then
    insert into public.courses (
      institution_id, academic_year_id, teaching_assignment_id,
      class_id, subject_id, teacher_person_id,
      whole_year, academic_period_id, is_active
    ) values (
      new.institution_id, new.academic_year_id, new.id,
      new.class_id, new.subject_id, new.teacher_person_id,
      new.whole_year, new.academic_period_id, true
    )
    on conflict (teaching_assignment_id) do update set
      institution_id = excluded.institution_id,
      academic_year_id = excluded.academic_year_id,
      class_id = excluded.class_id,
      subject_id = excluded.subject_id,
      teacher_person_id = excluded.teacher_person_id,
      whole_year = excluded.whole_year,
      academic_period_id = excluded.academic_period_id,
      is_active = true,
      updated_at = now();
  else
    delete from public.courses where teaching_assignment_id = new.id;
  end if;

  return new;
end;
$$;

create trigger sync_course_after_teaching_assignment
after insert or update or delete on public.teaching_assignments
for each row execute function public.sync_course_from_teaching_assignment();

alter table public.academic_cycle_subjects enable row level security;
alter table public.teaching_assignments enable row level security;
alter table public.courses enable row level security;

create policy "members read academic cycle subjects"
on public.academic_cycle_subjects for select using (
  exists (select 1 from public.memberships m
    where m.institution_id = academic_cycle_subjects.institution_id
      and m.user_id = auth.uid() and m.status = 'active')
);
create policy "members read teaching assignments"
on public.teaching_assignments for select using (
  exists (select 1 from public.memberships m
    where m.institution_id = teaching_assignments.institution_id
      and m.user_id = auth.uid() and m.status = 'active')
);
create policy "members read courses"
on public.courses for select using (
  exists (select 1 from public.memberships m
    where m.institution_id = courses.institution_id
      and m.user_id = auth.uid() and m.status = 'active')
);

create policy "administrators manage academic cycle subjects"
on public.academic_cycle_subjects for all
using (exists (select 1 from public.memberships m
  where m.institution_id = academic_cycle_subjects.institution_id
    and m.user_id = auth.uid() and m.status = 'active'
    and m.role in ('owner', 'admin', 'secretary')))
with check (exists (select 1 from public.memberships m
  where m.institution_id = academic_cycle_subjects.institution_id
    and m.user_id = auth.uid() and m.status = 'active'
    and m.role in ('owner', 'admin', 'secretary')));

create policy "administrators manage teaching assignments"
on public.teaching_assignments for all
using (exists (select 1 from public.memberships m
  where m.institution_id = teaching_assignments.institution_id
    and m.user_id = auth.uid() and m.status = 'active'
    and m.role in ('owner', 'admin', 'secretary')))
with check (exists (select 1 from public.memberships m
  where m.institution_id = teaching_assignments.institution_id
    and m.user_id = auth.uid() and m.status = 'active'
    and m.role in ('owner', 'admin', 'secretary')));

create policy "administrators manage courses"
on public.courses for all
using (exists (select 1 from public.memberships m
  where m.institution_id = courses.institution_id
    and m.user_id = auth.uid() and m.status = 'active'
    and m.role in ('owner', 'admin', 'secretary')))
with check (exists (select 1 from public.memberships m
  where m.institution_id = courses.institution_id
    and m.user_id = auth.uid() and m.status = 'active'
    and m.role in ('owner', 'admin', 'secretary')));

comment on table public.academic_cycle_subjects is
  'Matières actives d’un cycle annuel, héritées par ses niveaux.';
comment on table public.teaching_assignments is
  'Affectations d’enseignants par classe, matière et période.';
comment on table public.courses is
  'Cours opérationnels générés automatiquement depuis les affectations.';
