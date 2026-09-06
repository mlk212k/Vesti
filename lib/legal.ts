/**
 * Informations légales de l'éditeur.
 *
 * ⚠️ REMPLIS CE FICHIER AVANT LA MISE EN LIGNE. Tant qu'une valeur commence par
 * « [ », les pages légales affichent un bandeau d'avertissement bien visible :
 * publier des mentions incomplètes vaut mieux que de croire qu'elles sont
 * faites, mais ça ne remplace pas de les compléter.
 *
 * Ces textes sont des modèles sérieux mais génériques, écrits pour une petite
 * structure française vendant un abonnement à des particuliers. Fais-les relire
 * par un juriste avant d'encaisser : la responsabilité reste la tienne.
 */
export const LEGAL = {
  /** Raison sociale ou nom de l'entrepreneur individuel. */
  editeur: "Malik Ben Aissa",
  /** Auto-entrepreneur, SASU, SARL… */
  statut: "Entrepreneur individuel (auto-entrepreneur)",
  /**
   * SIRET, ou `null` tant que l'immatriculation n'est pas revenue.
   *
   * ⚠️ `null` n'est pas un moyen de s'en passer. Le SIRET est obligatoire dans
   * les mentions légales d'un professionnel français, et vendre à des
   * particuliers sans être immatriculé expose bien au-delà d'une page web. Ce
   * `null` sert à ne pas MENTIR en attendant : la page écrit alors
   * « immatriculation en cours » au lieu d'un crochet vide ou, pire, d'une
   * ligne absente qui laisserait croire que tout est en règle.
   */
  siret: null as string | null,
  /**
   * Statut TVA. Renseigné : Vesti relève aujourd'hui de la franchise en base.
   *
   * ⚠️ À remplacer par le numéro de TVA intracommunautaire le jour où le seuil
   * est franchi — en même temps que `VAT_ENABLED` dans `lib/tax.ts`. Les deux
   * vont ensemble : afficher une mention de franchise tout en collectant la TVA
   * (ou l'inverse) est une mention légale fausse.
   */
  tvaIntracom: "TVA non applicable, art. 293 B du CGI",
  adresse: "[ADRESSE POSTALE COMPLÈTE]",
  email: "contact@vesti8.app",
  telephone: "[TÉLÉPHONE]",
  /**
   * Déduit : en entreprise individuelle, l'éditeur et le directeur de la
   * publication sont la même personne. À changer si quelqu'un d'autre prend la
   * responsabilité éditoriale du site.
   */
  directeurPublication: "Malik Ben Aissa",

  /**
   * Obligatoire en B2C : tout professionnel vendant à des consommateurs doit
   * adhérer à un médiateur de la consommation et le mentionner dans ses CGV.
   */
  mediateur: {
    nom: "[NOM DU MÉDIATEUR DE LA CONSOMMATION]",
    site: "[SITE DU MÉDIATEUR]",
    adresse: "[ADRESSE DU MÉDIATEUR]",
  },

  /**
   * Contact pour les demandes RGPD — accès, rectification, suppression.
   *
   * Volontairement le même que l'adresse générale : une adresse dédiée qui
   * n'est relevée par personne est pire qu'une adresse unique qu'on lit
   * vraiment. Le délai de réponse légal est d'un mois.
   */
  emailRgpd: "contact@vesti8.app",

  hebergeurs: [
    { nom: "Vercel Inc.", role: "hébergement de l'application", lieu: "États-Unis / Union européenne" },
    // Région relevée sur le projet lui-même (`eu-west-1`), pas supposée.
    { nom: "Supabase", role: "base de données et stockage des photos", lieu: "Irlande (Union européenne)" },
  ],

  sousTraitants: [
    {
      nom: "Anthropic PBC",
      role: "analyse des photos et génération des conseils",
      lieu: "États-Unis",
      donnees: "photos envoyées, profil (taille, poids, morphologie, styles)",
    },
    {
      nom: "Stripe Payments Europe",
      role: "paiement et facturation",
      lieu: "Union européenne",
      donnees: "email, données de paiement (jamais stockées par nous)",
    },
    {
      nom: "Open-Meteo",
      role: "météo de la tenue du jour",
      lieu: "Union européenne",
      donnees: "coordonnées arrondies (~1 km)",
    },
  ],
} as const;

/** Une valeur est un gabarit tant qu'elle commence par un crochet. */
function isPlaceholder(value: string): boolean {
  return value.trim().startsWith("[");
}

/** Liste des champs encore à remplir — sert au bandeau d'avertissement. */
export function missingLegalFields(): string[] {
  const missing: string[] = [];

  const scalars: [string, string][] = [
    ["éditeur", LEGAL.editeur],
    ["statut juridique", LEGAL.statut],
    ["adresse", LEGAL.adresse],
    ["email de contact", LEGAL.email],
    ["directeur de la publication", LEGAL.directeurPublication],
    ["médiateur de la consommation", LEGAL.mediateur.nom],
    ["email RGPD", LEGAL.emailRgpd],
  ];

  for (const [label, value] of scalars) {
    if (isPlaceholder(value)) missing.push(label);
  }

  return missing;
}

export const LEGAL_PAGES = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/cgv", label: "CGV" },
  { href: "/confidentialite", label: "Confidentialité" },
] as const;
