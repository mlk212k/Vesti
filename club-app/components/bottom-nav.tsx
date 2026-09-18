"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  CalendarIcon,
  HomeIcon,
  MessageIcon,
  UsersIcon,
} from "./icons";

const tabs = [
  { href: "/dashboard", label: "Accueil", icon: HomeIcon },
  { href: "/events", label: "Calendrier", icon: CalendarIcon },
  { href: "/members", label: "Membres", icon: UsersIcon },
  { href: "/announcements", label: "Annonces", icon: BellIcon },
  { href: "/chat", label: "Chat", icon: MessageIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom sticky bottom-0 z-20 px-3 pb-2">
      <div className="clay-galet flex items-stretch justify-between px-1 shadow-lg">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]"
            >
              <Icon
                className={`h-5 w-5 ${active ? "text-accent" : "text-muted"}`}
                strokeWidth={active ? 2.25 : 1.75}
              />
              <span
                className={active ? "font-medium text-accent" : "text-muted"}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
