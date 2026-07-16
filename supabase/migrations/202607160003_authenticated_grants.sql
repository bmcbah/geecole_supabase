grant usage on schema public to authenticated;

grant select, update
on public.profiles, public.institutions
to authenticated;

grant select, insert, update, delete
on public.memberships, public.academic_years
to authenticated;

revoke all
on public.profiles, public.institutions, public.memberships, public.academic_years
from anon;
