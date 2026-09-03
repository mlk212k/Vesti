import { Bone, SkeletonPage } from "@/components/ui/skeleton";

/** Dressing : pastilles de catégories, puis la grille de pièces. */
export default function Loading() {
  return (
    <SkeletonPage title="Dressing">
      <Bone className="h-5 w-3/4" />

      <div className="flex flex-wrap gap-2">
        {["w-16", "w-24", "w-20", "w-28", "w-[72px]"].map((w) => (
          <Bone key={w} className={`h-10 rounded-full ${w}`} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Bone key={i} className="aspect-square w-full rounded-[var(--radius-card)]" />
        ))}
      </div>
    </SkeletonPage>
  );
}
