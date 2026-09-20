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
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-[rgba(23,21,26,0.72)] shadow-[inset_-1px_0_0_0_var(--trait)] backdrop-blur-2xl lg:flex">
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

      <div className="p-3 shadow-[inset_0_1px_0_0_var(--trait)]">
        <div className="mb-2 flex items-center gap-2.5 px-2 py-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-velours text-sm text-dim ring-1 ring-white/[0.06]">
            {initials(fullName)}
          </span>
          <span className="truncate text-sm text-dim">{fullName}</span>
        </div>
        <form action="/logout" method="post">
          <button
            type="submit"
            className="lien-lateral w-full text-left text-faint hover:text-craie"
          >
            <IconLogout className="h-[18px] w-[18px]" />
            Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  );
}

/**
 * La barre du bas.
 *
 * Les libellés sont revenus : une rangée d'icônes sans texte, on ne sait
 * jamais où on va. L'onglet actif est une pastille douce qui grossit
 * derrière l'icône, pas un trait.
 */
export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = mobileNavFor(role);

  return (
    <nav className="barre-nav safe-bottom fixed inset-x-0 bottom-0 z-30 pt-2">
      <div className="mx-auto flex max-w-lg items-stretch px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1.5 pt-2.5 pb-3 text-sm transition-colors duration-500 ${
                active ? "onglet-actif" : "text-faint"
              }`}
            >
              <span className="relative flex items-center justify-center">
                <span className="onglet-pastille" aria-hidden="true" />
                <Icon
                  className="relative h-[21px] w-[21px]"
                  strokeWidth={active ? 2 : 1.6}
                />
              </span>
              <span className={active ? "font-semibold" : ""}>{item.short}</span>
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
    <header className="safe-top sticky top-0 z-20 -mx-4 mb-6 flex items-center justify-between bg-[rgba(16,14,18,0.6)] px-4 py-3 backdrop-blur-2xl lg:hidden">
      <Link href="/" className="flex items-center gap-2">
        <Logo className="h-7 w-7" />
        <span className="titre text-base">{appName}</span>
      </Link>

      <Link
        href="/notifications"
        className="relative flex h-9 w-9 items-center justify-center"
        aria-label={
          unread > 0 ? `${unread} notification(s) non lue(s)` : "Notifications"
        }
      >
        <IconBell className="h-[18px] w-[18px] text-dim" />
        {unread > 0 ? (
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-lilas" />
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
      className="relative hidden h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/[0.04] lg:flex"
      aria-label={
        unread > 0 ? `${unread} notification(s) non lue(s)` : "Notifications"
      }
    >
      <IconBell className="h-5 w-5 text-dim" />
      {unread > 0 ? (
        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-lilas" />
      ) : null}
    </Link>
  );
}
