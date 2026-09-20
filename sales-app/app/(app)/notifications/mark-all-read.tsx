"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Submit } from "@/components/submit";
import type { ActionResult } from "@/lib/errors";
import { markAllReadAction } from "./actions";

export function MarkAllRead() {
  const router = useRouter();
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    async () => markAllReadAction(),
    undefined,
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action}>
      <Submit className="btn btn-fantome text-sm" pendingLabel="…">
        Tout marquer comme lu
      </Submit>
    </form>
  );
}
