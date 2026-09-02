#!/usr/bin/env bash
# Applique les migrations sur une base jetable et lance les tests.
#
# Postgres local jetable (une seule fois) :
#   sudo -u postgres /usr/lib/postgresql/16/bin/initdb -D /tmp/pgdata-vesti -U postgres --auth=trust
#   sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl -D /tmp/pgdata-vesti -l /tmp/pg.log \
#        -o '-p 5433 -k /tmp' start
#
# Puis :
#   sudo -u postgres env PGHOST=/tmp PGPORT=5433 PGUSER=postgres ./supabase/tests/run.sh
#
# Rejoue tout depuis zéro à chaque exécution : la base de test est recréée.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
DB="${TEST_DB:-vesti_test}"

PSQL=(psql -v ON_ERROR_STOP=1 -q)

echo "→ recréation de la base $DB"
"${PSQL[@]}" -d postgres -c "drop database if exists $DB" >/dev/null
"${PSQL[@]}" -d postgres -c "create database $DB" >/dev/null

echo "→ shim Supabase (rôles, auth.uid, privilèges par défaut)"
"${PSQL[@]}" -d "$DB" -f "$HERE/00_supabase_shim.sql" >/dev/null

echo "→ migrations"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "   $(basename "$f")"
  "${PSQL[@]}" -d "$DB" -f "$f" >/dev/null
done

echo "→ tests fonctionnels"
# Le filtre garde aussi les ERROR, et PIPESTATUS propage l'échec de psql :
# sans ça un test qui plante ressort comme une suite verte tronquée.
"${PSQL[@]}" -d "$DB" -f "$HERE/01_quota_and_rls.sql" 2>&1 | grep -E "PASS|FAIL|ERROR|TOUS LES"
[ "${PIPESTATUS[0]}" -eq 0 ] || { echo "ÉCHEC : les tests fonctionnels se sont arrêtés"; exit 1; }

echo "→ test de concurrence du quota"
bash "$HERE/02_concurrency.sh" "$DB"
