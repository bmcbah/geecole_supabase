alter table public.institutions add column class_structure_mode text not null default 'levels_and_classes'
  check (class_structure_mode in ('levels_and_classes','classes_as_levels'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'school-admin',
  'school-admin',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy school_admin_select on storage.objects for select to authenticated using(
  bucket_id='school-admin' and public.is_active_member((storage.foldername(name))[1]::uuid)
);
create policy school_admin_insert on storage.objects for insert to authenticated with check(
  bucket_id='school-admin' and public.has_institution_role((storage.foldername(name))[1]::uuid,array['owner','admin','secretary']::public.app_role[])
);
create policy school_admin_update on storage.objects for update to authenticated using(
  bucket_id='school-admin' and public.has_institution_role((storage.foldername(name))[1]::uuid,array['owner','admin','secretary']::public.app_role[])
) with check(
  bucket_id='school-admin' and public.has_institution_role((storage.foldername(name))[1]::uuid,array['owner','admin','secretary']::public.app_role[])
);

create or replace function public.create_school_class(
  target_year_id uuid, target_annual_level_id uuid, target_annual_cycle_id uuid,
  class_name text, class_code text, class_capacity integer default null, class_room text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare target_year public.academic_years%rowtype; target_institution public.institutions%rowtype; annual_cycle public.academic_year_cycles%rowtype; level_id uuid; annual_level_id uuid; class_id uuid; next_order integer;
begin
  select * into target_year from public.academic_years where id=target_year_id;
  if not found or not public.has_institution_role(target_year.institution_id,array['owner','admin']::public.app_role[]) then raise exception 'permission_denied'; end if;
  if target_year.status in ('closed','archived') then raise exception 'academic_year_configuration_locked'; end if;
  select * into target_institution from public.institutions where id=target_year.institution_id;
  if target_institution.class_structure_mode='classes_as_levels' then
    select * into annual_cycle from public.academic_year_cycles where id=target_annual_cycle_id and academic_year_id=target_year_id and is_active;
    if not found then raise exception 'annual_cycle_required'; end if;
    select coalesce(max(sort_order),0)+1 into next_order from public.grade_levels where cycle_id=annual_cycle.cycle_id;
    insert into public.grade_levels(institution_id,cycle_id,name,code,sort_order)
    values(target_year.institution_id,annual_cycle.cycle_id,trim(class_name),upper(trim(class_code)),next_order) returning id into level_id;
    insert into public.academic_year_levels(institution_id,academic_year_id,cycle_id,level_id,cycle_name_snapshot,level_name_snapshot)
    values(target_year.institution_id,target_year_id,annual_cycle.cycle_id,level_id,'','') returning id into annual_level_id;
  else
    select id into annual_level_id from public.academic_year_levels where id=target_annual_level_id and academic_year_id=target_year_id and is_active;
    if annual_level_id is null then raise exception 'annual_level_required'; end if;
  end if;
  insert into public.school_classes(institution_id,academic_year_id,academic_year_level_id,name,code,capacity,room)
  values(target_year.institution_id,target_year_id,annual_level_id,trim(class_name),upper(trim(class_code)),class_capacity,nullif(trim(class_room),'')) returning id into class_id;
  return class_id;
end; $$;
revoke all on function public.create_school_class(uuid,uuid,uuid,text,text,integer,text) from public;
grant execute on function public.create_school_class(uuid,uuid,uuid,text,text,integer,text) to authenticated;
