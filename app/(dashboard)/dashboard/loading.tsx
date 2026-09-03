import { Bone, BoneCard, SkeletonPage } from "@/components/ui/skeleton";

/** Accueil : en-tête, carte de quota avec son bouton, carte du jour. */
export default function Loading() {
  return (
    <SkeletonPage title="Accueil">
      <BoneCard className="gap-4">
        <div className="flex items-baseline justify-between">
          <Bone className="h-7 w-28 rounded-full" />
          <Bone className="h-4 w-40" />
        </div>
        <div className="flex items-baseline justify-between">
          <Bone className="h-5 w-36" />
          <Bone className="h-5 w-8" />
        </div>
        {/* La jauge de quota. */}
        <Bone className="h-2.5 w-full rounded-full" />
        {/* « Analyser une tenue » : hauteur du bouton réel. */}
        <Bone className="h-14 w-full rounded-full" />
      </BoneCard>

      <BoneCard className="gap-4">
        <Bone className="h-5 w-28" />
        <div className="flex gap-2">
          <Bone className="h-12 w-28 rounded-full" />
          <Bone className="h-12 w-40 rounded-full" />
        </div>
        <Bone className="h-14 w-full rounded-full" />
      </BoneCard>
    </SkeletonPage>
  );
}
