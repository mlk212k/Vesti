import { site } from "@/config/site"
import { radioConfig } from "@/config/radioConfig"
import { reseauxActifs } from "@/config/socialLinks"
import type { Article } from "@/types/article"
import type { Evenement } from "@/types/event"
import type { Episode } from "@/types/podcast"
import type { Emission } from "@/types/show"
import { categories } from "@/data/categories"
import { dureeIso } from "@/lib/utils/dates"
import { urlAbsolue } from "./metadata"

const ORG_ID = `${site.url}/#organisation`
const WEB_ID = `${site.url}/#site`

const adresse = {
  "@type": "PostalAddress",
  streetAddress: site.contact.adresse.rue,
  postalCode: site.contact.adresse.codePostal,
  addressLocality: site.contact.adresse.ville,
  addressRegion: "Moselle, Grand Est",
  addressCountry: site.contact.adresse.pays,
}

export function jsonLdOrganisation() {
  const sameAs = reseauxActifs().map((r) => r.url)
  if (radioConfig.radiokingUrl) sameAs.push(radioConfig.radiokingUrl)
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["RadioStation", "NewsMediaOrganization"],
        "@id": ORG_ID,
        name: site.nomOfficiel,
        alternateName: site.nom,
        url: site.url,
        description: site.description,
        telephone: site.contact.telephoneE164,
        email: site.contact.email,
        address: adresse,
        areaServed: [
          { "@type": "AdministrativeArea", name: "Moselle" },
          { "@type": "Country", name: "France" },
          { "@type": "Country", name: "Luxembourg" },
          { "@type": "AdministrativeArea", name: "Sarre" },
          { "@type": "Place", name: "Grande Région" },
        ],
        ...(site.visuels.logo ? { logo: urlAbsolue(site.visuels.logo) } : {}),
        ...(sameAs.length ? { sameAs } : {}),
      },
      {
        "@type": "WebSite",
        "@id": WEB_ID,
        url: site.url,
        name: site.nomOfficiel,
        inLanguage: "fr-FR",
        publisher: { "@id": ORG_ID },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${site.url}/recherche?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  }
}

export function jsonLdFilAriane(elements: { nom: string; chemin: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: elements.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: e.nom,
      item: urlAbsolue(e.chemin),
    })),
  }
}

export function jsonLdArticle(a: Article) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: a.titre,
    description: a.chapeau,
    datePublished: a.publieLe,
    dateModified: a.modifieLe ?? a.publieLe,
    inLanguage: "fr-FR",
    articleSection: categories[a.categorie].nom,
    mainEntityOfPage: urlAbsolue(`/actualites/${a.slug}`),
    image: a.visuel
      ? [urlAbsolue(a.visuel.src)]
      : [urlAbsolue(`/actualites/${a.slug}/opengraph-image`)],
    author: a.auteur ? { "@type": "Person", name: a.auteur } : { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    ...(a.lieux?.length
      ? { contentLocation: a.lieux.map((l) => ({ "@type": "Place", name: l })) }
      : {}),
  }
}

export function jsonLdEvenement(e: Evenement) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.titre,
    description: e.description,
    startDate: e.debut,
    ...(e.fin ? { endDate: e.fin } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: e.lieu,
      address: {
        "@type": "PostalAddress",
        streetAddress: e.adresse,
        addressLocality: e.ville,
        addressCountry: e.pays,
      },
    },
    ...(e.organisateur ? { organizer: { "@type": "Organization", name: e.organisateur } } : {}),
    ...(e.visuel ? { image: [urlAbsolue(e.visuel.src)] } : {}),
    ...(e.gratuit ? { isAccessibleForFree: true } : {}),
    url: urlAbsolue(`/agenda/${e.slug}`),
  }
}

export function jsonLdEpisode(ep: Episode, emission?: Emission | null) {
  return {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: ep.titre,
    description: ep.description,
    datePublished: ep.publieLe,
    timeRequired: dureeIso(ep.duree),
    url: urlAbsolue(`/podcasts/${ep.slug}`),
    associatedMedia: {
      "@type": "MediaObject",
      contentUrl: ep.audioUrl.startsWith("http") ? ep.audioUrl : urlAbsolue(ep.audioUrl),
    },
    ...(emission
      ? {
          partOfSeries: {
            "@type": "RadioSeries",
            name: emission.nom,
            url: urlAbsolue(`/emissions/${emission.slug}`),
          },
        }
      : {}),
    publisher: { "@id": ORG_ID },
  }
}

export function jsonLdEmission(e: Emission) {
  return {
    "@context": "https://schema.org",
    "@type": "RadioSeries",
    name: e.nom,
    ...(e.accroche || e.presentation ? { description: e.presentation ?? e.accroche } : {}),
    genre: e.thematique,
    url: urlAbsolue(`/emissions/${e.slug}`),
    productionCompany: { "@id": ORG_ID },
    ...(e.animateurs?.length
      ? { actor: e.animateurs.map((n) => ({ "@type": "Person", name: n })) }
      : {}),
  }
}
