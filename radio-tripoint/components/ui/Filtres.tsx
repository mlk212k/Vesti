import Link from "next/link"

/** Puces de filtre sous forme de liens : fonctionnent sans JavaScript, partageables, indexables. */
export function Filtres({
  label,
  options,
  actif,
  href,
}: {
  label: string
  options: { valeur: string; libelle: string }[]
  actif: string
  href: (valeur: string) => string
}) {
  return (
    <nav aria-label={label} className="-mx-4 px-4 sm:mx-0 sm:px-0">
      <ul className="rail py-1">
        {options.map((o) => (
          <li key={o.valeur} className="flex-none">
            <Link
              href={href(o.valeur)}
              aria-current={o.valeur === actif ? "page" : undefined}
              className="puce-filtre"
              scroll={false}
            >
              {o.libelle}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
