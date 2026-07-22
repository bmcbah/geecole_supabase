#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

catalogs=(
  cycle_catalog
  grade_level_catalog
  subject_catalog
  student_document_type_catalog
  fee_type_catalog
  assessment_type_catalog
  appreciation_template_catalog
  personnel_catalog
)

installers=(
  set_institution_cycle
  install_grade_level_catalog
  install_subject_catalog
  install_student_document_catalog
  install_fee_type_catalog
  install_assessment_type_catalog
  install_appreciation_catalog
  install_personnel_catalog
)

failures=0
for table in "${catalogs[@]}"; do
  if ! rg -q -i "create table public\\.${table}\\b" supabase/migrations --glob '*.sql'; then
    printf 'Catalogue global absent : %s\n' "$table" >&2
    failures=1
  fi
  if ! rg -q "'${table}'" supabase/fixtures/00_clean.sql; then
    printf 'Le nettoyage des fixtures efface le catalogue : %s\n' "$table" >&2
    failures=1
  fi
  if rg -q -i -U "grant[\\s\\S]{0,180}(insert|update|delete)[\\s\\S]{0,180}public\\.${table}\\b[\\s\\S]{0,80}to authenticated" supabase/migrations --glob '*.sql'; then
    printf 'Droit d’écriture client détecté sur le catalogue : %s\n' "$table" >&2
    failures=1
  fi
done

for function in "${installers[@]}"; do
  if ! rg -q -i "create( or replace)? function public\\.${function}\\b" supabase/migrations --glob '*.sql'; then
    printf 'RPC d’activation du catalogue absente : %s\n' "$function" >&2
    failures=1
  fi
done

if (( failures != 0 )); then
  exit 1
fi

printf 'Catalogues GeEcole vérifiés : %s référentiels immuables et %s RPC d’activation.\n' \
  "${#catalogs[@]}" "${#installers[@]}"
