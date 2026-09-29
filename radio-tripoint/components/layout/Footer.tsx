import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react"
import Link from "next/link"
import { site } from "@/config/site"
import { reseauxActifs } from "@/config/socialLinks"
import { IconeReseau } from "@/components/marque/IconesReseaux"
import { Logo } from "@/components/marque/Logo"
import { Tripoint } from "@/components/marque/Tripoint"
import { ThemeToggle } from "./ThemeToggle"

const colonnes = [
  {
    titre: "Écouter & lire",
    liens: [
      { libelle: "Actualités", href: "/actualites" },
      { libelle: "Émissions", href: "/emissions" },
      { libelle: "Podcasts & replays", href: "/podcasts" },
      { libelle: "Agenda", href: "/agenda" },
    ],
  },
  {
    titre: "Explorer",
    liens: [
      { libelle: "Art & Culture", href: "/art-culture" },
      { libelle: "Actu Music", href: "/actu-music" },
      { libelle: "Actu People", href: "/actu-people" },
      { libelle: "Mode & Style", href: "/mode-style" },
      { libelle: "Sport", href: "/sport" },
      { libelle: "Prévention", href: "/prevention" },
    ],
  },
  {
    titre: "Professionnels",
    liens: [
      { libelle: "Publicité", href: "/publicite" },
      { libelle: "Partenariats", href: "/publicite#partenariats" },
      { libelle: "Soumettre une information", href: "/soumettre-une-information" },
      { libelle: "À propos", href: "/a-propos" },
    ],
  },
]

export function Footer() {
  const reseaux = reseauxActifs()
  const a = site.contact.adresse
  return (
    <footer className="bg-nuit text-nuit-encre relative overflow-hidden">
      <Tripoint
        className="text-nuit-trait/70 pointer-events-none absolute top-10 -right-40 size-[36rem]"
        epaisseur={1}
        point={false}
      />
      <div className="conteneur relative pt-16 pb-10 lg:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Logo sombre className="[&>span:last-child]:text-[2.2rem]" />
            <p className="presse text-nuit-encre-2 mt-5 max-w-sm text-[1.15rem] leading-snug">
              La radio et le média des Trois Frontières. France, Luxembourg, Allemagne&nbsp;: une
              seule antenne.
            </p>
            {reseaux.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="Réseaux sociaux">
                {reseaux.map((r) => (
                  <li key={r.reseau}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener"
                      aria-label={`Radio Tripoint sur ${r.libelle}`}
                      className="border-nuit-trait hover:border-nuit-encre hover:bg-nuit-2 grid size-11 place-items-center rounded-full border transition-colors"
                    >
                      <IconeReseau reseau={r.reseau} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {colonnes.map((c) => (
              <nav key={c.titre} aria-label={c.titre}>
                <p className="surtitre text-nuit-encre-2">{c.titre}</p>
                <ul className="mt-4 space-y-2.5">
                  {c.liens.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-nuit-encre/90 hover:text-nuit-accent text-[0.95rem] transition-colors"
                      >
                        {l.libelle}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            <div className="col-span-2 sm:col-span-1">
              <p className="surtitre text-nuit-encre-2">Contact</p>
              <ul className="mt-4 space-y-3 text-[0.95rem]">
                <li>
                  <a
                    href={`tel:${site.contact.telephoneE164}`}
                    className="hover:text-nuit-accent inline-flex items-center gap-2"
                  >
                    <Phone className="text-nuit-encre-2 size-4 flex-none" aria-hidden />
                    {site.contact.telephone}
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${site.contact.email}`}
                    className="hover:text-nuit-accent inline-flex items-start gap-2 break-all"
                  >
                    <Mail className="text-nuit-encre-2 mt-1 size-4 flex-none" aria-hidden />
                    {site.contact.email}
                  </a>
                </li>
                <li>
                  <a
                    href={site.contact.itineraire}
                    target="_blank"
                    rel="noopener"
                    className="hover:text-nuit-accent inline-flex items-start gap-2"
                  >
                    <MapPin className="text-nuit-encre-2 mt-1 size-4 flex-none" aria-hidden />
                    <address className="not-italic">
                      {a.lieu}
                      <br />
                      {a.rue}
                      <br />
                      {a.codePostal} {a.ville}
                    </address>
                  </a>
                </li>
              </ul>
              <Link href="/contact" className="lien-fleche text-nuit-accent mt-5">
                Nous écrire <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>

        {/* Texte décoratif en pseudo-élément : hors de l'arbre d'accessibilité. */}
        <p
          aria-hidden
          data-texte="France · Luxembourg · Allemagne"
          className="titre-affiche border-nuit-trait text-nuit-encre/10 mt-16 border-t pt-8 text-[clamp(2.2rem,1rem+6vw,6.5rem)] select-none before:content-[attr(data-texte)]"
        />

        <div className="text-nuit-encre-2 mt-8 flex flex-col gap-4 text-sm md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {site.nomOfficiel}
          </p>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <li>
              <Link href="/mentions-legales" className="hover:text-nuit-encre">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link href="/politique-confidentialite" className="hover:text-nuit-encre">
                Politique de confidentialité
              </Link>
            </li>
            <li>
              <Link href="/politique-confidentialite#cookies" className="hover:text-nuit-encre">
                Cookies
              </Link>
            </li>
            <li>
              <ThemeToggle className="hover:text-nuit-encre inline-flex items-center gap-2" />
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
