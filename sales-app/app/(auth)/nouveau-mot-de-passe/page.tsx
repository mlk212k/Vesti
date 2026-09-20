import type { Metadata } from "next";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default function NewPasswordPage() {
  return (
    <div className="montee panneau p-6">
      <h1 className="titre mb-1 text-2xl">Nouveau mot de passe</h1>
      <p className="mb-6 text-sm text-dim">
        Choisis-en un que tu retiendras — il sera demandé à chaque connexion.
      </p>
      <PasswordForm />
    </div>
  );
}
