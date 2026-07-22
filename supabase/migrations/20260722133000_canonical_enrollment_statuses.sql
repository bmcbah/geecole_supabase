-- GeeCole schooling canonical enrollment workflow.
-- This migration is intentionally non-destructive: the enum already contains
-- the selected values and no existing enrollment row is rewritten.

do $$
declare
  actual_values text[];
  expected_values constant text[] := array[
    'draft',
    'pre_registered',
    'confirmed',
    'rejected',
    'withdrawn',
    'cancelled',
    'transferred'
  ];
begin
  select array_agg(enumlabel order by enumsortorder)
    into actual_values
  from pg_enum
  where enumtypid = 'public.enrollment_status'::regtype;

  if actual_values is distinct from expected_values then
    raise exception 'unexpected_enrollment_status_model: expected %, got %',
      expected_values,
      actual_values;
  end if;
end;
$$;

comment on type public.enrollment_status is
  'GeeCole enrollment workflow: draft, pre_registered, confirmed, rejected, withdrawn, cancelled, transferred. The legacy pending status is not part of the schooling workflow.';
