#!/usr/bin/env bash
# Le test qui compte pour la facture Claude : 12 requêtes d'analyse lancées en
# parallèle sur un compte gratuit (quota 3) ne doivent en autoriser QUE 3.
#
# Un "check puis update" écrit en JS laisse ici passer les 12 : elles lisent
# toutes analyses_used = 0 avant que la première n'écrive. Le SELECT ... FOR
# UPDATE de consume_analysis_quota() est ce qui les sérialise.
set -euo pipefail

DB="${1:-vesti_test}"
UID_TEST="33333333-3333-3333-3333-333333333333"
PARALLEL=12
QUOTA=3

psql -v ON_ERROR_STOP=1 -q -d "$DB" >/dev/null <<SQL
delete from auth.users where id = '$UID_TEST';
insert into auth.users (id, email) values ('$UID_TEST', 'concurrence@test.fr');
update public.profiles set plan = 'free', analyses_used = 0, period_start = now()
 where id = '$UID_TEST';
SQL

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for i in $(seq 1 "$PARALLEL"); do
  (
    psql -v ON_ERROR_STOP=1 -tA -q -d "$DB" <<SQL > "$TMP/out.$i" 2>/dev/null
begin;
select set_config('request.jwt.claim.sub', '$UID_TEST', true);
set local role authenticated;
-- point de rendez-vous : toutes les sessions arrivent ensemble sur la fonction
select pg_sleep(0.4);
select allowed from public.consume_analysis_quota('outfit');
commit;
SQL
  ) &
done
wait

granted=$(cat "$TMP"/out.* | grep -c '^t$' || true)
used=$(psql -tA -q -d "$DB" -c "select analyses_used from public.profiles where id = '$UID_TEST'")

echo "   $PARALLEL requêtes simultanées, quota $QUOTA → $granted autorisées, analyses_used = $used"

if [ "$granted" -eq "$QUOTA" ] && [ "$used" -eq "$QUOTA" ]; then
  echo "PASS  concurrence : le quota tient sous $PARALLEL requêtes parallèles"
else
  echo "FAIL  concurrence : $granted autorisées / compteur $used (attendu $QUOTA)"
  exit 1
fi
