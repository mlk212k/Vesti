import { requireUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/queries";
import { BottomNav, DesktopBell, Sidebar, TopBar } from "@/components/shell";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "ARENA";

// Coquille commune à toutes les pages connectées.
//
// `requireUser` est appelé ici ET dans les pages sensibles. Le doublon est
// voulu : un layout ne protège pas ses enfants en Next (une page peut être
// atteinte par un rendu partiel), donc chaque page qui compte refait sa
// vérification.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const unread = await getUnreadCount();

  return (
    <div className="min-h-screen">
      <Sidebar role={user.role} appName={appName} fullName={user.full_name} />

      <div className="lg:pl-60">
        <div className="mx-auto w-full max-w-5xl px-4 pb-28 lg:px-8 lg:pt-8 lg:pb-12">
          <TopBar appName={appName} unread={unread} />

          <div className="hidden justify-end lg:mb-2 lg:flex">
            <DesktopBell unread={unread} />
          </div>

          {children}
        </div>
      </div>

      <BottomNav role={user.role} />
    </div>
  );
}
