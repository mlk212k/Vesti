"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/auth";
import { roleLabel } from "@/lib/format";

import Image from "next/image";

const clubName = process.env.NEXT_PUBLIC_CLUB_NAME ?? "US Guentrange";

const links = [
  { href: "/dashboard", label: "Accueil" },
  { href: "/events", label: "Calendrier" },
  { href: "/members", label: "Membres" },
  { href: "/announcements", label: "Annonces" },
  { href: "/chat", label: "Chat" },
  { href: "/club", label: "Le Club" },
];

export function Nav({
  fullName,
  role,
}: {
  fullName: string;
  role: Role;
}) {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto max-w-5xl px-4 py-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
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
            {clubName}
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {links.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 transition ${
                    active
                      ? "bg-accent text-black"
                      : "text-muted hover:text-foreground hover:bg-surface-2"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/profile"
            className="rounded-md px-2 py-1 hover:bg-surface-2"
          >
            <span className="text-muted">{roleLabel(role)}</span>{" "}
            <span>{fullName}</span>
          </Link>
          <form action="/logout" method="post">
            <button
              type="submit"
              className="rounded-md border border-border px-2 py-1 text-muted hover:text-foreground hover:bg-surface-2"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
