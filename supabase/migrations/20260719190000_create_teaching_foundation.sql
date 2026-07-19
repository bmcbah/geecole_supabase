-- GeeCole V1 — socle pédagogique
-- Périodes par cycle annuel, matières, enseignants, affectations et cours générés.

create table if not exists public.academic_periods (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  academic_year_cycle_id uuid not null references public.academic_year_cycles(id) on delete cascade,
  name text not null,
  code text not null,
  sort_order integer not null default 0,
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_periods_dates_check check (ends_on >= starts_on),
  constraint academic_periods_cycle_code_key unique (academic_year_cycle_id, code),
  constraint academic_periods_cycle_order_key unique (academic_year_cycle_id, sort_order)
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subjects_institution_code_key unique (institution_id, code)
);

create table if not exists public.academic_cycle_subjects (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  academic_year_cycle_id uuid not null references public.academic_year_cycles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  coefficient numeric(8, 2) not null default 1,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint academic_cycle_subjects_coefficient_check check (coefficient > 0),
  constraint academic_cycle_subjects_unique unique (academic_year_cycle_id, subject_id)
);

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  employee_number text,
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teachers_status_check check (status in ('active', 'inactive')),
  constraint teachers_employee_number_key unique (institution_id, employee_number)
);

create table if not exists public.teaching_assignments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  class_id uuid not null references public.school_classes(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete restrict,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  assignment_kind text not null default 'subject',
  whole_year boolean not null default true,
  academic_period_id uuid references public.academic_periods(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teaching_assignments_kind_check check (assignment_kind in ('primary', 'subject')),
  constraint teaching_assignments_scope_check check (
    (whole_year = true and academic_period_id is null)
    or (whole_year = false and academic_period_id is not null)
  ),
  constraint teaching_assignments_subject_check check (
    (assignment_kind = 'primary' and subject_id is null)
    or (assignment_kind = 'subject' and subject_id is not null)
  )
);

create unique index if not exists teaching_assignments_unique_whole_year
  on public.teaching_assignments (class_id, coalesce(subject_id, '00000000-0000-0000-0000-000000000000'::uuid), assignment_kind)
  where whole_year = true and is_active = true;

create unique index if not exists teaching_assignments_unique_period
  on public.teaching_assignments (class_id, coalesce(subject_id, '00000000-0000-0000-0000-000000000000'::uuid), assignment_kind, academic_period_id)
  where whole_year = false and is_active = true;

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  class_id uuid not null references public.school_classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_unique unique (academic_year_id, class_id, subject_id)
);

create index if not exists academic_periods_cycle_idx
  on public.academic_periods (academic_year_cycle_id, sort_order);
create index if not exists academic_cycle_subjects_cycle_idx
  on public.academic_cycle_subjects (academic_year_cycle_id, sort_order);
create index if not exists teaching_assignments_teacher_idx
  on public.teaching_assignments (teacher_id, academic_year_id);
create index if not exists teaching_assignments_class_idx
  on public.teaching_assignments (class_id, subject_id);
create index if not exists courses_class_idx
  on public.courses (class_id, subject_id);

alter table public.academic_periods enable row level security;
alter table public.subjects enable row level security;
alter table public.academic_cycle_subjects enable row level security;
alter table public.teachers enable row level security;
alter table public.teaching_assignments enable row level security;
alter table public.courses enable row level security;

-- Les membres actifs d'un établissement peuvent lire son socle pédagogique.
create policy "members can read academic periods"
  on public.academic_periods for select
  using (exists (
    select 1 from public.memberships m
    where m.institution_id = academic_periods.institution_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  ));

create policy "members can read subjects"
  on public.subjects for select
  using (exists (
    select 1 from public.memberships m
    where m.institution_id = subjects.institution_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  ));

create policy "members can read cycle subjects"
  on public.academic_cycle_subjects for select
  using (exists (
    select 1 from public.memberships m
    where m.institution_id = academic_cycle_subjects.institution_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  ));

create policy "members can read teachers"
  on public.teachers for select
  using (exists (
    select 1 from public.memberships m
    where m.institution_id = teachers.institution_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  ));

create policy "members can read teaching assignments"
  on public.teaching_assignments for select
  using (exists (
    select 1 from public.memberships m
    where m.institution_id = teaching_assignments.institution_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  ));

create policy "members can read courses"
  on public.courses for select
  using (exists (
    select 1 from public.memberships m
    where m.institution_id = courses.institution_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  ));

-- Seuls les rôles administratifs modifient la configuration pédagogique.
create policy "admins manage academic periods"
  on public.academic_periods for all
  using (exists (
    select 1 from public.memberships m
    where m.institution_id = academic_periods.institution_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'secretary')
  ))
  with check (exists (
    select 1 from public.memberships m
    where m.institution_id = academic_periods.institution_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'secretary')
  ));

create policy "admins manage subjects"
  on public.subjects for all
  using (exists (
    select 1 from public.memberships m
    where m.institution_id = subjects.institution_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'secretary')
  ))
  with check (exists (
    select 1 from public.memberships m
    where m.institution_id = subjects.institution_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'secretary')
  ));

create policy "admins manage cycle subjects"
  on public.academic_cycle_subjects for all
  using (exists (
    select 1 from public.memberships m
    where m.institution_id = academic_cycle_subjects.institution_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'secretary')
  ))
  with check (exists (
    select 1 from public.memberships m
    where m.institution_id = academic_cycle_subjects.institution_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'secretary')
  ));

create policy "admins manage teachers"
  on public.teachers for all
  using (exists (
    select 1 from public.memberships m
    where m.institution_id = teachers.institution_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'secretary')
  ))
  with check (exists (
    select 1 from public.memberships m
    where m.institution_id = teachers.institution_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'secretary')
  ));

create policy "admins manage teaching assignments"
  on public.teaching_assignments for all
  using (exists (
    select 1 from public.memberships m
    where m.institution_id = teaching_assignments.institution_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'secretary')
  ))
  with check (exists (
    select 1 from public.memberships m
    where m.institution_id = teaching_assignments.institution_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'secretary')
  ));

create policy "admins manage courses"
  on public.courses for all
  using (exists (
    select 1 from public.memberships m
    where m.institution_id = courses.institution_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'secretary')
  ))
  with check (exists (
    select 1 from public.memberships m
    where m.institution_id = courses.institution_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'secretary')
  ));

comment on table public.academic_periods is 'Périodes configurées pour un cycle dans une année scolaire.';
comment on table public.academic_cycle_subjects is 'Matières actives et héritées par les niveaux d’un cycle annuel.';
comment on table public.teaching_assignments is 'Affectations principales ou spécifiques, valables toute l’année ou pour une période.';
comment on table public.courses is 'Cours opérationnels générés à partir de la classe et de la matière.';
