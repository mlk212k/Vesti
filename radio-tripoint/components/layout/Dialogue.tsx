"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils/cn"

/**
 * <dialog> natif : piège du focus, Échap et arrière-plan inerte fournis par
 * le navigateur. Verrouille le défilement de la page pendant l'ouverture.
 */
export function Dialogue({
  ouvert,
  fermer,
  label,
  id,
  className,
  children,
}: {
  ouvert: boolean
  fermer: () => void
  label: string
  id?: string
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (ouvert && !d.open) {
      d.showModal()
      document.documentElement.style.overflow = "hidden"
    } else if (!ouvert && d.open) {
      d.close()
    }
  }, [ouvert])

  useEffect(() => {
    const d = ref.current
    if (!d) return
    const surFermeture = () => {
      document.documentElement.style.overflow = ""
      fermer()
    }
    d.addEventListener("close", surFermeture)
    return () => d.removeEventListener("close", surFermeture)
  }, [fermer])

  return (
    <dialog
      ref={ref}
      id={id}
      aria-label={label}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close()
      }}
      className={cn(
        "backdrop:bg-nuit/60 m-0 max-h-none max-w-none bg-transparent p-0 backdrop:backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </dialog>
  )
}
