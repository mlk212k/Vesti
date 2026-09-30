"use client"

import { Check, Link2, Share2 } from "lucide-react"
import { useState } from "react"
import { IconeReseau } from "@/components/marque/IconesReseaux"

export function ShareButtons({ url, titre }: { url: string; titre: string }) {
  const [copie, setCopie] = useState(false)
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(titre)
  const liens = [
    {
      nom: "Facebook",
      reseau: "facebook" as const,
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    },
    { nom: "X", reseau: "x" as const, href: `https://x.com/intent/post?url=${u}&text=${t}` },
  ]
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopie(true)
      setTimeout(() => setCopie(false), 2200)
    } catch {
      window.prompt("Copiez le lien :", url)
    }
  }
  const partageNatif = async () => {
    try {
      await navigator.share({ title: titre, url })
    } catch {
      /* annulé */
    }
  }
  const classe =
    "grid size-11 place-items-center rounded-full border border-trait text-encre-2 transition-colors hover:border-encre hover:text-encre"
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="surtitre text-encre-3 mr-2">Partager</span>
      {liens.map((l) => (
        <a
          key={l.nom}
          href={l.href}
          target="_blank"
          rel="noopener"
          aria-label={`Partager sur ${l.nom}`}
          className={classe}
        >
          <IconeReseau reseau={l.reseau} className="size-[1.1rem]" />
        </a>
      ))}
      <a
        href={`https://wa.me/?text=${t}%20${u}`}
        target="_blank"
        rel="noopener"
        aria-label="Partager sur WhatsApp"
        className={classe}
      >
        <svg viewBox="0 0 24 24" className="size-[1.1rem]" fill="currentColor" aria-hidden>
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2 .7 2.8.6.4-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
        </svg>
      </a>
      <button
        type="button"
        onClick={copier}
        aria-label={copie ? "Lien copié" : "Copier le lien"}
        className={classe}
      >
        {copie ? (
          <Check className="text-succes size-[1.1rem]" aria-hidden />
        ) : (
          <Link2 className="size-[1.1rem]" aria-hidden />
        )}
      </button>
      <button
        type="button"
        onClick={partageNatif}
        aria-label="Autres options de partage"
        className={`${classe} sm:hidden`}
      >
        <Share2 className="size-[1.1rem]" aria-hidden />
      </button>
      <span role="status" className="sr-only">
        {copie ? "Lien copié dans le presse-papiers" : ""}
      </span>
    </div>
  )
}
