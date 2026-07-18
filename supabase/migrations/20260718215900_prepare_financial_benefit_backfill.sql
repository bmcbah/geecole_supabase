-- Les lignes de frais sont des snapshots immuables en exploitation.
-- Le backfill technique du Lot 5 doit toutefois initialiser net_amount sur les lignes existantes.
-- On suspend donc uniquement les triggers utilisateur pendant la migration de structure.
alter table public.student_financial_items disable trigger user;
