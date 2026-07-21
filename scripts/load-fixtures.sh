#!/usr/bin/env bash
set -euo pipefail

environment="${GEECOLE_ENV:-development}"

case "${environment,,}" in
  production|prod)
    echo "Refus: les fixtures GeEcole ne peuvent pas être chargées en production." >&2
    exit 1
    ;;
  staging|recette)
    if [[ "${GEECOLE_FIXTURES_CONFIRM:-}" != "LOAD_FIXTURES" ]]; then
      echo "Refus: définissez GEECOLE_FIXTURES_CONFIRM=LOAD_FIXTURES pour charger les fixtures en ${environment}." >&2
      exit 1
    fi
    ;;
esac

shopt -s nullglob
fixture_files=(supabase/fixtures/*.sql)
if (( ${#fixture_files[@]} == 0 )); then
  echo "Aucune fixture trouvée dans supabase/fixtures/." >&2
  exit 1
fi

if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  psql "${SUPABASE_DB_URL}" --set=ON_ERROR_STOP=1 --file="${fixture_files[0]}"
  for fixture_file in "${fixture_files[@]:1}"; do
    psql "${SUPABASE_DB_URL}" --set=ON_ERROR_STOP=1 --file="${fixture_file}"
  done
else
  for fixture_file in "${fixture_files[@]}"; do
    npx supabase db execute --local --file "${fixture_file}"
  done
fi
