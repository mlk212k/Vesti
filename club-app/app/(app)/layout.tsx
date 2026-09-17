import { BottomNav } from "@/components/bottom-nav";
import { TopBar } from "@/components/nav";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen justify-center bg-surface">
      <div className="flex min-h-screen w-full max-w-md flex-col bg-background sm:border-x sm:border-border">
        <TopBar fullName={user.full_name} role={user.role} />
        <main className="flex-1 px-4 py-6">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
