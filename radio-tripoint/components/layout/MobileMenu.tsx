"use client"

import { ArrowUpRight, Mail, Phone, Search, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { estActif, navPlus, navRubriques } from "@/config/navigation"
import { site } from "@/config/site"
import { reseauxActifs } from "@/config/socialLinks"
import { BoutonDirect } from "@/components/radio/BoutonDirect"
import { IconeReseau } from "@/components/marque/IconesReseaux"
import { Logo } from "@/components/marque/Logo"
import { Tripoint } from "@/components/marque/Tripoint"
import { cn } from "@/lib/utils/cn"
import { Dialogue } from "./Dialogue"

const essentiels = [
  { libelle: "Actualités", href: "/actualites", detail: "Le fil des Trois Frontières" },
  { libelle: "Émissions", href: "/emissions", detail: "Nos rendez-vous à l'antenne" },
  { libelle: "Podcasts", href: "/podcasts", detail: "Replays et épisodes" },
  { libelle: "Agenda", href: "/agenda", detail: "Sortir dans la région" },
]

export function MobileMenu({
  ouvert,
  fermer,
  ouvrirRecherche,
}: {
  ouvert: boolean
  fermer: () => void
  ouvrirRecherche: () => void
}) {
  const pathname = usePathname()
  const reseaux = reseauxActifs()

  return (
    <Dialogue
      ouvert={ouvert}
      fermer={fermer}
      label="Menu"
      id="menu-mobile"
      className="h-dvh w-full"
    >
      <div className="fondu bg-nuit text-nuit-encre relative flex h-dvh w-full flex-col overflow-y-auto">
        <Tripoint
          className="text-nuit-trait pointer-events-none absolute -right-24 -bottom-24 size-[28rem]"
          epaisseur={1}
          point={false}
        />
        <div className="conteneur flex h-16 flex-none items-center justify-between">
          <Link href="/" onClick={fermer} aria-label="Radio Tripoint — accueil">
            <Logo sombre taille={48} className="size-12" />
          </Link>
          <button
            type="button"
            onClick={fermer}
            aria-label="Fermer le menu"
            className="hover:bg-nuit-3 grid size-11 place-items-center rounded-full"
          >
            <X className="size-6" aria-hidden />
          </button>
        </div>

        <div className="conteneur relative flex-1 pt-4 pb-10">
          <div className="flex gap-2">
            <BoutonDirect taille="grand" className="flex-1" />
            <button
              type="button"
              onClick={() => {
                fermer()
                ouvrirRecherche()
              }}
              aria-label="Rechercher"
              className="border-nuit-trait hover:border-nuit-encre grid size-14 flex-none place-items-center rounded-full border"
            >
              <Search className="size-5" aria-hidden />
            </button>
          </div>

          <nav aria-label="Menu principal" className="mt-8">
            <ul className="border-nuit-trait border-t">
              {essentiels.map((l) => (
                <li key={l.href} className="border-nuit-trait border-b">
                  <Link
                    href={l.href}
                    onClick={fermer}
                    aria-current={estActif(pathname, l.href) ? "page" : undefined}
                    className="group flex items-center justify-between gap-4 py-4"
                  >
                    <span>
                      <span className="titre-affiche group-aria-[current=page]:text-nuit-accent block text-[2rem]">
                        {l.libelle}
                      </span>
                      <span className="text-nuit-encre-2 mt-1 block text-sm">{l.detail}</span>
                    </span>
                    <ArrowUpRight
                      className="text-nuit-encre-2 size-6 flex-none transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>

            <p className="surtitre text-nuit-encre-2 mt-9">Rubriques</p>
            <ul className="mt-3 grid grid-cols-2 gap-x-4">
              {navRubriques
                .filter((l) => !essentiels.some((e) => e.href === l.href))
                .map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={fermer}
                      aria-current={estActif(pathname, l.href) ? "page" : undefined}
                      className={cn(
                        "hover:text-nuit-accent aria-[current=page]:text-nuit-accent block py-2.5 text-[1.05rem] font-semibold",
                      )}
                    >
                      {l.libelle}
                    </Link>
                  </li>
                ))}
            </ul>

            <p className="surtitre text-nuit-encre-2 mt-8">Radio Tripoint</p>
            <ul className="mt-3 grid grid-cols-2 gap-x-4">
              {navPlus
                .filter((l) => !navRubriques.some((r) => r.href === l.href))
                .map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={fermer}
                      className="hover:text-nuit-accent block py-2.5 text-[1.05rem] font-semibold"
                    >
                      {l.libelle}
                    </Link>
                  </li>
                ))}
              <li>
                <Link
                  href="/soumettre-une-information"
                  onClick={fermer}
                  className="hover:text-nuit-accent block py-2.5 text-[1.05rem] font-semibold"
                >
                  Nous signaler une info
                </Link>
              </li>
            </ul>
          </nav>

          <div className="border-nuit-trait mt-10 flex flex-col gap-3 border-t pt-6 text-sm">
            <a
              href={`tel:${site.contact.telephoneE164}`}
              className="text-nuit-encre-2 hover:text-nuit-encre inline-flex items-center gap-3"
            >
              <Phone className="size-4" aria-hidden /> {site.contact.telephone}
            </a>
            <a
              href={`mailto:${site.contact.email}`}
              className="text-nuit-encre-2 hover:text-nuit-encre inline-flex items-center gap-3 break-all"
            >
              <Mail className="size-4 flex-none" aria-hidden /> {site.contact.email}
            </a>
            {reseaux.length > 0 && (
              <ul className="mt-2 flex gap-2">
                {reseaux.map((r) => (
                  <li key={r.reseau}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener"
                      aria-label={r.libelle}
                      className="border-nuit-trait hover:border-nuit-encre grid size-11 place-items-center rounded-full border"
                    >
                      <IconeReseau reseau={r.reseau} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Dialogue>
  )
}
