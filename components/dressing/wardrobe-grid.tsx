"use client";

import { useState } from "react";
import type { CropBox } from "@/lib/claude/schemas";
import { GarmentThumb } from "@/components/analyze/garment-thumb";

export interface WardrobeItem {
  id: string;
  category: string;
  label: string;
  color: string | null;
  material: string | null;
  brand: string | null;
  brand_confidence: "logo_visible" | "suppose" | "inconnue" | null;
  crop_box: CropBox | null;
  source_image_path: string | null;
  product_matches: {
    title: string;
    merchant: string;
    url: string;
    price: string | null;
    /** Photo de la fiche produit, relevée après coup. Souvent absente. */
    image?: string | null;
  }[];
  created_at: string;
}

const CATEGORIES = [
  { value: "all", label: "Tout" },
  { value: "haut", label: "Hauts" },
  { value: "bas", label: "Bas" },
  { value: "robe", label: "Robes" },
  { value: "veste", label: "Vestes" },
  { value: "chaussures", label: "Chaussures" },
  { value: "accessoire", label: "Accessoires" },
];

/**
 * La garde-robe, en rayon.
 *
 * ── Ce que c'était, et pourquoi ça ne pouvait pas marcher ───────────────────
 *
 * Une LISTE VERTICALE de lignes encadrées, chacune portant une vignette de
 * 64 px à gauche et trois lignes de texte à droite. Autrement dit : un tableau
 * de données qui se trouve contenir des habits. La photo y était une pièce
 * justificative de 4 % de la surface, le reste étant du texte et des bordures.
 *
 * Aucune enseigne de vêtement ne présente ses pièces comme ça, et pour une
 * raison qui n'est pas de goût : on ne choisit pas un vêtement en lisant son
 * libellé, on le choisit en le VOYANT. Zara, COS, Arket, Uniqlo montrent tous
 * la même chose — deux colonnes, portrait, image jusqu'aux bords, légende
 * minuscule en dessous.
 *
 * ── Les quatre décisions ────────────────────────────────────────────────────
 *
 * 1. DEUX COLONNES, PORTRAIT 3:4. Le portrait est le format du vêtement porté ;
 *    le carré coupe les jambes et les manches. Deux colonnes sur 390 px donnent
 *    des photos d'environ 180 px de large — assez pour reconnaître une pièce
 *    d'un coup d'œil, ce que 64 px ne permettait pas.
 *
 * 2. AUCUNE CARTE. Pas de bordure, pas de fond, pas de coin arrondi autour
 *    d'une pièce. La photo EST l'objet ; l'encadrer revenait à mettre un
 *    cadre autour d'un cadre. C'est aussi ce qui produisait l'impression de
 *    « gros blocs ».
 *
 * 3. UN FILET D'1 PX ENTRE LES CELLULES, obtenu par un fond de grille qui
 *    transparaît dans le `gap`. Une seule ligne sépare deux photos, comme les
 *    rayonnages d'une boutique — et non douze bordures fermées.
 *
 * 4. LA LÉGENDE PASSE SOUS LA PHOTO, en deux niveaux : le nom en bas de casse,
 *    la matière et la couleur en micro-libellé capitales. La marque ne
 *    s'affiche que si elle est CERTAINE (logo lu sur la photo) : une marque
 *    supposée imprimée en capitales sous une pièce se lit comme une
 *    affirmation, ce qu'elle n'est pas.
 */
export function WardrobeGrid({
  items,
  urls,
}: {
  items: WardrobeItem[];
  urls: Record<string, string>;
}) {
  const [category, setCategory] = useState("all");

  const present = new Set(items.map((item) => item.category));
  const tabs = CATEGORIES.filter(
    (tab) => tab.value === "all" || present.has(tab.value)
  );
  const visible =
    category === "all" ? items : items.filter((item) => item.category === category);

  return (
    <div className="flex flex-col gap-5">
      {/*
        Le filtre : du texte souligné, pas des gélules colorées.

        Une rangée de pastilles violettes en haut d'une grille de photos
        détourne l'œil de ce qu'on est venu regarder. Le trait sous l'onglet
        actif suffit à dire où l'on est — c'est le rayon d'une boutique, pas
        une barre d'outils. Le trait est posé sur toute la rangée, et seul
        l'onglet actif le porte en accent.
      */}
      <div className="-mx-5 overflow-x-auto px-5">
        <div className="flex min-w-max gap-6 border-b border-border-soft">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setCategory(tab.value)}
              aria-pressed={category === tab.value}
              // 44 px de haut : la cible tactile reste réglementaire même si le
              // texte, lui, ne fait que 11 px.
              className={`label min-h-[44px] flex-none border-b-2 pb-1 transition-colors ${
                category === tab.value
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/*
        La grille. `gap-px` sur un fond de bordure : c'est le fond qui
        transparaît entre les cellules et dessine le filet, sans qu'aucune
        cellule ne porte de bordure à elle. Les marges négatives portent la
        grille jusqu'aux bords de l'écran — une photo qui s'arrête à 20 px du
        bord n'est plus une photo de rayon, c'est une image dans un document.
      */}
      <ul className="-mx-5 grid grid-cols-2 gap-px bg-border-soft">
        {visible.map((item) => (
          /* ⚠️ UN SEUL FOND PAR CELLULE. La photo était posée sur `surface` et la
                légende sur `background` : chaque cellule se lisait en deux morceaux,
                avec une césure horizontale au milieu. Vue en grille, l'erreur saute
                aux yeux — c'est le genre de défaut qu'aucun test ne rattrape et que
                seul un rendu montre. */
            <li key={item.id} className="flex flex-col bg-surface">
            {/*
              ── QUELLE PHOTO MONTRER ────────────────────────────────────────

              La photo d'une fiche produit quand on en a une, la découpe de la
              photo de l'utilisateur sinon.

              ⚠️ ET ELLE EST TOUJOURS ÉTIQUETÉE. Une photo catalogue n'est PAS
              la pièce de l'utilisateur : c'est un article approchant, trouvé
              par recherche web. L'afficher nue reviendrait à montrer le
              vêtement de quelqu'un d'autre et à le faire passer pour le sien.
              Le commentaire de la colonne `product_matches` en base le dit
              déjà : « présentés comme pièces similaires, jamais comme la
              référence exacte ».

              Chercher la référence EXACTE n'est pas possible sur ces données :
              sur 235 pièces, 185 n'ont aucune marque identifiée et 12 ne l'ont
              que supposée. Une seule porte aujourd'hui une photo catalogue —
              d'où le repli, qui reste le cas normal et non l'exception.
            */}
            {productImage(item) ? (
              <div className="relative aspect-[3/4] w-full overflow-hidden p-[14%]">
                {/* Une photo de fiche produit est DÉJÀ détourée sur fond blanc :
                    `object-contain` la pose entière, sans la recadrer. La même
                    marge que les découpes, pour que deux cellules voisines ne
                    reçoivent pas deux traitements différents. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={productImage(item)!}
                  alt={`Pièce similaire à ${item.label}`}
                  loading="lazy"
                  className="h-full w-full object-contain"
                />
                <span className="label absolute left-3 top-3 text-muted">
                  Similaire
                </span>
              </div>
            ) : (
              /*
                ── L'APPROXIMATION CATALOGUE ─────────────────────────────────

                La pièce ne remplit plus sa cellule : elle FLOTTE sur un fond
                clair, avec de la marge autour. C'est la convention de toutes
                les fiches produit, et c'est ce qui fait qu'une photo se lit
                comme un article plutôt que comme un bout de photo de
                quelqu'un.

                ⚠️ CE N'EST PAS UN DÉTOURAGE, et il ne faut pas le présenter
                comme tel. Le fond de la photo d'origine est toujours là,
                simplement resserré autour du vêtement par le recadrage. Sur
                une pièce cadrée serré l'effet est proche ; sur une photo prise
                de loin, on verra le décor. Un vrai détourage suppose de
                supprimer l'arrière-plan — API payante ou modèle chargé dans le
                navigateur — ce qui est un autre chantier.

                `p-[14%]` plutôt qu'une valeur en pixels : la marge doit rester
                proportionnelle, la cellule faisant 180 px sur un téléphone et
                davantage sur une tablette.
              */
              <div className="aspect-[3/4] w-full p-[14%]">
                <GarmentThumb
                  imageUrl={item.source_image_path ? (urls[item.source_image_path] ?? "") : ""}
                  cropBox={item.crop_box}
                  alt={item.label}
                  frame="h-full w-full"
                />
              </div>
            )}

            <div className="flex flex-col gap-1 px-3 pt-3 pb-5">
              <span className="truncate text-[14px] leading-snug">{item.label}</span>

              {(item.color || item.material) && (
                <span className="label truncate text-muted">
                  {[item.color, item.material].filter(Boolean).join(" · ")}
                </span>
              )}

              {/* Marque affichée seulement quand le logo a été lu. Une marque
                  supposée devient une affirmation dès qu'on l'imprime. */}
              {item.brand && item.brand_confidence === "logo_visible" && (
                <span className="label truncate text-foreground">{item.brand}</span>
              )}

              {item.product_matches?.length > 0 && (
                <a
                  href={item.product_matches[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="label mt-1 truncate text-accent-strong underline underline-offset-4"
                >
                  {/* Quand la photo au-dessus EST déjà celle du produit, le
                      lien nomme le marchand plutôt que de répéter
                      « pièce similaire » que l'étiquette dit déjà. */}
                  {productImage(item)
                    ? item.product_matches[0].merchant || "Voir la pièce"
                    : "Pièce similaire"}
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * La photo de fiche produit, quand il y en a une d'exploitable.
 *
 * Isolée parce que deux endroits en dépendent — le cadre et le libellé du lien
 * — et qu'ils doivent répondre la même chose. Une chaîne vide compte comme
 * absente : `fetch-image.ts` rend `null` quand la page ne publie rien, mais un
 * enregistrement ancien peut porter une chaîne vide.
 */
function productImage(item: WardrobeItem): string | null {
  const image = item.product_matches?.[0]?.image;
  return typeof image === "string" && image.trim().length > 0 ? image : null;
}
