import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/nav/bottom-nav";

/**
 * Garde des routes privées.
 *
 * proxy.ts a déjà vérifié la présence d'une session ; ici on vérifie ce que le
 * proxy ne fait pas — que l'onboarding est terminé — en profitant du profil
 * qu'on doit de toute façon charger. Le double contrôle de session couvre
 * l'expiration entre le proxy et le rendu.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarded_at) redirect("/onboarding");

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      {/* La barre est en position fixe : elle ne pousse plus le contenu. On
          réserve donc sa hauteur ici, plus la zone tactile d'iOS, sans quoi le
          dernier élément de chaque page finit caché dessous. */}
      <div
        className="flex flex-1 flex-col"
        style={{
          paddingBottom:
            "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
