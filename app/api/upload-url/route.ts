import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildOutfitPath, createSignedUploadUrl } from "@/lib/supabase/storage";
import { getQuotaStatus } from "@/lib/quota";

const bodySchema = z.object({
  extension: z.string().min(2).max(5),
});

/**
 * Donne au navigateur une URL d'upload directe vers Storage : la photo ne
 * transite pas par nos routes (plus rapide en 4G, pas de limite de payload).
 *
 * On vérifie ici le quota EN LECTURE seulement : inutile de faire uploader
 * 3 Mo à quelqu'un qui n'a plus de crédit. La consommation réelle, elle, a
 * lieu dans /api/analyze, juste avant l'appel au modèle.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const quota = await getQuotaStatus();
  if (quota && quota.remaining <= 0) {
    return NextResponse.json(
      { error: "quota_exceeded", quota },
      { status: 402 }
    );
  }

  const path = buildOutfitPath(user.id, parsed.data.extension.toLowerCase());
  const { data, error } = await createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: "upload_url_failed" }, { status: 500 });
  }

  return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl });
}
