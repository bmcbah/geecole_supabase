begin;

select plan(2);

select is(
  (
    select array_agg(enumlabel order by enumsortorder)::text
    from pg_enum
    where enumtypid = 'public.enrollment_status'::regtype
  ),
  '{draft,pre_registered,confirmed,rejected,withdrawn,cancelled,transferred}',
  'enrollment_status exposes the canonical GeeCole workflow'
);

select is(
  (
    select count(*)::integer
    from pg_enum
    where enumtypid = 'public.enrollment_status'::regtype
      and enumlabel = 'pending'
  ),
  0,
  'pending is not an enrollment status'
);

select * from finish();
rollback;
