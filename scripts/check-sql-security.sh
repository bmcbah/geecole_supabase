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

report_matches \
  'Ancien rôle unique memberships.role détecté :' \
  'create\s+table\s+public\.memberships\s*\([\s\S]{0,900}\brole\s+public\.app_role'

report_matches \
  'Ancienne table person_roles détectée :' \
  'create\s+table\s+public\.person_roles\b'

membership_write_grants="$({
  perl -0777 -ne '
    while (/grant\s+[^;]+;/ig) {
      my $statement = $&;
      if ($statement =~ /\b(insert|update|delete)\b/i && $statement =~ /\bpublic\.memberships\b/i) {
        $statement =~ s/\s+/ /g;
        print "$ARGV:$statement\n";
      }
    }
  ' supabase/migrations/*.sql
} || true)"
if [[ -n "$membership_write_grants" ]]; then
  printf 'Droit d’écriture direct sur les appartenances détecté :\n%s\n' "$membership_write_grants" >&2
  failures=1
fi

unsafe_definers="$({
  perl -0777 -ne '
    while (/create(?:\s+or\s+replace)?\s+function\s+([^\s(]+)[\s\S]*?\)\s*returns[\s\S]*?as\s+\$\$/ig) {
      my $definition = $&;
      if ($definition =~ /security\s+definer/i && $definition !~ /set\s+search_path\s*=/i) {
        print "$ARGV:$1\n";
      }
    }
  ' supabase/migrations/*.sql
} || true)"
if [[ -n "$unsafe_definers" ]]; then
  printf 'Fonction SECURITY DEFINER sans search_path fixé :\n%s\n' "$unsafe_definers" >&2
  failures=1
fi

if (( failures != 0 )); then
  exit 1
fi

printf 'Contrôles SQL statiques réussis : RLS, privilèges et fonctions sensibles conformes.\n'
