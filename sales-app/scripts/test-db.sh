#!/usr/bin/env bash
#
# Rejoue le schéma complet sur un Postgres nu, puis lance les tests de règles
# métier et de RLS.
#
#   PGHOST=... PGPORT=... ./scripts/test-db.sh
#
# La base `sales_app_test` est recréée à chaque exécution : les tests partent
# toujours d'un état vierge, sinon le deuxième passage vert ne prouve rien.
set -euo pipefail

cd "$(dirname "$0")/.."

BASE="${TEST_DB:-sales_app_test}"

echo "→ Recréation de la base $BASE"
psql -q -d postgres -c "drop database if exists $BASE" >/dev/null
psql -q -d postgres -c "create database $BASE" >/dev/null

echo "→ Objets Supabase simulés"
psql -v ON_ERROR_STOP=1 -q -d "$BASE" -f supabase/tests/00_stub_supabase.sql 2>&1 \
  | grep -v "wal_level" | grep -v "HINT" || true

echo "→ Migrations"
for fichier in supabase/migrations/*.sql; do
  echo "   $(basename "$fichier")"
  psql -v ON_ERROR_STOP=1 -q -d "$BASE" -f "$fichier"
done

echo "→ Tests"
psql -v ON_ERROR_STOP=1 -q -d "$BASE" -f supabase/tests/01_regles.sql 2>&1 \
  | sed 's/^psql:[^ ]*: NOTICE:  //'
