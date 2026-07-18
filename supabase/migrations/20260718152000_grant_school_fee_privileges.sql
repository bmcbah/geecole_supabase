-- PostgreSQL checks object privileges before evaluating row-level security policies.
-- The authenticated role therefore needs explicit CRUD privileges on the
-- school-fee tables introduced by Lot 1.

grant select, insert, update, delete
on table public.fee_types
 to authenticated;

grant select, insert, update, delete
on table public.fee_schedules
 to authenticated;

grant select, insert, update, delete
on table public.fee_schedule_items
 to authenticated;

-- The application invokes this RPC through Supabase.
grant execute on function public.duplicate_fee_schedule(uuid, uuid, uuid)
 to authenticated;

-- Keep anonymous users explicitly excluded from this administrative module.
revoke all on table public.fee_types from anon;
revoke all on table public.fee_schedules from anon;
revoke all on table public.fee_schedule_items from anon;
revoke execute on function public.duplicate_fee_schedule(uuid, uuid, uuid) from anon;
