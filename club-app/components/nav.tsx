import Image from "next/image";
import Link from "next/link";
import type { Role } from "@/lib/auth";

const clubName = process.env.NEXT_PUBLIC_CLUB_NAME ?? "US Guentrange";

export function TopBar({ fullName }: { fullName: string; role: Role }) {
  const initial = fullName.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="safe-top sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <Image
            src="/logo.jpg"
            alt=""
            width={28}
            height={28}
            className="rounded-full ring-1 ring-border"
            priority
          />
          <span className="text-[15px]">{clubName}</span>
        </Link>

        <Link
          href="/profile"
          aria-label="Mon profil"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white"
        >
          {initial}
        </Link>
      </div>
    </header>
  );
}
