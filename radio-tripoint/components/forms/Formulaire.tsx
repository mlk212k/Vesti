"use client"

import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react"
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { site } from "@/config/site"
import { objetsMail, schemas, type TypeFormulaire } from "@/lib/formulaires/schemas"
import { cn } from "@/lib/utils/cn"

type Etat =
  | { s: "repos" }
  | { s: "envoi" }
  | { s: "succes" }
  | { s: "erreur"; message: string }
  | { s: "non-configure"; mailto: string }

const ContexteErreurs = createContext<Record<string, string>>({})
export const useErreurChamp = (nom: string) => useContext(ContexteErreurs)[nom]

/**
 * Formulaire générique : validation client (mêmes schémas que le serveur),
 * champ piège et horodatage anti-robot, envoi vers /api/formulaires/[type].
 */
export function Formulaire({
  type,
  children,
  libelleEnvoi,
  succes,
  className,
  compact,
}: {
  type: TypeFormulaire
  children: ReactNode
  libelleEnvoi: string
  succes: { titre: string; texte: string }
  className?: string
  compact?: boolean
}) {
  const [etat, setEtat] = useState<Etat>({ s: "repos" })
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  // Horodatage anti-robot. Pas dans un <input type="hidden"> : React
  // réécrit l'attribut value à chaque rendu, ce qui l'effaçait après
  // l'affichage des erreurs — et le serveur prenait l'humain pour un robot.
  const debut = useRef(0)

  useEffect(() => {
    debut.current = Date.now()
  }, [])

  const mailto = (donnees: FormData) => {
    const lignes = [...donnees.entries()]
      .filter(
        ([k, v]) =>
          typeof v === "string" &&
          v &&
          !k.startsWith("_") &&
          k !== "site_web" &&
          k !== "consentement",
      )
      .map(([k, v]) => `${k} : ${v}`)
    return `mailto:${site.contact.email}?subject=${encodeURIComponent(objetsMail[type])}&body=${encodeURIComponent(lignes.join("\n"))}`
  }

  const envoyer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const donnees = new FormData(form)
    donnees.set("_t", String(debut.current))
    const brut: Record<string, string> = {}
    for (const [k, v] of donnees.entries())
      if (typeof v === "string" && !k.startsWith("_") && k !== "site_web") brut[k] = v

    const r = schemas[type].safeParse(brut)
    if (!r.success) {
      const champs: Record<string, string> = {}
      for (const i of r.error.issues) {
        const k = String(i.path[0] ?? "")
        if (k && !champs[k]) champs[k] = i.message
      }
      setErreurs(champs)
      const premier = Object.keys(champs)[0]
      form.querySelector<HTMLElement>(`[name="${premier}"]`)?.focus()
      return
    }
    setErreurs({})
    setEtat({ s: "envoi" })
    try {
      const rep = await fetch(`/api/formulaires/${type}`, { method: "POST", body: donnees })
      const d = (await rep.json().catch(() => ({}))) as {
        statut?: string
        message?: string
        champs?: Record<string, string>
      }
      if (d.statut === "succes") {
        setEtat({ s: "succes" })
        form.reset()
      } else if (d.statut === "invalide" && d.champs) {
        setErreurs(d.champs)
        setEtat({ s: "repos" })
      } else if (d.statut === "non-configure") {
        setEtat({ s: "non-configure", mailto: mailto(donnees) })
      } else {
        setEtat({
          s: "erreur",
          message: d.message ?? "L'envoi a échoué. Réessayez dans un instant.",
        })
      }
    } catch {
      setEtat({ s: "erreur", message: "Pas de connexion. Vérifiez votre réseau et réessayez." })
    }
  }

  if (etat.s === "succes") {
    return (
      <div
        role="status"
        className={cn("entree border-succes bg-surface border-l-4 p-6", className)}
      >
        <CheckCircle2 className="text-succes size-7" aria-hidden />
        <p className="titre-carte mt-3 text-xl">{succes.titre}</p>
        <p className="text-encre-2 mt-2">{succes.texte}</p>
        <button
          type="button"
          onClick={() => setEtat({ s: "repos" })}
          className="lien mt-4 text-sm font-semibold"
        >
          Envoyer un autre message
        </button>
      </div>
    )
  }

  const nbErreurs = Object.keys(erreurs).length
  return (
    <ContexteErreurs.Provider value={erreurs}>
      <form onSubmit={envoyer} noValidate className={className} encType="multipart/form-data">
        {nbErreurs > 0 && !compact && (
          <p
            role="alert"
            className="bg-erreur-fond mb-6 flex items-start gap-2 p-4 text-sm font-medium"
          >
            <AlertCircle className="mt-0.5 size-4 flex-none" aria-hidden />
            {nbErreurs === 1 ? "Un champ est à corriger." : `${nbErreurs} champs sont à corriger.`}
          </p>
        )}
        {/* Anti-robot : invisible pour les humains, rempli par les robots. */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Ne pas remplir
            <input type="text" name="site_web" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>

        {children}

        <div className={cn("flex flex-col gap-4", compact ? "mt-3" : "mt-8")}>
          <button
            type="submit"
            disabled={etat.s === "envoi"}
            className="btn btn-plein min-h-12 self-start !px-6 disabled:opacity-60"
          >
            {etat.s === "envoi" && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {etat.s === "envoi" ? "Envoi…" : libelleEnvoi}
          </button>
          <div aria-live="polite">
            {etat.s === "erreur" && (
              <p className="flex items-start gap-2 text-sm font-medium">
                <AlertCircle className="mt-0.5 size-4 flex-none" aria-hidden /> {etat.message}
              </p>
            )}
            {etat.s === "non-configure" && (
              <div className="border-alerte bg-surface border-l-4 p-4 text-sm">
                <p className="font-semibold">L&apos;envoi en ligne n&apos;est pas encore activé.</p>
                <p className="text-encre-2 mt-1">
                  Votre message est prêt : envoyez-le depuis votre messagerie.
                </p>
                <a href={etat.mailto} className="btn btn-trait mt-3 !min-h-10">
                  <Mail className="size-4" aria-hidden /> Envoyer par e-mail
                </a>
              </div>
            )}
          </div>
        </div>
      </form>
    </ContexteErreurs.Provider>
  )
}
