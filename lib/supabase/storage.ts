import "server-only";

import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { ImageInput } from "@/lib/claude/analyze-outfit";

export const OUTFITS_BUCKET = "outfits";

/** Durée de vie volontairement courte : ces URL donnent accès à une photo de personne. */
const SIGNED_URL_TTL_SECONDS = 300;

/** Chemin cloisonné par utilisateur — la policy Storage l'exige (cf. 0004). */
export function buildOutfitPath(userId: string, extension: string): string {
  const safeExtension = /^[a-z0-9]{2,5}$/.test(extension) ? extension : "jpg";
  return `${userId}/${crypto.randomUUID()}.${safeExtension}`;
}

export async function createSignedUploadUrl(path: string) {
  const supabase = await createClient();
  return supabase.storage.from(OUTFITS_BUCKET).createSignedUploadUrl(path);
}

/**
 * Prépare l'image pour l'API Claude.
 *
 * On préfère l'URL signée (l'image ne transite pas par notre serveur), sauf
 * quand Supabase tourne en local : l'URL pointerait alors sur un hôte que les
 * serveurs d'Anthropic ne peuvent pas joindre. Dans ce cas on bascule en
 * base64, ce qui garde le développement local fonctionnel.
 */
export async function loadImageForClaude(path: string): Promise<ImageInput> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(OUTFITS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error("image_unavailable");
  }

  const mediaType = guessMediaType(path);

  if (isPubliclyReachable(env.supabaseUrl)) {
    return { kind: "url", url: data.signedUrl, mediaType };
  }

  const response = await fetch(data.signedUrl);
  if (!response.ok) throw new Error("image_unavailable");
  const buffer = Buffer.from(await response.arrayBuffer());

  return { kind: "base64", data: buffer.toString("base64"), mediaType };
}

function isPubliclyReachable(supabaseUrl: string): boolean {
  try {
    const host = new URL(supabaseUrl).hostname;
    return host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".local");
  } catch {
    return false;
  }
}

function guessMediaType(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}
