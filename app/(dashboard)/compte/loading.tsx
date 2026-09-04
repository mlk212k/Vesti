import { Bone, SkeletonPage } from "@/components/ui/skeleton";

/**
 * Les mesures sont celles de la page réelle : l'e-mail sous le titre, puis les
 * groupes de réglages — un intitulé court au-dessus d'une liste de lignes de
 * 52 px. Un squelette aux mauvaises hauteurs produirait un saut au moment du
 * remplacement, plus désagréable que l'attente qu'il masque.
 */
export default function Loading() {
  return (
    <SkeletonPage title="Paramètres">
      <Bone className="-mt-3 h-4 w-1/2" />

      {[3, 1, 1].map((rows, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Bone className="h-3 w-20" />
          <div className="flex flex-col gap-px overflow-hidden rounded-[var(--radius-card)] border border-border-soft">
            {Array.from({ length: rows }, (_, row) => (
              <Bone key={row} className="h-[52px] rounded-none" />
            ))}
          </div>
        </div>
      ))}
    </SkeletonPage>
  );
}
