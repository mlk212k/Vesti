"use client";

import { useRef, useState } from "react";
import { IconCamera, IconTrash } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";

// Envoi direct navigateur -> Supabase Storage.
//
// La photo ne transite pas par le serveur Next : sur un téléphone en 4G, une
// image de 4 Mo qui ferait l'aller-retour doublerait l'attente. Le bucket est
// privé et la policy n'autorise l'écriture que dans `<mon id>/…`, donc ce
// raccourci n'ouvre rien.
//
// Le champ caché porte le chemin de l'objet ; l'affichage passera plus tard
// par une URL signée (lib/storage.ts).
export function PhotoUpload({
  name = "photo_url",
  userId,
  label = "Photo / preuve",
}: {
  name?: string;
  userId: string;
  label?: string;
}) {
  const [path, setPath] = useState<string>("");
  const [apercu, setApercu] = useState<string>("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErreur("Photo trop lourde (5 Mo maximum).");
      return;
    }

    setErreur("");
    setEnvoi(true);

    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const objectPath = `${userId}/${crypto.randomUUID()}.${extension}`;

      const { error } = await supabase.storage
        .from("proofs")
        .upload(objectPath, file, { contentType: file.type, upsert: false });

      if (error) {
        setErreur("Envoi impossible. Réessaie.");
        return;
      }

      setPath(objectPath);
      setApercu(URL.createObjectURL(file));
    } finally {
      setEnvoi(false);
    }
  }

  function retirer() {
    setPath("");
    setApercu("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <span className="libelle">{label}</span>
      <input type="hidden" name={name} value={path} />

      {apercu ? (
        <div className="panneau-creux flex items-center gap-3 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- aperçu
              local d'un blob, pas une ressource distante à optimiser. */}
          <img
            src={apercu}
            alt="Aperçu de la photo"
            className="h-16 w-16 rounded-lg object-cover"
          />
          <span className="flex-1 text-sm text-dim">Photo prête</span>
          <button
            type="button"
            onClick={retirer}
            className="btn btn-fantome px-3 py-2"
            aria-label="Retirer la photo"
          >
            <IconTrash className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="panneau-creux flex cursor-pointer items-center gap-3 p-4 text-sm text-faint">
          <IconCamera className="h-5 w-5" />
          {envoi ? "Envoi en cours…" : "Ajouter une photo (facultatif)"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={handleChange}
            disabled={envoi}
          />
        </label>
      )}

      {erreur ? <p className="mt-1.5 text-sm text-peche">{erreur}</p> : null}
    </div>
  );
}
