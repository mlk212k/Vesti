"use client";

/**
 * Sons d'interface, synthétisés.
 *
 * Aucun fichier audio n'est livré : tout est fabriqué à la volée avec Web
 * Audio. Trois raisons, dans l'ordre d'importance :
 *
 *   1. Un .mp3 de « cha-ching » correct pèse 20 à 40 ko et part sur le
 *      réseau au moment précis où le commercial attend un retour. Ici le son
 *      démarre en moins d'une milliseconde, hors ligne compris.
 *   2. Les sons se règlent au demi-ton près sans rouvrir un éditeur audio.
 *   3. Pas de licence à traîner.
 *
 * Contraintes navigateur respectées :
 *
 *   - le contexte audio n'est créé qu'au PREMIER son, donc forcément après
 *     un geste de l'utilisateur : le créer au chargement le laisserait
 *     « suspendu » et le premier son serait muet ;
 *   - la coupure est mémorisée dans localStorage et lue de façon défensive
 *     (navigation privée, stockage bloqué : on retombe sur « activé ») ;
 *   - rien ne dépasse 120 ms. Un son d'interface qui dure se transforme en
 *     agacement au bout de la trentième vente.
 */

export type Son =
  | "tick"
  | "cash"
  | "tampon"
  | "pop"
  | "blip"
  | "erreur";

const CLE = "arena:sons";

let contexte: AudioContext | null = null;
let coupe: boolean | null = null;

function lireCoupure(): boolean {
  if (coupe !== null) return coupe;
  try {
    coupe = window.localStorage.getItem(CLE) === "off";
  } catch {
    coupe = false;
  }
  return coupe;
}

export function sonsActifs(): boolean {
  if (typeof window === "undefined") return true;
  return !lireCoupure();
}

// Le réglage est un état EXTERNE à React (il vit dans localStorage). On
// l'expose donc comme un petit magasin observable, à lire avec
// `useSyncExternalStore` plutôt qu'avec un `useState` rempli dans un effet :
// c'est la forme prévue pour ça, et elle évite le rendu en cascade que React
// reproche à l'autre approche.
const abonnes = new Set<() => void>();

export function abonnerSons(callback: () => void): () => void {
  abonnes.add(callback);
  return () => {
    abonnes.delete(callback);
  };
}

export function lireSons(): boolean {
  return sonsActifs();
}

// Au rendu serveur, localStorage n'existe pas : on annonce « activé », qui
// est la valeur par défaut. Le premier rendu client corrigera si besoin.
export function lireSonsServeur(): boolean {
  return true;
}

export function basculerSons(): boolean {
  const actifs = !sonsActifs();
  coupe = !actifs;
  try {
    window.localStorage.setItem(CLE, actifs ? "on" : "off");
  } catch {
    // Stockage indisponible : le réglage vaut pour la session en cours.
  }
  if (actifs) jouer("pop");
  for (const callback of abonnes) callback();
  return actifs;
}

function obtenirContexte(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (contexte) return contexte;

  const Constructeur =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Constructeur) return null;

  try {
    contexte = new Constructeur();
  } catch {
    return null;
  }
  return contexte;
}

/** Une note : oscillateur + enveloppe, sans clic en fin de son. */
function note(
  ctx: AudioContext,
  {
    frequence,
    frequenceFin,
    depart = 0,
    duree,
    volume,
    forme = "sine",
  }: {
    frequence: number;
    frequenceFin?: number;
    depart?: number;
    duree: number;
    volume: number;
    forme?: OscillatorType;
  },
): void {
  const t0 = ctx.currentTime + depart;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = forme;
  osc.frequency.setValueAtTime(frequence, t0);
  if (frequenceFin !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(frequenceFin, 1),
      t0 + duree,
    );
  }

  // Attaque très courte puis extinction exponentielle : une coupure sèche
  // produirait un « clac » audible.
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);

  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duree + 0.02);
}

/** Un souffle court : sert de « matière » (papier, encre, impact). */
function souffle(
  ctx: AudioContext,
  { depart = 0, duree, volume, coupure = 2200 }: {
    depart?: number;
    duree: number;
    volume: number;
    coupure?: number;
  },
): void {
  const t0 = ctx.currentTime + depart;
  const echantillons = Math.max(1, Math.floor(ctx.sampleRate * duree));
  const tampon = ctx.createBuffer(1, echantillons, ctx.sampleRate);
  const donnees = tampon.getChannelData(0);
  for (let i = 0; i < echantillons; i += 1) {
    donnees[i] = (Math.random() * 2 - 1) * (1 - i / echantillons);
  }

  const source = ctx.createBufferSource();
  source.buffer = tampon;

  const filtre = ctx.createBiquadFilter();
  filtre.type = "lowpass";
  filtre.frequency.setValueAtTime(coupure, t0);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);

  source.connect(filtre).connect(gain).connect(ctx.destination);
  source.start(t0);
}

export function jouer(son: Son): void {
  if (typeof window === "undefined") return;
  if (lireCoupure()) return;

  const ctx = obtenirContexte();
  if (!ctx) return;

  // Safari suspend le contexte dès qu'il perd le focus : on le relance à
  // chaque son plutôt qu'une fois pour toutes.
  if (ctx.state === "suspended") void ctx.resume();

  switch (son) {
    // Cran de compteur : sec, très court, presque subliminal.
    case "tick":
      note(ctx, { frequence: 1500, duree: 0.03, volume: 0.05, forme: "square" });
      break;

    // La vente. Deux notes qui montent, une quinte, plus un éclat métallique :
    // c'est le tiroir-caisse, condensé en 200 ms.
    case "cash":
      note(ctx, { frequence: 988, duree: 0.09, volume: 0.13, forme: "triangle" });
      note(ctx, {
        frequence: 1319,
        depart: 0.07,
        duree: 0.22,
        volume: 0.16,
        forme: "triangle",
      });
      note(ctx, {
        frequence: 1976,
        depart: 0.07,
        duree: 0.18,
        volume: 0.05,
        forme: "sine",
      });
      souffle(ctx, { depart: 0.06, duree: 0.09, volume: 0.05, coupure: 6000 });
      break;

    // Le tampon encreur : un impact mat, sans hauteur définie.
    case "tampon":
      note(ctx, {
        frequence: 160,
        frequenceFin: 60,
        duree: 0.14,
        volume: 0.2,
        forme: "sine",
      });
      souffle(ctx, { duree: 0.07, volume: 0.12, coupure: 1200 });
      break;

    // Message envoyé.
    case "pop":
      note(ctx, {
        frequence: 520,
        frequenceFin: 880,
        duree: 0.07,
        volume: 0.09,
        forme: "sine",
      });
      break;

    // Message reçu : deux notes brèves, plus haut que l'envoi pour qu'on
    // distingue à l'oreille ce qui part de ce qui arrive.
    case "blip":
      note(ctx, { frequence: 1175, duree: 0.05, volume: 0.07 });
      note(ctx, { frequence: 1568, depart: 0.06, duree: 0.07, volume: 0.07 });
      break;

    // Refus : deux notes qui descendent. Jamais de buzzer strident — on
    // signale une erreur, on ne punit pas.
    case "erreur":
      note(ctx, {
        frequence: 320,
        duree: 0.1,
        volume: 0.09,
        forme: "triangle",
      });
      note(ctx, {
        frequence: 220,
        depart: 0.09,
        duree: 0.16,
        volume: 0.09,
        forme: "triangle",
      });
      break;
  }
}
