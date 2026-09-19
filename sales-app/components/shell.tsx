"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { IconBell, IconLogout } from "@/components/icons";
import { mobileNavFor, navFor } from "@/lib/nav";
import { initials } from "@/lib/format";
import { ROLE_LABEL, type Role } from "@/lib/types";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

// Colonne de gauche, à partir de `lg`. Sur mobile elle n'existe pas du tout
// (pas de tiroir coulissant) : la barre du bas suffit, et un tiroir de plus
// serait un geste de plus pour quelqu'un qui enregistre une vente sur le
// trottoir.
export function Sidebar({
  role,
  appName,
  fullName,
}: {
  role: Role;
  appName: string;
  fullName: string;
}) {
  const pathname = usePathname();
  const items = navFor(role);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-[rgba(9,9,13,0.72)] backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <Logo className="h-8 w-8" />
        <div>
          <p className="titre text-lg leading-none">{appName}</p>
          <p className="surtitre mt-1">{ROLE_LABEL[role]}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`lien-lateral ${active ? "lien-lateral-actif" : ""}`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.6} />
              <span className={active ? "font-medium" : ""}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <div className="mb-2 flex items-center gap-2.5 px-2 py-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-[11px] font-bold">
            {initials(fullName)}
          </span>
          <span className="truncate text-sm text-dim">{fullName}</span>
        </div>
        <form action="/logout" method="post">
          <button
            type="submit"
            className="lien-lateral w-full text-left text-faint hover:text-danger"
          >
            <IconLogout className="h-[18px] w-[18px]" />
            Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  );
}

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = mobileNavFor(role);

  return (
    <nav className="barre-nav safe-bottom fixed inset-x-0 bottom-0 z-30 lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 pt-2.5 pb-2 text-[10px] font-medium tracking-wide ${
                active ? "onglet-actif" : "text-faint"
              }`}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.1 : 1.6} />
              <span className="uppercase">{item.short}</span>
              <span className="onglet-marque w-6" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Barre du haut, mobile uniquement : marque à gauche, notifications à droite.
export function TopBar({
  appName,
  unread,
}: {
  appName: string;
  unread: number;
}) {
  return (
    <header className="safe-top sticky top-0 z-20 -mx-4 mb-4 flex items-center justify-between border-b border-line bg-[rgba(7,7,10,0.72)] px-4 py-3 backdrop-blur-xl lg:hidden">
      <Link href="/" className="flex items-center gap-2">
        <Logo className="h-7 w-7" />
        <span className="titre text-base">{appName}</span>
      </Link>

      <Link
        href="/notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface-2"
        aria-label={
          unread > 0 ? `${unread} notification(s) non lue(s)` : "Notifications"
        }
      >
        <IconBell className="h-[18px] w-[18px] text-dim" />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-magenta px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Link>
    </header>
  );
}

// Équivalent desktop de la cloche, posé en haut à droite du contenu.
export function DesktopBell({ unread }: { unread: number }) {
  return (
    <Link
      href="/notifications"
      className="relative hidden h-10 w-10 items-center justify-center rounded-full border border-line bg-surface-2 transition-colors hover:border-[var(--line-strong)] lg:flex"
      aria-label={
        unread > 0 ? `${unread} notification(s) non lue(s)` : "Notifications"
      }
    >
      <IconBell className="h-5 w-5 text-dim" />
      {unread > 0 ? (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-magenta px-1 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
