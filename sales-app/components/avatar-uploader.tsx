"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconCamera } from "@/components/icons";
import { Avatar } from "@/components/ui";
import { urlAvatar } from "@/lib/avatar";
import { jouer } from "@/lib/sfx";
import { createClient } from "@/lib/supabase/client";
import { updateAvatarAction } from "@/app/(app)/profil/actions";

// Envoi direct navigateur -> Supabase Storage, puis enregistrement du chemin
// par une server action.
//
// Le fichier ne transite pas par le serveur Next : sur un téléphone en 4G,
// une photo de 3 Mo qui ferait l'aller-retour doublerait l'attente. La policy
// du bucket n'autorise l'écriture que dans `<mon id>/…`, donc ce raccourci
// n'ouvre rien.
export function AvatarUploader({
  userId,
  nom,
  avatarActuel,
}: {
  userId: string;
  nom: string;
  avatarActuel: string | null;
}) {
  const router = useRouter();
  const [apercu, setApercu] = useState<string | null>(urlAvatar(avatarActuel));
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErreur("Photo trop lourde (2 Mo maximum).");
      jouer("erreur");
      return;
    }

    setErreur("");
    setEnvoi(true);

    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const chemin = `${userId}/${crypto.randomUUID()}.${extension}`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(chemin, file, { contentType: file.type, upsert: false });

      if (error) {
        setErreur("Envoi impossible. Réessaie.");
        jouer("erreur");
        return;
      }

      const resultat = await updateAvatarAction(chemin);
      if (!resultat.ok) {
        setErreur(resultat.error);
        jouer("erreur");
        return;
      }

      setApercu(urlAvatar(chemin));
      jouer("tampon");
      router.refresh();
    } finally {
      setEnvoi(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      {apercu ? (
        <Avatar nom={nom} url={apercu} taille="lg" />
      ) : (
        <Avatar nom={nom} taille="lg" />
      )}

      <div className="min-w-0 flex-1">
        <label className="btn btn-fantome cursor-pointer text-xs">
          <IconCamera className="h-4 w-4" />
          {envoi ? "Envoi…" : apercu ? "Changer la photo" : "Ajouter une photo"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleChange}
            disabled={envoi}
          />
        </label>
        {erreur ? (
          <p className="mt-1.5 text-xs text-braise">{erreur}</p>
        ) : (
          <p className="mt-1.5 text-[11px] text-faint">
            2 Mo maximum. Elle apparaît dans le chat et la vue d&apos;équipe.
          </p>
        )}
      </div>
    </div>
  );
}
