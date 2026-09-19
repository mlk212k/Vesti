import type { Metadata } from "next";
import Link from "next/link";
import { IconBack } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { BusinessForm } from "../business-form";
import { createBusinessAction } from "../actions";

export const metadata: Metadata = { title: "Nouveau commerce" };

export default async function NewBusinessPage() {
  const user = await requireUser();

  return (
    <div className="montee">
      <Link
        href="/commerces"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-faint hover:text-dim"
      >
        <IconBack className="h-4 w-4" />
        Commerces
      </Link>

      <h1 className="titre mb-1 text-3xl">Nouveau commerce</h1>
      <p className="mb-6 text-sm text-faint">
        Seul le nom est obligatoire — le reste se complète au fil des visites.
      </p>

      <BusinessForm
        action={createBusinessAction}
        userId={user.id}
        labelBouton="Créer la fiche"
        redirection="/commerces"
      />
    </div>
  );
}
