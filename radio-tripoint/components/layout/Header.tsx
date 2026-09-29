"use client"

import { ChevronDown, Menu, Search } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { estActif, navPlus, navPrincipale } from "@/config/navigation"
import { BoutonDirect } from "@/components/radio/BoutonDirect"
import { Logo } from "@/components/marque/Logo"
import { cn } from "@/lib/utils/cn"
import { MobileMenu } from "./MobileMenu"
import { SearchDialog } from "./SearchDialog"

export function Header() {
  const pathname = usePathname()
  const [compact, setCompact] = useState(false)
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [rechercheOuverte, setRechercheOuverte] = useState(false)
  const [plusOuvert, setPlusOuvert] = useState(false)
  const plusRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    const surDefilement = () => setCompact(window.scrollY > 24)
    const raf = requestAnimationFrame(surDefilement)
    window.addEventListener("scroll", surDefilement, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", surDefilement)
    }
  }, [])

  // Raccourci « / » ou Ctrl+K pour la recherche.
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement
      const saisie = cible.closest("input, textarea, select, [contenteditable]")
      if ((e.key === "/" && !saisie) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault()
        setRechercheOuverte(true)
      }
    }
    window.addEventListener("keydown", surTouche)
    return () => window.removeEventListener("keydown", surTouche)
  }, [])

  // Fermer « Plus » au clic extérieur / Échap.
  useEffect(() => {
    if (!plusOuvert) return
    const clic = (e: MouseEvent) => {
      if (!plusRef.current?.contains(e.target as Node)) setPlusOuvert(false)
    }
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setPlusOuvert(false)
    document.addEventListener("mousedown", clic)
    document.addEventListener("keydown", echap)
    return () => {
      document.removeEventListener("mousedown", clic)
      document.removeEventListener("keydown", echap)
    }
  }, [plusOuvert])

  const plusActif = navPlus.some((l) => estActif(pathname, l.href))

  return (
    <>
      <header
        data-compact={compact}
        className={cn(
          "sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300",
          compact
            ? "border-trait bg-papier/90 shadow-1 supports-[backdrop-filter]:bg-papier/80 backdrop-blur-md"
            : "bg-papier border-transparent",
        )}
      >
        <div
          className={cn(
            "conteneur flex items-center gap-4 transition-[height] duration-300",
            compact ? "h-14 lg:h-16" : "h-16 lg:h-20",
          )}
        >
          {/* Le logo rond déborde sous la barre, comme un autocollant ; il rentre dans le rang au défilement. */}
          <Link
            href="/"
            aria-label="Radio Tripoint — accueil"
            className={cn(
              "relative flex-none self-stretch transition-[width] duration-300",
              compact ? "w-12 lg:w-14" : "w-[4.25rem] lg:w-[5.75rem]",
            )}
          >
            <Logo
              taille={96}
              preload
              className={cn(
                "shadow-2 absolute left-0 ring-1 ring-black/5 transition-all duration-300",
                compact
                  ? "top-1 size-12 lg:size-14"
                  : "top-1.5 size-[4.25rem] lg:top-2 lg:size-[5.75rem]",
              )}
            />
          </Link>

          <nav
            aria-label="Navigation principale"
            className="ml-4 hidden flex-1 items-center lg:flex xl:ml-8"
          >
            <ul className="flex items-center gap-0.5 xl:gap-1">
              {navPrincipale.map((l) => {
                const actif = estActif(pathname, l.href)
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      aria-current={actif ? "page" : undefined}
                      className={cn(
                        "relative inline-flex h-10 items-center px-2.5 text-[0.9rem] font-semibold transition-colors xl:px-3",
                        actif ? "text-encre" : "text-encre-2 hover:text-encre",
                        "after:bg-accent after:absolute after:inset-x-2.5 after:bottom-1 after:h-1 after:origin-left after:transition-transform xl:after:inset-x-3",
                        actif ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100",
                      )}
                    >
                      {l.libelle}
                    </Link>
                  </li>
                )
              })}
              <li className="relative" ref={plusRef}>
                <button
                  type="button"
                  aria-expanded={plusOuvert}
                  aria-controls="menu-plus"
                  onClick={() => setPlusOuvert((v) => !v)}
                  className={cn(
                    "inline-flex h-10 items-center gap-1 px-2.5 text-[0.9rem] font-semibold transition-colors xl:px-3",
                    plusActif || plusOuvert ? "text-encre" : "text-encre-2 hover:text-encre",
                  )}
                >
                  Plus{" "}
                  <ChevronDown
                    className={cn("size-4 transition-transform", plusOuvert && "rotate-180")}
                    aria-hidden
                  />
                </button>
                {plusOuvert && (
                  <ul
                    id="menu-plus"
                    className="fondu border-trait bg-surface shadow-2 absolute top-full left-0 mt-2 w-56 border py-2"
                  >
                    {navPlus.map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          onClick={() => setPlusOuvert(false)}
                          aria-current={estActif(pathname, l.href) ? "page" : undefined}
                          className="text-encre-2 hover:bg-papier-2 hover:text-encre aria-[current=page]:text-accent-encre block px-4 py-2.5 text-[0.92rem] font-medium"
                        >
                          {l.libelle}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setRechercheOuverte(true)}
              aria-label="Rechercher (raccourci /)"
              className="text-encre-2 hover:bg-papier-2 hover:text-encre grid size-10 place-items-center rounded-full transition-colors max-[359px]:hidden"
            >
              <Search className="size-5" aria-hidden />
            </button>
            <BoutonDirect taille="compact" className="sm:!min-h-11 sm:!px-4 sm:!text-[0.78rem]" />
            <button
              type="button"
              onClick={() => setMenuOuvert(true)}
              aria-label="Ouvrir le menu"
              aria-expanded={menuOuvert}
              aria-controls="menu-mobile"
              className="text-encre hover:bg-papier-2 grid size-10 place-items-center rounded-full transition-colors lg:hidden"
            >
              <Menu className="size-6" aria-hidden />
            </button>
          </div>
        </div>
      </header>
      <MobileMenu
        ouvert={menuOuvert}
        fermer={() => setMenuOuvert(false)}
        ouvrirRecherche={() => setRechercheOuverte(true)}
      />
      <SearchDialog ouvert={rechercheOuverte} fermer={() => setRechercheOuverte(false)} />
    </>
  )
}
