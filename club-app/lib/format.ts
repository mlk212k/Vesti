const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const shortFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function formatShort(iso: string): string {
  return shortFmt.format(new Date(iso));
}

export function eventKindLabel(kind: string): string {
  switch (kind) {
    case "match":
      return "Match";
    case "training":
      return "Entraînement";
    case "meeting":
      return "Réunion";
    default:
      return "Autre";
  }
}

export function roleLabel(role: string): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "coach":
      return "Coach";
    case "member":
      return "Membre";
    default:
      return role;
  }
}
