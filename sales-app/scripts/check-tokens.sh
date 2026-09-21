#!/usr/bin/env bash
#
# Deux vérifications, contre deux façons DIFFÉRENTES de rater un changement
# de direction artistique. Les deux sont arrivées pour de vrai.
#
#   1. UNE VARIABLE QUI N'EXISTE PLUS.  `stroke="var(--braise)"` après un
#      renommage : la valeur devient invalide en silence, donc la case à
#      cocher redevient bleue et les barres du graphique disparaissent. Rien
#      ne casse au build.
#
#   2. UNE COULEUR ÉCRITE EN DUR.  `#ffa878`, `rgba(204,255,0,.12)` : celle-là
#      ne devient même pas invalide — elle reste parfaitement valide, et
#      parfaitement fausse. La vérification 1 ne peut RIEN voir. Au passage à
#      CHROME, six fichiers gardaient ainsi la palette précédente, dont un
#      vert acide hérité d'une direction encore antérieure.
#
# La seule exception légitime est `app/global-error.tsx` : il remplace le
# document entier, feuille de style comprise, donc aucune variable CSS
# n'existe à ce moment-là. Il est déclaré ci-dessous.
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

# ---------------------------------------------------------------------------
# 2. Les couleurs écrites en dur
# ---------------------------------------------------------------------------
# Tolérées : le noir et le blanc purs, les gris neutres en `rgba(255,255,255,…)`
# et `rgba(0,0,0,…)` (ce sont des voiles, pas des couleurs de marque), et le
# fichier d'erreur globale qui n'a pas le choix.

EXEMPT="app/global-error.tsx"

# Les hex de la palette en cours, extraits de globals.css : une couleur en dur
# qui coïncide avec un jeton reste un doublon, mais pas une FAUSSE couleur.
palette=$(grep -oE '#[0-9a-fA-F]{6}' "$CSS" | tr 'A-F' 'a-f' | sort -u)

suspectes=""
while IFS= read -r ligne; do
  [ -z "$ligne" ] && continue
  fichier="${ligne%%:*}"
  [ "$fichier" = "$EXEMPT" ] && continue
  couleur=$(printf '%s' "$ligne" | grep -oE '#[0-9a-fA-F]{6}' | head -1 | tr 'A-F' 'a-f')
  case "$couleur" in
    '#000000' | '#ffffff') continue ;;
  esac
  if ! printf '%s\n' "$palette" | grep -qx -- "$couleur"; then
    suspectes="${suspectes}${couleur} → ${fichier}"$'\n'
  fi
done < <(grep -rnoE '#[0-9a-fA-F]{6}' app components lib --include='*.tsx' --include='*.ts' || true)

if [ -n "$suspectes" ]; then
  echo "Couleurs écrites en dur, absentes de la palette de $CSS :"
  echo ""
  printf '%s' "$suspectes" | sort -u | sed 's/^/  /'
  echo ""
  echo "Une couleur en dur survit à tout changement de direction artistique."
  echo "La remplacer par un jeton, ou l'ajouter à la palette si elle est"
  echo "vraiment propre à ce composant."
  exit 1
fi

echo "→ Jetons CSS : toutes les variables référencées existent."
echo "→ Couleurs   : aucune couleur en dur hors palette."
