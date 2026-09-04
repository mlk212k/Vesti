import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Les listes de réglages : un groupe titré, des lignes séparées d'un filet.
 *
 * ⚠️ Pourquoi une liste et non des cartes. Chaque réglage encadré de sa propre
 * bordure dit « objet indépendant » — or ce sont des entrées d'un même sommaire.
 * Le filet entre les lignes le dit en un pixel, là où des bordures complètes
 * inventent une séparation qui n'existe pas. C'est le même défaut qu'on a retiré
 * de l'accueil, et la raison pour laquelle il n'a pas été réintroduit ici.
 *
 * Le titre du groupe, lui, fait le travail que les bordures prétendaient faire :
 * il dit de quoi parle la liste, ce qu'aucun cadre ne sait dire.
 */
export function SettingsGroup({
  title,
  footnote,
  children,
}: {
  title: string;
  /** Précision sous le groupe, pour ce qu'un libellé de ligne ne peut porter. */
  footnote?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-xs font-bold uppercase tracking-[0.08em] text-muted">
        {title}
      </h2>
      <div className="divide-y divide-border-soft overflow-hidden rounded-[var(--radius-card)] border border-border-soft bg-surface">
        {children}
      </div>
      {footnote && (
        <p className="px-1 text-xs leading-relaxed text-muted">{footnote}</p>
      )}
    </section>
  );
}

interface RowContent {
  label: string;
  /** Ce que vaut le réglage aujourd'hui. Sans lui, il faut ouvrir pour savoir. */
  value?: string | null;
  hint?: string;
}

function RowBody({ label, value, hint, chevron }: RowContent & { chevron: boolean }) {
  return (
    <>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] font-medium">{label}</span>
        {hint && <span className="text-xs leading-relaxed text-muted">{hint}</span>}
      </span>
      <span className="flex flex-none items-center gap-2">
        {value && (
          <span className="max-w-[9rem] truncate text-sm text-muted">{value}</span>
        )}
        {chevron && <Chevron />}
      </span>
    </>
  );
}

/** Ligne qui mène ailleurs. */
export function SettingsLink({
  href,
  ...content
}: RowContent & { href: string }) {
  return (
    <Link
      href={href}
      // 52 px : la même cible tactile que les boutons. Une ligne de liste se
      // touche autant qu'un bouton, elle n'a aucune raison d'être plus petite.
      className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-3 transition-colors active:bg-surface-sunken"
    >
      <RowBody {...content} chevron />
    </Link>
  );
}

/**
 * Ligne qui mène HORS de Vesti.
 *
 * ⚠️ Distincte de `SettingsLink`, et pas seulement pour la flèche. Vesti tourne
 * en app installée : un lien externe ouvert dans la même fenêtre remplacerait
 * l'app entière, et il n'y a alors aucune barre de navigateur pour revenir. La
 * flèche oblique le dit avant le tap, `target="_blank"` s'en charge après, et
 * `rel` empêche la page ouverte de garder une prise sur celle-ci.
 */
export function SettingsExternal({
  href,
  ...content
}: RowContent & { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-3 transition-colors active:bg-surface-sunken"
      style={{ touchAction: "manipulation" }}
    >
      <RowBody {...content} chevron={false} />
      <ExternalArrow />
    </a>
  );
}

/** Ligne qui ne fait qu'afficher — pas de chevron, donc rien à toucher. */
export function SettingsValue(content: RowContent) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-3">
      <RowBody {...content} chevron={false} />
    </div>
  );
}

/** Ligne qui contient son propre contrôle (un sélecteur, un interrupteur). */
export function SettingsCustom({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-medium">{label}</span>
        {hint && <span className="text-xs leading-relaxed text-muted">{hint}</span>}
      </span>
      {children}
    </div>
  );
}

function ExternalArrow() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-none text-muted"
      aria-hidden
    >
      <path d="M8 16 16 8" />
      <path d="M9.5 8H16v6.5" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-none text-muted"
      aria-hidden
    >
      <path d="M9.5 5.5 16 12l-6.5 6.5" />
    </svg>
  );
}
