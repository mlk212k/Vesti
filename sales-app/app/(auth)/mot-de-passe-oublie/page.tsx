import type { Metadata } from "next";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <div className="montee panneau p-6">
      <h1 className="titre mb-1 text-2xl">Mot de passe oublié</h1>
      <p className="mb-6 text-sm text-dim">
        On t&apos;envoie un lien pour en choisir un nouveau.
      </p>
      <ResetForm />
    </div>
  );
}
