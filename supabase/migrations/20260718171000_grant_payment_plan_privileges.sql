grant select, insert, update, delete
on table public.payment_plans
 to authenticated;

grant select, insert, update, delete
on table public.payment_plan_installments
 to authenticated;

revoke all on table public.payment_plans from anon;
revoke all on table public.payment_plan_installments from anon;