create table public.financial_generation_reports (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  scope text not null check (scope in ('single', 'global')),
  status text not null check (status in ('success', 'partial', 'failed')),
  generated_count integer not null default 0 check (generated_count >= 0),
  regenerated_count integer not null default 0 check (regenerated_count >= 0),
  skipped_paid_count integer not null default 0 check (skipped_paid_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  errors jsonb not null default '[]'::jsonb check (jsonb_typeof(errors) = 'array'),
  enrollment_id uuid references public.enrollments(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index financial_generation_reports_year_created_idx
  on public.financial_generation_reports(institution_id, academic_year_id, created_at desc);

alter table public.financial_generation_reports enable row level security;

create policy financial_generation_reports_select_member
  on public.financial_generation_reports for select to authenticated
  using (public.is_active_member(institution_id));

create policy financial_generation_reports_insert_authorized
  on public.financial_generation_reports for insert to authenticated
  with check (
    public.has_institution_role(
      institution_id,
      array['owner','admin','secretary']::public.app_role[]
    )
  );

grant select, insert on public.financial_generation_reports to authenticated;
revoke all on public.financial_generation_reports from anon;

comment on table public.financial_generation_reports is
  'Rapports persistants des exécutions de génération des dossiers financiers.';
