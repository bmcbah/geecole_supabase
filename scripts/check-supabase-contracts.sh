#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

perl -0777 -ne 'while (/\.from\(\s*"([A-Za-z0-9_-]+)"/g) { print "$1\n" }' \
  $(rg --files src -g '*.ts' -g '*.tsx') | sort -u > "$tmp_dir/frontend-relations"

perl -0777 -ne 'while (/\.rpc\(\s*"([A-Za-z0-9_]+)"/g) { print "$1\n" }' \
  $(rg --files src -g '*.ts' -g '*.tsx') | sort -u > "$tmp_dir/frontend-rpcs"

rg -i --no-filename -o 'create( or replace)? (table|view|materialized view) (if not exists )?(public\.)?[a-z0-9_]+' supabase/migrations \
  | sed -E 's/.* //; s/^public\.//' \
  | sort -u > "$tmp_dir/sql-relations"

rg -i --no-filename -o 'create( or replace)? function (public\.)?[a-z0-9_]+' supabase/migrations \
  | sed -E 's/.* //; s/^public\.//' \
  | sort -u > "$tmp_dir/sql-rpcs"

# Storage buckets also use `.from(...)` but are not SQL relations.
printf '%s\n' school-admin | sort -u > "$tmp_dir/storage-buckets"
comm -23 "$tmp_dir/frontend-relations" "$tmp_dir/storage-buckets" > "$tmp_dir/frontend-sql-relations"

missing_relations="$(comm -23 "$tmp_dir/frontend-sql-relations" "$tmp_dir/sql-relations")"
missing_rpcs="$(comm -23 "$tmp_dir/frontend-rpcs" "$tmp_dir/sql-rpcs")"

if [[ -n "$missing_relations" || -n "$missing_rpcs" ]]; then
  [[ -z "$missing_relations" ]] || printf 'Relations Supabase sans définition SQL détectée :\n%s\n' "$missing_relations" >&2
  [[ -z "$missing_rpcs" ]] || printf 'RPC Supabase sans définition SQL détectée :\n%s\n' "$missing_rpcs" >&2
  exit 1
fi

printf 'Contrats Supabase vérifiés : %s relations et %s RPC.\n' \
  "$(wc -l < "$tmp_dir/frontend-sql-relations" | tr -d ' ')" \
  "$(wc -l < "$tmp_dir/frontend-rpcs" | tr -d ' ')"
