#!/usr/bin/env bash
#
# Vérifie qu'aucun `var(--quelque-chose)` écrit dans le code ne pointe vers
# une variable CSS qui n'existe plus.
#
# Pourquoi ce script existe : une couleur écrite à la main dans du JSX
# (`stroke="var(--braise)"`, `accent-[var(--braise)]`) échappe à toute
# migration de classes Tailwind. C'est passé DEUX fois lors d'un changement
# de direction artistique, et ça ne casse rien de visible au build : la
# valeur devient simplement invalide, donc la case à cocher redevient bleue,
# les barres du graphique disparaissent, le trait d'alerte s'éteint.
#
#   ./scripts/check-tokens.sh
set -euo pipefail

cd "$(dirname "$0")/.."

CSS="app/globals.css"

definies=$(grep -oE '^\s*--[a-z0-9-]+:' "$CSS" | tr -d ' :' | sort -u)

manquantes=""
while IFS= read -r ligne; do
  [ -z "$ligne" ] && continue
  fichier="${ligne%%:*}"
  variable=$(printf '%s' "$ligne" | grep -oE '\-\-[a-z0-9-]+' | head -1)
  if ! printf '%s\n' "$definies" | grep -qx -- "$variable"; then
    manquantes="${manquantes}${variable} → ${fichier}"$'\n'
  fi
done < <(grep -rno 'var(--[a-z0-9-]*)' app components lib --include='*.tsx' --include='*.ts' || true)

if [ -n "$manquantes" ]; then
  echo "Variables CSS référencées mais non définies dans $CSS :"
  echo ""
  printf '%s' "$manquantes" | sort -u | sed 's/^/  /'
  echo ""
  exit 1
fi

echo "→ Jetons CSS : toutes les variables référencées existent."
