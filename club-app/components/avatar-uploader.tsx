"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;

export function AvatarUploader({
  userId,
  fullName,
  currentAvatarUrl,
}: {
  userId: string;
  fullName: string;
  currentAvatarUrl: string | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initial = fullName.trim().charAt(0).toUpperCase() || "?";

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Choisis une image (jpg, png…).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image trop lourde (5 Mo max).");
      return;
    }

    setPending(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      setPending(false);
      setError(uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    // Bust CDN/browser caching on re-upload since the path never changes.
    const bustedUrl = `${publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: bustedUrl })
      .eq("id", userId);

    setPending(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPreview(bustedUrl);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/10 text-lg font-semibold text-accent-strong ring-1 ring-border"
        aria-label="Changer la photo de profil"
      >
        {preview ? (
          <Image
            src={preview}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 object-cover"
            unoptimized
          />
        ) : (
          initial
        )}
      </button>
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-2 disabled:opacity-60"
        >
          {pending ? "Envoi…" : preview ? "Changer la photo" : "Ajouter une photo"}
        </button>
        {error && <p className="text-xs text-accent-strong">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
