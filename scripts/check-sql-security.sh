#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

failures=0

report_matches() {
  local title="$1"
  local pattern="$2"
  local matches

  matches="$(rg -n -i -U "$pattern" supabase/migrations --glob '*.sql' || true)"
  if [[ -n "$matches" ]]; then
    printf '%s\n%s\n' "$title" "$matches" >&2
    failures=1
  fi
}

report_matches \
  'Politique RLS inconditionnelle détectée :' \
  'create\s+policy[\s\S]{0,240}(using|with\s+check)\s*\(\s*true\s*\)'

report_matches \
  'Désactivation de RLS détectée :' \
  'disable\s+row\s+level\s+security'

report_matches \
  'Privilège ALL accordé à un rôle client :' \
  'grant\s+all[\s\S]{0,160}\s+to\s+(anon|authenticated)'

if (( failures != 0 )); then
  exit 1
fi

printf 'Contrôles SQL statiques réussis : aucune politique ouverte ni désactivation RLS.\n'
