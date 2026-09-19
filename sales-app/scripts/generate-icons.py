#!/usr/bin/env python3
"""Génère les icônes PNG de l'app (PWA, écran d'accueil, onglet).

Pourquoi un script et pas un fichier binaire déposé là : l'icône reprend
exactement le logo SVG (hexagone taillé + barre diagonale, dégradé violet ->
magenta). Si l'identité change, on modifie les constantes ici et on relance,
plutôt que de rouvrir un éditeur d'images et d'espérer retrouver les bonnes
couleurs.

    python3 scripts/generate-icons.py

Dépendances : aucune. Le PNG est écrit à la main (zlib + CRC), ce qui évite
d'ajouter Pillow au projet pour quatre fichiers générés une fois.
"""

import math
import struct
import zlib
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
PUBLIC = RACINE / "public"

FOND = (7, 7, 10)
VIOLET = (139, 92, 246)
MAGENTA = (255, 45, 134)
BLANC = (244, 242, 239)


def melange(a, b, t):
    """Interpolation linéaire entre deux couleurs."""
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def sur_couche(fond, couleur, alpha):
    return tuple(round(fond[i] + (couleur[i] - fond[i]) * alpha) for i in range(3))


def distance_segment(px, py, ax, ay, bx, by):
    """Distance d'un point au segment [AB]."""
    dx, dy = bx - ax, by - ay
    longueur = dx * dx + dy * dy
    if longueur == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / longueur))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def hexagone(cx, cy, rayon):
    """Sommets de l'hexagone du logo (pointe en haut)."""
    return [
        (cx + rayon * math.sin(math.radians(angle)),
         cy - rayon * math.cos(math.radians(angle)))
        for angle in range(0, 360, 60)
    ]


def dessiner(taille, marge_ratio):
    """Rend l'icône en mémoire. `marge_ratio` laisse la zone sûre maskable."""
    centre = taille / 2
    rayon = centre * (1 - marge_ratio)
    sommets = hexagone(centre, centre, rayon)
    aretes = [(sommets[i], sommets[(i + 1) % 6]) for i in range(6)]

    trait = max(taille * 0.045, 1.5)
    barre_trait = max(taille * 0.085, 2.0)

    # Barre diagonale, du bas-gauche vers le haut-droite.
    bx1, by1 = centre - rayon * 0.42, centre + rayon * 0.42
    bx2, by2 = centre + rayon * 0.42, centre - rayon * 0.42

    lignes = []
    for y in range(taille):
        ligne = bytearray()
        for x in range(taille):
            px, py = x + 0.5, y + 0.5

            # Fond : très léger halo violet en haut à droite.
            halo = max(0.0, 1 - math.hypot(px - taille * 0.82, py - taille * 0.18) / (taille * 0.7))
            couleur = sur_couche(FOND, VIOLET, 0.16 * halo * halo)

            # Le dégradé suit la diagonale, comme dans l'interface.
            t = max(0.0, min(1.0, (px + (taille - py)) / (2 * taille)))
            accent = melange(VIOLET, MAGENTA, t)

            d_hex = min(
                distance_segment(px, py, a[0], a[1], b[0], b[1]) for a, b in aretes
            )
            if d_hex < trait:
                alpha = min(1.0, (trait - d_hex) / 1.2)
                couleur = sur_couche(couleur, accent, alpha)

            d_barre = distance_segment(px, py, bx1, by1, bx2, by2)
            if d_barre < barre_trait:
                alpha = min(1.0, (barre_trait - d_barre) / 1.2)
                couleur = sur_couche(couleur, accent, alpha)

            # L'équerre blanche, posée sous la barre à droite — comme dans
            # le SVG, elle ne la chevauche pas.
            ex, ey = centre + rayon * 0.10, centre + rayon * 0.30
            cote = rayon * 0.34
            d_equerre = min(
                distance_segment(px, py, ex, ey, ex + cote, ey),
                distance_segment(px, py, ex + cote, ey, ex + cote, ey + cote),
            )
            if d_equerre < trait * 0.55:
                alpha = min(1.0, (trait * 0.55 - d_equerre) / 1.2)
                couleur = sur_couche(couleur, BLANC, alpha)

            ligne.extend(couleur)
        lignes.append(bytes(ligne))
    return lignes


def ecrire_png(chemin, lignes, taille):
    brut = b"".join(b"\x00" + ligne for ligne in lignes)

    def morceau(nom, data):
        return (
            struct.pack(">I", len(data))
            + nom
            + data
            + struct.pack(">I", zlib.crc32(nom + data) & 0xFFFFFFFF)
        )

    png = b"\x89PNG\r\n\x1a\n"
    png += morceau(b"IHDR", struct.pack(">IIBBBBB", taille, taille, 8, 2, 0, 0, 0))
    png += morceau(b"IDAT", zlib.compress(brut, 9))
    png += morceau(b"IEND", b"")
    chemin.write_bytes(png)
    print(f"  {chemin.relative_to(RACINE)} ({len(png) // 1024} Ko)")


def main():
    PUBLIC.mkdir(exist_ok=True)
    print("Génération des icônes :")

    for taille in (192, 512):
        # Icône classique : l'hexagone occupe presque tout le carré.
        ecrire_png(PUBLIC / f"icon-{taille}.png", dessiner(taille, 0.10), taille)
        # Version maskable : Android rogne les bords, d'où la marge.
        ecrire_png(
            PUBLIC / f"icon-{taille}-maskable.png", dessiner(taille, 0.26), taille
        )

    ecrire_png(PUBLIC / "apple-icon.png", dessiner(180, 0.12), 180)


if __name__ == "__main__":
    main()
