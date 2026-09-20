// Service worker de l'application installée.
//
// Politique volontairement prudente, et voici pourquoi :
//
//   Les PAGES ne sont JAMAIS mises en cache. Elles contiennent les données
//   d'une personne connectée ; une page servie depuis le cache pourrait
//   réapparaître après un changement de compte sur le même téléphone, ou
//   afficher un chiffre d'affaires périmé sans que rien ne le signale. Hors
//   ligne, on montre donc un écran « hors ligne » honnête plutôt qu'une
//   version d'hier maquillée en version d'aujourd'hui.
//
//   Seuls les fichiers statiques versionnés (/_next/static, icônes) sont mis
//   en cache : leur nom change à chaque build, ils ne peuvent pas être
//   périmés, et ce sont eux qui font démarrer l'app instantanément.

const VERSION = "v2";
const CACHE_STATIQUE = `arena-statique-${VERSION}`;
const CACHE_COQUILLE = `arena-coquille-${VERSION}`;

const COQUILLE = [
  "/hors-ligne",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_COQUILLE)
      .then((cache) => cache.addAll(COQUILLE))
      // Un échec de pré-cache ne doit pas empêcher l'installation : mieux
      // vaut un service worker sans page hors ligne qu'aucun service worker.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((noms) =>
        Promise.all(
          noms
            .filter((nom) => !nom.endsWith(VERSION))
            .map((nom) => caches.delete(nom)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function estStatique(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\/icon-\d+(-maskable)?\.png$/.test(url.pathname) ||
    url.pathname === "/apple-icon.png"
  );
}

self.addEventListener("fetch", (event) => {
  const requete = event.request;

  // On ne touche ni aux écritures, ni à ce qui part vers un autre domaine
  // (Supabase, polices). Un service worker qui s'interpose sur un POST est
  // la meilleure façon de perdre une vente.
  if (requete.method !== "GET") return;

  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;

  if (estStatique(url)) {
    event.respondWith(
      caches.match(requete).then(
        (enCache) =>
          enCache ||
          fetch(requete).then((reponse) => {
            if (reponse.ok) {
              const copie = reponse.clone();
              caches.open(CACHE_STATIQUE).then((cache) => cache.put(requete, copie));
            }
            return reponse;
          }),
      ),
    );
    return;
  }

  if (requete.mode === "navigate") {
    event.respondWith(
      fetch(requete).catch(() =>
        caches.match("/hors-ligne").then(
          (page) =>
            page ||
            new Response("Hors ligne", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            }),
        ),
      ),
    );
  }
});

// ===========================================================================
// NOTIFICATIONS PUSH
//
// Le message arrive chiffré depuis le service de push du navigateur ; il est
// déchiffré avant d'atterrir ici. Il contient le strict nécessaire — titre,
// texte, lien — et aucun chiffre d'affaires : une notification s'affiche sur
// un écran verrouillé, potentiellement devant quelqu'un d'autre.
// ===========================================================================

self.addEventListener("push", (event) => {
  let charge = {};
  try {
    charge = event.data ? event.data.json() : {};
  } catch {
    charge = { title: "ARENA", body: event.data ? event.data.text() : "" };
  }

  const titre = charge.title || "ARENA";
  const options = {
    body: charge.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    // Deux notifications de la même conversation se remplacent au lieu de
    // s'empiler : dix « nouveau message » dans le centre de notifications,
    // c'est ce qui fait désinstaller une app.
    tag: charge.tag || "arena",
    renotify: true,
    data: { lien: charge.link || "/" },
  };

  event.waitUntil(self.registration.showNotification(titre, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const lien = (event.notification.data && event.notification.data.lien) || "/";
  const cible = new URL(lien, self.location.origin).href;

  // On préfère RÉUTILISER un onglet déjà ouvert : ouvrir une deuxième
  // instance de l'app installée est désorientant, et on y perd l'état en
  // cours (un message à moitié écrit, par exemple).
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((fenetres) => {
        for (const fenetre of fenetres) {
          if (fenetre.url === cible && "focus" in fenetre) return fenetre.focus();
        }
        for (const fenetre of fenetres) {
          if ("navigate" in fenetre && "focus" in fenetre) {
            return fenetre.navigate(cible).then((f) => (f ? f.focus() : null));
          }
        }
        return self.clients.openWindow(cible);
      }),
  );
});
