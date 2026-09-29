import { SchemaTerritoire } from "./SchemaTerritoire"

const pays = [
  { code: "FR", nom: "France", lieux: "Sierck-les-Bains · Apach · Thionville · Moselle" },
  { code: "LU", nom: "Luxembourg", lieux: "Schengen · Remich · Luxembourg" },
  { code: "DE", nom: "Allemagne", lieux: "Perl · Merzig · Sarre" },
]

export function SectionTerritoire({ titreNiveau: Titre = "h2" }: { titreNiveau?: "h1" | "h2" }) {
  return (
    <section
      aria-labelledby="titre-territoire"
      className="bg-nuit text-nuit-encre relative overflow-hidden"
    >
      <div className="conteneur grid gap-12 py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-24">
        <div>
          <p className="surtitre text-nuit-accent">Notre territoire</p>
          <Titre
            id="titre-territoire"
            className="titre-affiche mt-4 text-[clamp(2.6rem,1.4rem+5vw,5.6rem)]"
          >
            Un territoire.
            <br />
            Trois pays.
            <br />
            <span className="text-nuit-accent">Une radio.</span>
          </Titre>
          <p className="presse text-nuit-encre-2 mt-8 max-w-xl text-[1.3rem] leading-snug">
            Radio Tripoint connecte les habitants, les initiatives, les cultures et les événements
            du territoire des Trois Frontières — là où la France, le Luxembourg et l&apos;Allemagne
            se rejoignent, sur la Moselle.
          </p>
          <ul className="bg-nuit-trait mt-10 grid gap-px sm:grid-cols-3">
            {pays.map((p) => (
              <li key={p.code} className="bg-nuit p-4 sm:p-5">
                <p className="titre-affiche text-nuit-accent text-[2rem]" aria-hidden>
                  {p.code}
                </p>
                <p className="mt-2 font-bold">{p.nom}</p>
                <p className="text-nuit-encre-2 mt-1 text-sm leading-snug">{p.lieux}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="mx-auto w-full max-w-[34rem]">
          <SchemaTerritoire />
        </div>
      </div>
    </section>
  )
}
