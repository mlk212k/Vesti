import type Anthropic from "@anthropic-ai/sdk";

export type ImageInput =
  | { kind: "url"; url: string; mediaType: string }
  | { kind: "base64"; data: string; mediaType: string };

const SUPPORTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

/**
 * Les photos de téléphone arrivent parfois en HEIC ou avec un type MIME
 * fantaisiste. On retombe sur JPEG plutôt que de laisser l'API refuser la
 * requête pour un type qu'elle ne connaît pas.
 */
function toSupportedMediaType(mediaType: string): SupportedMediaType {
  return (SUPPORTED_MEDIA_TYPES as readonly string[]).includes(mediaType)
    ? (mediaType as SupportedMediaType)
    : "image/jpeg";
}

export function toImageBlock(image: ImageInput): Anthropic.ImageBlockParam {
  if (image.kind === "url") {
    return { type: "image", source: { type: "url", url: image.url } };
  }
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: toSupportedMediaType(image.mediaType),
      data: image.data,
    },
  };
}
