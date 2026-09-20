/**
 * Les données de planning partagées entre le serveur et le client.
 *
 * POURQUOI CE FICHIER EXISTE, et pourquoi `JOURS` ne doit pas retourner
 * dans `components/planning-editor.tsx` :
 *
 * Ce composant porte `"use client"`. Quand un composant SERVEUR importe une
 * valeur ordinaire depuis un module client, Next ne lui donne pas la valeur
 * mais une RÉFÉRENCE au module client — un objet opaque destiné au
 * navigateur. Le tableau devient alors quelque chose qui n'a pas de
 * `.map()`, et la page serveur plante avec :
 *
 *     TypeError: JOURS.map is not a function
 *
 * C'est exactement ce qui est arrivé à la page Planning : elle affichait
 * l'écran d'erreur au lieu du planning. Rien dans le typage ne l'annonce,
 * rien n'échoue au build — ça ne se voit qu'à l'exécution.
 *
 * La règle générale : une constante partagée entre serveur et client vit
 * dans un module NEUTRE, sans directive. Les deux côtés l'importent d'ici.
 */

export const JOURS = [
  { num: 1, court: "LUN", long: "Lundi" },
  { num: 2, court: "MAR", long: "Mardi" },
  { num: 3, court: "MER", long: "Mercredi" },
  { num: 4, court: "JEU", long: "Jeudi" },
  { num: 5, court: "VEN", long: "Vendredi" },
  { num: 6, court: "SAM", long: "Samedi" },
  { num: 7, court: "DIM", long: "Dimanche" },
] as const;

/** Un créneau déclaré : un jour ISO (1 = lundi) et une demi-journée. */
export type Creneau = { weekday: number; slot: "am" | "pm" };
