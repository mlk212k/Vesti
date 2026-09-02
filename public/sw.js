/*
 * Service worker minimal — volontairement.
 *
 * Il existe pour une seule raison : Chrome sur Android n'émet l'événement
 * `beforeinstallprompt` (le bouton « Installer l'application » en un tap) que si
 * un service worker avec un gestionnaire `fetch` est enregistré. Sans ce
 * fichier, ce bouton n'apparaîtrait jamais et il ne resterait que les
 * instructions manuelles.
 *
 * Il ne met RIEN en cache, et c'est délibéré. Une app Next.js sert des bundles
 * dont le nom change à chaque build ; un cache mal réglé sert une coquille
 * périmée qui référence des fichiers qui n'existent plus — l'app se retrouve
 * blanche chez les gens déjà installés, et un service worker se désinstalle
 * mal. Le gestionnaire ci-dessous laisse donc passer chaque requête au réseau,
 * exactement comme s'il n'était pas là.
 *
 * Si tu ajoutes du cache un jour, fais-le avec une stratégie « réseau d'abord »
 * et une purge de version, jamais « cache d'abord » sur les navigations.
 */

self.addEventListener("install", () => {
  // Pas d'attente : la première visite doit être installable tout de suite.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Volontairement vide : la requête suit son cours normal vers le réseau.
});
