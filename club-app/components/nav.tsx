import Image from "next/image";
import Link from "next/link";
import type { Role } from "@/lib/auth";
import { roleLabel } from "@/lib/format";

const clubName = process.env.NEXT_PUBLIC_CLUB_NAME ?? "US Guentrange";

export function TopBar({
  fullName,
  role,
  avatarUrl,
}: {
  fullName: string;
  role: Role;
  avatarUrl: string | null;
}) {
  const initial = fullName.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="safe-top clay-bar sticky top-0 z-20 bg-background/90 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-display font-semibold tracking-tight"
        >
          <Image
            src="/logo.jpg"
            alt=""
            width={28}
            height={28}
            className="clay-galet"
            priority
          />
          <span className="text-[15px]">{clubName}</span>
        </Link>

        <Link href="/profile" aria-label="Mon profil" className="flex items-center gap-2">
          {role !== "member" && (
            <span className="clay-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
              {roleLabel(role)}
            </span>
          )}
          <span className="clay-accent relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden text-sm font-semibold">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 object-cover"
                unoptimized
              />
            ) : (
              initial
            )}
          </span>
        </Link>
      </div>
    </header>
  );
}
