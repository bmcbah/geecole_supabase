-- Employee compensation belongs to the employee, independently from a contract.
create table public.employee_compensation_rates (
  id uuid primary key default extensions.gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  hourly_rate numeric(14,2) not null check (hourly_rate >= 0),
  effective_from date not null,
  effective_to date,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from)
);
create unique index employee_compensation_rates_current_idx
  on public.employee_compensation_rates(employee_id) where effective_to is null;
create index employee_compensation_rates_history_idx
  on public.employee_compensation_rates(employee_id, effective_from desc);

insert into public.employee_compensation_rates(institution_id,employee_id,hourly_rate,effective_from)
select c.institution_id,c.employee_id,c.hourly_rate,c.starts_on
from public.employee_contracts c
where c.hourly_rate > 0 and c.status='active'
on conflict do nothing;

alter table public.employee_compensation_rates enable row level security;
create policy employee_compensation_rates_select on public.employee_compensation_rates
  for select to authenticated using(public.is_active_member(institution_id));
create policy employee_compensation_rates_manage on public.employee_compensation_rates
  for all to authenticated
  using(public.has_institution_role(institution_id,array['owner','admin','finance']::public.app_role[]))
  with check(public.has_institution_role(institution_id,array['owner','admin','finance']::public.app_role[]));
grant select,insert,update on public.employee_compensation_rates to authenticated;

create or replace function public.set_employee_hourly_rate(
  target_employee_id uuid, new_hourly_rate numeric, starts_on date, rate_notes text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare employee_row public.employees%rowtype; saved_id uuid;
begin
  select * into employee_row from public.employees where id=target_employee_id;
  if not found or not public.has_institution_role(employee_row.institution_id,array['owner','admin','finance']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  if new_hourly_rate < 0 then raise exception 'invalid_hourly_rate'; end if;
  update public.employee_compensation_rates
    set effective_to=starts_on-1
    where employee_id=target_employee_id and effective_to is null and effective_from<starts_on;
  delete from public.employee_compensation_rates
    where employee_id=target_employee_id and effective_to is null and effective_from>=starts_on;
  insert into public.employee_compensation_rates(institution_id,employee_id,hourly_rate,effective_from,notes)
  values(employee_row.institution_id,target_employee_id,new_hourly_rate,starts_on,nullif(trim(rate_notes),''))
  returning id into saved_id;
  return saved_id;
end $$;

create or replace function public.create_employee_access_invitation(
  target_employee_id uuid, assigned_role public.app_role default 'teacher'
) returns text language plpgsql security definer set search_path='' as $$
declare employee_row public.employees%rowtype; person_id uuid; raw_token text;
begin
  select * into employee_row from public.employees where id=target_employee_id for update;
  if not found or not public.has_institution_role(employee_row.institution_id,array['owner','admin']::public.app_role[]) then
    raise exception 'permission_denied';
  end if;
  if nullif(lower(trim(employee_row.email)),'') is null then raise exception 'employee_email_required'; end if;
  select id into person_id from public.people
    where institution_id=employee_row.institution_id and lower(email)=lower(employee_row.email) limit 1;
  if person_id is null then
    insert into public.people(institution_id,first_name,last_name,email,phone,status)
    values(employee_row.institution_id,employee_row.first_name,employee_row.last_name,lower(employee_row.email),employee_row.phone,'active')
    returning id into person_id;
  end if;
  insert into public.person_roles(institution_id,person_id,role)
    values(employee_row.institution_id,person_id,assigned_role)
    on conflict(person_id,role) do nothing;
  raw_token:=public.create_person_invitation(person_id);
  return raw_token;
end $$;

create or replace function public.calculate_payroll_period(target_period_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare p public.payroll_periods; c record; new_entry uuid; count_entries integer := 0; variable_total numeric(14,2);
begin
  select * into p from public.payroll_periods where id=target_period_id for update;
  if p.id is null then raise exception 'payroll_period_not_found'; end if;
  if not public.has_institution_role(p.institution_id,array['owner','admin','finance']::public.app_role[]) then raise exception 'forbidden'; end if;
  if p.status not in ('draft','calculated') then raise exception 'payroll_period_not_editable'; end if;
  update public.work_entries set payroll_entry_id=null where payroll_entry_id in (select id from public.payroll_entries where period_id=p.id);
  delete from public.payroll_entries where period_id=p.id;
  for c in select c.* from public.employee_contracts c join public.employees e on e.id=c.employee_id where c.institution_id=p.institution_id and c.status='active' and e.status='active' and c.starts_on<=p.ends_on and (c.ends_on is null or c.ends_on>=p.starts_on)
  loop
    select coalesce(sum(case when c.compensation_mode='session' then w.quantity*coalesce(w.rate,c.session_rate) else (w.minutes::numeric/60)*coalesce(w.rate,r.hourly_rate,0) end),0)
    into variable_total
    from public.work_entries w
    left join lateral (
      select hourly_rate from public.employee_compensation_rates er
      where er.employee_id=c.employee_id and er.effective_from<=w.work_date and (er.effective_to is null or er.effective_to>=w.work_date)
      order by er.effective_from desc limit 1
    ) r on true
    where w.contract_id=c.id and w.status='validated' and w.work_date between p.starts_on and p.ends_on and w.payroll_entry_id is null;
    insert into public.payroll_entries(institution_id,period_id,employee_id,contract_id,fixed_amount,variable_amount,status) values(p.institution_id,p.id,c.employee_id,c.id,case when c.compensation_mode in ('fixed','mixed','flat_rate') then c.fixed_amount else 0 end,variable_total,'calculated') returning id into new_entry;
    update public.work_entries set payroll_entry_id=new_entry where contract_id=c.id and status='validated' and work_date between p.starts_on and p.ends_on and payroll_entry_id is null;
    count_entries:=count_entries+1;
  end loop;
  update public.payroll_periods set status='calculated' where id=p.id;
  return count_entries;
end $$;

revoke all on function public.set_employee_hourly_rate(uuid,numeric,date,text),public.create_employee_access_invitation(uuid,public.app_role) from public;
grant execute on function public.set_employee_hourly_rate(uuid,numeric,date,text),public.create_employee_access_invitation(uuid,public.app_role) to authenticated;

create or replace function public.accept_person_invitation(raw_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invitation public.person_invitations; assigned_role public.app_role; saved_membership_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  select * into invitation from public.person_invitations
  where token_hash=encode(extensions.digest(raw_token,'sha256'),'hex') and status='pending' and expires_at>now() for update;
  if invitation.id is null then raise exception 'invalid_or_expired_invitation'; end if;
  if lower(coalesce((select auth.jwt()->>'email'),''))<>lower(invitation.email) then raise exception 'invitation_email_mismatch'; end if;
  update public.people set auth_user_id=(select auth.uid()) where id=invitation.person_id and auth_user_id is null;
  select role into assigned_role from public.person_roles where person_id=invitation.person_id
  order by case role::text when 'owner' then 1 when 'admin' then 2 when 'secretary' then 3 when 'finance' then 4 when 'teacher' then 5 else 6 end limit 1;
  if assigned_role is null then raise exception 'person_role_required'; end if;
  insert into public.memberships(institution_id,user_id,role)
  values(invitation.institution_id,(select auth.uid()),assigned_role)
  on conflict(institution_id,user_id) do update set status='active',role=excluded.role
  returning id into saved_membership_id;
  update public.employees set membership_id=saved_membership_id
  where institution_id=invitation.institution_id and lower(email)=lower(invitation.email) and membership_id is null;
  update public.person_invitations set status='accepted',accepted_at=now() where id=invitation.id;
  return saved_membership_id;
end $$;

insert into public.personnel_catalog_items(institution_id,category,code,default_label,is_system,is_active,display_order)
select i.id,v.category,v.code,v.label,true,true,v.ord from public.institutions i cross join(values
('function','DIRECTOR','Directeur / Directrice',20),('function','PRINCIPAL','Principal(e)',30),('function','PROVISOR','Proviseur',40),('function','CENSOR','Censeur',50),('function','STUDIES_DIRECTOR','Directeur des études',60),('function','ACCOUNTANT','Comptable',70),('function','CASHIER','Caissier / Caissière',80),('function','SUPERVISOR','Surveillant(e)',90),('function','LIBRARIAN','Bibliothécaire',100),('function','CARETAKER','Gardien(ne)',110),('function','CLEANER','Agent d’entretien',120),
('contract_type','CDD','Contrat à durée déterminée',30),('contract_type','CDI','Contrat à durée indéterminée',40),('contract_type','TEMPORARY','Contrat temporaire',50),('contract_type','INTERNSHIP','Stage',60),('contract_type','SERVICE','Prestation de service',70),
('work_type','REMEDIAL','Cours de rattrapage',20),('work_type','EXAM_SUPERVISION','Surveillance d’examen',30),('work_type','CORRECTION','Correction de copies',40),('work_type','MEETING','Réunion pédagogique',50),('work_type','ADMINISTRATIVE','Activité administrative',60),('work_type','OVERTIME','Heures supplémentaires',70),
('bonus_type','SENIORITY','Ancienneté',20),('bonus_type','TRANSPORT','Transport',30),('bonus_type','HOUSING','Logement',40),('bonus_type','PERFORMANCE','Prime exceptionnelle',50),
('deduction_type','ADVANCE','Remboursement d’avance',20),('deduction_type','LATE','Retard',30),('deduction_type','DISCIPLINARY','Retenue disciplinaire',40),
('advance_type','SALARY','Avance sur salaire',10),('advance_type','EMERGENCY','Avance exceptionnelle',20),
('leave_type','SICK','Congé maladie',20),('leave_type','MATERNITY','Congé maternité',30),('leave_type','PATERNITY','Congé paternité',40),('leave_type','FAMILY','Événement familial',50),('leave_type','UNPAID','Congé sans solde',60),('leave_type','TRAINING','Formation',70),
('sanction_type','WARNING','Avertissement',10),('sanction_type','REPRIMAND','Blâme',20),('sanction_type','SUSPENSION','Suspension',30),
('document_type','CV','Curriculum vitæ',50),('document_type','WORK_CERTIFICATE','Certificat de travail',60),('document_type','MEDICAL','Certificat médical',70),('document_type','BANK_DETAILS','Coordonnées bancaires',80)
) v(category,code,label,ord)
on conflict(institution_id,category,code) do nothing;
