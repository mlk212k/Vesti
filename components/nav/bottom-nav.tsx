"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Barre de navigation basse : le repère standard sur mobile, à portée de pouce.
 * Ne référence que des routes existantes — un onglet mort coûte plus cher qu'un
 * onglet manquant.
 */
const TABS = [
  { href: "/dashboard", label: "Accueil", icon: HomeIcon },
  { href: "/analyze", label: "Analyser", icon: CameraIcon },
  { href: "/dressing", label: "Dressing", icon: HangerIcon },
  { href: "/shopping", label: "Acheter", icon: BagIcon },
  { href: "/history", label: "Progrès", icon: ChartIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky bottom-0 z-20 flex border-t border-border-soft bg-background/85 backdrop-blur-xl"
      // Respecte la zone tactile réservée par iOS en bas d'écran.
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 pt-1.5 text-[11px] font-semibold transition ${
              active ? "text-accent-strong" : "text-muted"
            }`}
          >
            {/* Pastille violette sous l'icône : l'onglet actif se repère sans
                lire, ce qui compte quand le pouce cache la moitié de la barre. */}
            <span
              className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
                active ? "bg-accent-soft" : "bg-transparent"
              }`}
            >
              <Icon active={active} />
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function iconProps(active: boolean) {
  return {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: active ? 2.2 : 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function CameraIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M3 8h3l2-3h8l2 3h3v12H3z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function HangerIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M12 8a2.5 2.5 0 1 1 2.5-2.5" />
      <path d="M12 8v2.5L3.5 16.5a1.5 1.5 0 0 0 .9 2.7h15.2a1.5 1.5 0 0 0 .9-2.7L12 10.5" />
    </svg>
  );
}

function BagIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 15l4-5 3 3 4-6" />
    </svg>
  );
}
