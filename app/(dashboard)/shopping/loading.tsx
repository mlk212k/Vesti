import { Bone, BoneCard, SkeletonPage } from "@/components/ui/skeleton";

/** Acheter : la barre de recherche, puis les suggestions. */
export default function Loading() {
  return (
    <SkeletonPage title="Acheter">
      <Bone className="h-5 w-3/4" />
      <Bone className="h-14 w-full rounded-full" />

      {Array.from({ length: 3 }, (_, i) => (
        <BoneCard key={i}>
          <Bone className="h-5 w-1/2" />
          <Bone className="h-4 w-3/4" />
          <div className="flex gap-3">
            <Bone className="h-20 w-20 rounded-[18px]" />
            <div className="flex flex-1 flex-col gap-2">
              <Bone className="h-4 w-full" />
              <Bone className="h-4 w-2/3" />
            </div>
          </div>
        </BoneCard>
      ))}
    </SkeletonPage>
  );
}
