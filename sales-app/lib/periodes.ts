// Périodes de la page Analytics.
//
// Toutes les dates sont calées sur Europe/Paris, comme les journées de
// travail en base. Sans ça, à 23 h en été, « aujourd'hui » côté serveur
// (UTC) serait déjà demain et la page afficherait zéro.

export type PeriodeId =
  | "aujourdhui"
  | "hier"
  | "semaine"
  | "mois"
  | "personnalisee";

export const PERIODE_LABEL: Record<PeriodeId, string> = {
  aujourdhui: "Aujourd'hui",
  hier: "Hier",
  semaine: "Cette semaine",
  mois: "Ce mois",
  personnalisee: "Période",
};

function parisDate(offsetJours = 0): string {
  const maintenant = new Date();
  maintenant.setUTCDate(maintenant.getUTCDate() + offsetJours);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(maintenant);
}

export function resoudrePeriode(
  id: PeriodeId,
  debut?: string,
  fin?: string,
): { from: string; to: string } {
  const aujourdhui = parisDate();

  switch (id) {
    case "hier": {
      const hier = parisDate(-1);
      return { from: hier, to: hier };
    }
    case "semaine": {
      // Semaine française : du lundi au jour courant.
      const jour = new Date(`${aujourdhui}T12:00:00Z`).getUTCDay();
      const depuisLundi = (jour + 6) % 7;
      return { from: parisDate(-depuisLundi), to: aujourdhui };
    }
    case "mois": {
      return { from: `${aujourdhui.slice(0, 7)}-01`, to: aujourdhui };
    }
    case "personnalisee": {
      const from = debut && /^\d{4}-\d{2}-\d{2}$/.test(debut) ? debut : aujourdhui;
      const to = fin && /^\d{4}-\d{2}-\d{2}$/.test(fin) ? fin : aujourdhui;
      return from <= to ? { from, to } : { from: to, to: from };
    }
    default:
      return { from: aujourdhui, to: aujourdhui };
  }
}

export function estPeriodeId(value: string | undefined): value is PeriodeId {
  return (
    value === "aujourdhui" ||
    value === "hier" ||
    value === "semaine" ||
    value === "mois" ||
    value === "personnalisee"
  );
}

// Liste des jours d'une période, pour que l'histogramme montre aussi les
// jours creux — un trou dans la courbe est une information.
export function joursEntre(from: string, to: string, maximum = 92): string[] {
  const jours: string[] = [];
  const curseur = new Date(`${from}T12:00:00Z`);
  const fin = new Date(`${to}T12:00:00Z`);

  while (curseur <= fin && jours.length < maximum) {
    jours.push(curseur.toISOString().slice(0, 10));
    curseur.setUTCDate(curseur.getUTCDate() + 1);
  }

  return jours;
}
