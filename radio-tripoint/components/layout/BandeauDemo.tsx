import { modeDemo } from "@/lib/contenu/demo"

/** Visible sur tout le site quand le contenu fictif est chargé. */
export function BandeauDemo() {
  if (!modeDemo) return null
  return (
    <div role="note" className="bg-alerte px-4 py-1.5 text-center text-xs font-semibold text-white">
      Mode démonstration : les contenus marqués « Exemple » sont fictifs et ne seront pas publiés.
    </div>
  )
}
