"use client";

import { useRouter } from "next/navigation";
import { useActionState, useRef } from "react";
import { Alerte } from "@/components/alerte";
import { Dalle } from "@/components/dalle";
import type { ActionResult } from "@/lib/errors";
import { jouer } from "@/lib/sfx";
import { startDayAction } from "./actions";

/**
 * L'objet, câblé à la journée.
 *
 * La dalle ne sait rien du métier : c'est ici qu'on décide ce qu'un appui
 * long déclenche, et ce n'est jamais la même chose selon l'état de la
 * journée :
 *
 *   - pas commencée  → ouvrir la journée (une écriture, donc une action
 *                      serveur, donc une vérification de règles) ;
 *   - en cours       → aller enregistrer une vente ;
 *   - terminée/close → rien. L'objet ne réagit plus, et on le voit : la
 *                      matière est éteinte.
 *
 * L'indice sous l'objet n'est pas décoratif. Un appui long qu'on ne
 * découvre pas est un bouton qui n'existe pas — et un bouton qui n'existe
 * pas est exactement ce qu'on s'interdit dans ce projet.
 */
export function ObjetJournee({
  charge,
  etat,
  children,
}: {
  /** 0 à 1. Calculé côté serveur à partir des ventes réelles. */
  charge: number;
  etat: "fermee" | "en_cours" | "close";
  children: React.ReactNode;
}) {
  const router = useRouter();
  const enCours = useRef(false);

  const [state, ouvrirJournee] = useActionState<ActionResult | undefined, FormData>(
    async () => {
      const resultat = await startDayAction();
      jouer(resultat.ok ? "tampon" : "erreur");
      enCours.current = false;
      return resultat;
    },
    undefined,
  );

  // L'ouverture de journée est une ÉCRITURE : elle passe par une action
  // serveur, donc par un formulaire, même si ce qui la déclenche est un
  // geste et non un bouton. Le formulaire reste dans le document, caché, et
  // le geste le soumet — le chemin est le même que partout ailleurs dans
  // l'app, avec la même gestion d'erreur et le même état de soumission.
  const formRef = useRef<HTMLFormElement>(null);

  const action =
    etat === "fermee"
      ? () => {
          if (enCours.current) return;
          enCours.current = true;
          formRef.current?.requestSubmit();
        }
      : etat === "en_cours"
        ? () => router.push("/ventes/nouvelle")
        : undefined;

  const indice =
    etat === "fermee"
      ? "Appui long pour ouvrir la journée"
      : etat === "en_cours"
        ? "Appui long pour enregistrer une vente"
        : "Journée close";

  return (
    <div className="space-y-5">
      <form ref={formRef} action={ouvrirJournee} className="hidden" />

      <Dalle
        charge={charge}
        scellee={etat === "close"}
        onOuvrir={action}
        action={indice}
      >
        {children}
      </Dalle>

      {/* L'indice respire tant que le geste n'a pas été fait : c'est la
          seule phrase qui explique comment se servir de l'objet. Une fois
          la journée ouverte, il redevient une mention calme. */}
      <p
        className={`surtitre indice-action text-center ${
          etat === "fermee" ? "indice-attente" : ""
        }`}
      >
        {indice}
      </p>

      {state && !state.ok ? <Alerte>{state.error}</Alerte> : null}
    </div>
  );
}
