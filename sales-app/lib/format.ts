const DATE_LONG = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const DATE_SHORT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

const TIME = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

const DATETIME = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateLong(value: string | Date): string {
  return DATE_LONG.format(new Date(value));
}

export function formatDateShort(value: string | Date): string {
  return DATE_SHORT.format(new Date(value));
}

export function formatTime(value: string | Date): string {
  return TIME.format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return DATETIME.format(new Date(value));
}

// « 7H32 » — le format demandé pour le temps de travail.
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds ?? 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  return `${hours}H${String(minutes).padStart(2, "0")}`;
}

export function formatRelative(value: string | Date): string {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return formatDateShort(date);
}

// Date du jour côté Paris, au format ISO court — la même référence que la
// base (les journées sont datées en Europe/Paris).
export function parisToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function initials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
