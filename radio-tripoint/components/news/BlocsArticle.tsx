import Image from "next/image"
import type { Bloc } from "@/types/media"

export function BlocsArticle({ blocs }: { blocs: Bloc[] }) {
  return (
    <div className="prose-article">
      {blocs.map((b, i) => {
        switch (b.type) {
          case "paragraphe":
            return <p key={i}>{b.texte}</p>
          case "intertitre":
            return <h2 key={i}>{b.texte}</h2>
          case "citation":
            return (
              <blockquote key={i}>
                <p>« {b.texte} »</p>
                {b.auteur && (
                  <footer className="text-encre-3 mt-2 font-sans text-sm not-italic">
                    — {b.auteur}
                  </footer>
                )}
              </blockquote>
            )
          case "liste":
            return (
              <ul key={i}>
                {b.elements.map((e, j) => (
                  <li key={j}>{e}</li>
                ))}
              </ul>
            )
          case "image":
            return (
              <figure key={i} className="!my-10">
                <Image
                  src={b.visuel.src}
                  alt={b.visuel.alt}
                  width={b.visuel.largeur}
                  height={b.visuel.hauteur}
                  sizes="(min-width: 768px) 720px, 100vw"
                  className="h-auto w-full"
                />
                {(b.legende || b.visuel.credit) && (
                  <figcaption className="text-encre-3 mt-2 font-sans text-sm">
                    {b.legende}
                    {b.visuel.credit && (
                      <span className="ml-1 opacity-80">© {b.visuel.credit}</span>
                    )}
                  </figcaption>
                )}
              </figure>
            )
        }
      })}
    </div>
  )
}
