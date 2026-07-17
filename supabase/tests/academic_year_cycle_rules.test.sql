begin;
select plan(6);

select has_function(
  'public',
  'set_institution_cycle',
  array['uuid','uuid','boolean','uuid'],
  'annual cycle activation RPC exists'
);

select function_returns(
  'public',
  'set_institution_cycle',
  array['uuid','uuid','boolean','uuid'],
  'uuid',
  'annual cycle activation returns its institution mapping id'
);

select has_function(
  'public',
  'enforce_academic_year_transition',
  array[]::text[],
  'academic year transition guard exists'
);

select volatility_is(
  'public',
  'set_institution_cycle',
  array['uuid','uuid','boolean','uuid'],
  'volatile',
  'cycle activation is an explicit write operation'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.set_institution_cycle(uuid,uuid,boolean,uuid)',
    'execute'
  ),
  true,
  'authenticated users may call the guarded RPC'
);

select is(
  has_function_privilege(
    'anon',
    'public.set_institution_cycle(uuid,uuid,boolean,uuid)',
    'execute'
  ),
  false,
  'anonymous users cannot activate cycles'
);

select * from finish();
rollback;
