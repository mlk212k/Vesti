/**
 * Identité et coordonnées. Seules les informations publiées par Radio
 * Tripoint figurent ici ; un champ `null` est une information que
 * l'éditeur doit fournir — il s'affiche « à compléter », jamais inventé.
 */
export const site = {
  nom: "Radio Tripoint",
  nomOfficiel: "Radio Tripoint Officiel",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.radio-tripoint-officiel.fr").replace(
    /\/$/,
    "",
  ),
  signature: "La radio qui fait vibrer les Trois Frontières.",
  description:
    "Radio et média transfrontalier entre la France, le Luxembourg et l'Allemagne : actualités locales, émissions, podcasts, sport, culture et agenda des Trois Frontières, depuis Sierck-les-Bains.",
  langue: "fr-FR",
  pays: ["France", "Luxembourg", "Allemagne"] as const,

  contact: {
    telephone: "06 58 22 17 48",
    telephoneE164: "+33658221748",
    email: "info@radio-tripoint-officiel.fr",
    adresse: {
      lieu: "Hôtel de ville",
      rue: "12 Quai des Ducs de Lorraine",
      codePostal: "57480",
      ville: "Sierck-les-Bains",
      pays: "FR",
    },
    itineraire:
      "https://www.google.com/maps/search/?api=1&query=H%C3%B4tel+de+ville%2C+12+Quai+des+Ducs+de+Lorraine%2C+57480+Sierck-les-Bains",
  },

  /**
   * Visuels réels. Déposer les fichiers dans `public/brand/` puis renseigner
   * le chemin. Tant que `logo` est null, l'en-tête affiche le nom en
   * toutes lettres (ce n'est pas une refonte du logo, c'est son absence).
   */
  visuels: {
    logo: null as string | null, // ex. "/brand/logo-radio-tripoint.svg"
    logoSombre: null as string | null, // variante pour fond sombre
    hero: null as string | null, // ex. "/media/hero-moselle.jpg"
  },

  /** Mentions légales : à compléter par l'éditeur. */
  legal: {
    formeJuridique: null as string | null,
    siret: null as string | null,
    directeurPublication: null as string | null,
    hebergeur: {
      nom: "Vercel Inc.",
      adresse: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
      site: "https://vercel.com",
    },
  },
} as const

export const adresseLigne = `${site.contact.adresse.lieu}, ${site.contact.adresse.rue}, ${site.contact.adresse.codePostal} ${site.contact.adresse.ville}`
