/**
 * Réseaux sociaux de Radio Tripoint.
 *
 * Le site actuel mentionne Facebook, Instagram et Telegram, mais les
 * adresses exactes n'ont pas pu être vérifiées : elles restent vides.
 * Un réseau sans URL n'est affiché nulle part — il suffit de coller
 * l'adresse ici pour qu'il apparaisse dans le pied de page, la page
 * Contact et les pages émission.
 */
export type ReseauSocial = "facebook" | "instagram" | "telegram" | "tiktok" | "youtube" | "x"

export const socialLinks: Record<ReseauSocial, string> = {
  facebook: "",
  instagram: "",
  telegram: "",
  tiktok: "",
  youtube: "",
  x: "",
}

export const libellesReseaux: Record<ReseauSocial, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  telegram: "Telegram",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X",
}

export function reseauxActifs(): { reseau: ReseauSocial; url: string; libelle: string }[] {
  return (Object.keys(socialLinks) as ReseauSocial[])
    .filter((r) => socialLinks[r].trim().length > 0)
    .map((r) => ({ reseau: r, url: socialLinks[r], libelle: libellesReseaux[r] }))
}
