import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Mentions légales — ${SITE_NAME}` };

export default function MentionsLegalesPage() {
  return (
    <>
      <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Mentions légales</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Éditeur du site</h2>
        <p>
          {LEGAL.editeur} — {LEGAL.statut}
          <br />
          SIRET : {LEGAL.siret}
          <br />
          TVA : {LEGAL.tvaIntracom}
          <br />
          Siège : {LEGAL.adresse}
          <br />
          Contact : {LEGAL.email}
          {LEGAL.telephone ? ` — ${LEGAL.telephone}` : ""}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Directeur de la publication</h2>
        <p>{LEGAL.directeurPublication}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Hébergement</h2>
        <ul className="flex flex-col gap-1">
          {LEGAL.hebergeurs.map((h) => (
            <li key={h.nom}>
              <strong>{h.nom}</strong> — {h.role} ({h.lieu})
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble des contenus du site ({SITE_NAME}, son interface, ses
          textes et ses visuels) est protégé par le droit d&apos;auteur. Les
          photographies transmises par les utilisateurs restent leur propriété
          exclusive ; {SITE_NAME} n&apos;acquiert aucun droit dessus au-delà de
          ce qui est nécessaire pour fournir le service.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Signaler un contenu</h2>
        <p>
          Toute demande relative à un contenu publié ou à un compte peut être
          adressée à {LEGAL.email}.
        </p>
      </section>
    </>
  );
}
