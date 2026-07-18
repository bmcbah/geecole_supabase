grant select, insert, update on table public.financial_benefit_templates to authenticated;
grant select on table public.student_financial_adjustments to authenticated;

comment on table public.student_financial_adjustments is
'Ajustements financiers individuels. Les écritures passent par les RPC métier ; authenticated dispose uniquement de SELECT direct pour les vues et historiques.';
