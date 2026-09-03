import { Bone, SkeletonPage } from "@/components/ui/skeleton";

/** Progrès : la courbe, puis les analyses en grille de deux. */
export default function Loading() {
  return (
    <SkeletonPage title="Progrès">
      <Bone className="h-5 w-2/3" />
      <Bone className="h-44 w-full rounded-[var(--radius-card)]" />

      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Bone key={i} className="aspect-[3/4] w-full rounded-[var(--radius-card)]" />
        ))}
      </div>
    </SkeletonPage>
  );
}
