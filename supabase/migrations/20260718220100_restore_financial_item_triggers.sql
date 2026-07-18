-- Réactive les protections d'immutabilité immédiatement après le backfill du Lot 5.
alter table public.student_financial_items enable trigger user;
