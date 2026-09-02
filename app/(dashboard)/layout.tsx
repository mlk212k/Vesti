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
    // Coque de hauteur fixe qui ne défile JAMAIS : c'est ce qui empêche la
    // barre du bas de bouger sur iOS. Tant que le document lui-même défile,
    // Safari applique son rebond élastique à tout ce qu'il contient, y compris
    // aux éléments en position fixe.
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Le seul élément qui défile. `overscroll-contain` empêche le rebond de
          se propager au document au-dessus, donc à la barre. */}
      <div className="flex flex-1 flex-col overflow-y-auto overscroll-contain">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
