"use client"

import { ArrowRight, Loader2, Search, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"
import { libellesTypes, type Resultat } from "@/lib/contenu/recherche-types"
import { Dialogue } from "./Dialogue"

const suggestions = ["Sierck-les-Bains", "Schengen", "Perl", "Génération Z", "Sport"]

export function SearchDialog({ ouvert, fermer }: { ouvert: boolean; fermer: () => void }) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [resultats, setResultats] = useState<Resultat[] | null>(null)
  const [charge, setCharge] = useState(false)
  const champ = useRef<HTMLInputElement>(null)
  const idListe = useId()

  const clore = () => {
    setQ("")
    setResultats(null)
    fermer()
  }

  useEffect(() => {
    if (ouvert) requestAnimationFrame(() => champ.current?.focus())
  }, [ouvert])

  useEffect(() => {
    const terme = q.trim()
    if (terme.length < 2) return
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setCharge(true)
      try {
        const r = await fetch(`/api/recherche?q=${encodeURIComponent(terme)}`, {
          signal: ctrl.signal,
        })
        const d = (await r.json()) as { resultats: Resultat[] }
        setResultats(d.resultats)
      } catch {
        /* requête annulée ou hors ligne : on garde l'état précédent */
      } finally {
        if (!ctrl.signal.aborted) setCharge(false)
      }
    }, 180)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [q])

  const terme = q.trim()
  const aAfficher = terme.length >= 2 ? resultats : null

  return (
    <Dialogue ouvert={ouvert} fermer={clore} label="Recherche" className="w-full">
      <div className="fondu bg-surface text-encre shadow-2 sm:border-trait mx-auto mt-0 w-full max-w-2xl sm:mt-[10vh] sm:border">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            if (!terme) return
            clore()
            router.push(`/recherche?q=${encodeURIComponent(terme)}`)
          }}
          className="border-trait flex items-center gap-3 border-b px-4"
        >
          {charge ? (
            <Loader2 className="text-encre-3 size-5 flex-none animate-spin" aria-hidden />
          ) : (
            <Search className="text-encre-3 size-5 flex-none" aria-hidden />
          )}
          <label htmlFor="recherche-globale" className="sr-only">
            Rechercher des articles, émissions, podcasts, événements
          </label>
          <input
            ref={champ}
            id="recherche-globale"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un article, une émission, une ville…"
            autoComplete="off"
            aria-controls={idListe}
            className="placeholder:text-encre-3 h-16 min-w-0 flex-1 bg-transparent text-lg outline-none"
          />
          <button
            type="button"
            onClick={clore}
            aria-label="Fermer la recherche"
            className="hover:bg-papier-2 grid size-10 flex-none place-items-center rounded-full"
          >
            <X className="size-5" aria-hidden />
          </button>
        </form>

        <div id={idListe} aria-live="polite" className="max-h-[65dvh] overflow-y-auto">
          {aAfficher === null ? (
            <div className="px-4 py-5">
              <p className="surtitre text-encre-3">Suggestions</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <li key={s}>
                    <button type="button" onClick={() => setQ(s)} className="puce-filtre">
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : aAfficher.length === 0 ? (
            <p className="text-encre-2 px-4 py-8">
              Aucun résultat pour « <span className="text-encre font-semibold">{terme}</span> ».
              Essayez un nom de ville ou d&apos;émission.
            </p>
          ) : (
            <ul className="py-2">
              {aAfficher.map((r) => (
                <li key={r.href}>
                  <Link
                    href={r.href}
                    onClick={clore}
                    className="group hover:bg-papier-2 focus-visible:bg-papier-2 flex items-start gap-4 px-4 py-3"
                  >
                    <span className="surtitre text-encre-3 mt-1 w-20 flex-none">
                      {libellesTypes[r.type]}
                    </span>
                    <span className="min-w-0">
                      <span className="group-hover:text-accent-encre block font-semibold">
                        {r.titre}
                      </span>
                      <span className="text-encre-3 block text-sm">{r.contexte}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {terme.length >= 2 && (
            <Link
              href={`/recherche?q=${encodeURIComponent(terme)}`}
              onClick={clore}
              className="lien-fleche border-trait text-accent-encre flex border-t px-4 py-4"
            >
              Tous les résultats pour « {terme} » <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </Dialogue>
  )
}
