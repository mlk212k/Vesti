import { Bone, BoneCard, SkeletonPage } from "@/components/ui/skeleton";

/** Abonnement : le plan en cours, puis les offres. */
export default function Loading() {
  return (
    <SkeletonPage title="Abonnement">
      <BoneCard className="gap-3">
        <Bone className="h-7 w-32 rounded-full" />
        <Bone className="h-5 w-2/3" />
        <Bone className="h-12 w-full rounded-full" />
      </BoneCard>

      {Array.from({ length: 2 }, (_, i) => (
        <BoneCard key={i} className="gap-3">
          <Bone className="h-6 w-24" />
          <Bone className="h-8 w-32" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-5/6" />
          <Bone className="h-14 w-full rounded-full" />
        </BoneCard>
      ))}
    </SkeletonPage>
  );
}
