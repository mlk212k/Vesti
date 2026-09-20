"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { jouer } from "@/lib/sfx";
import {
  hasSubscriptionAction,
  removeSubscriptionAction,
  saveSubscriptionAction,
} from "@/app/(app)/profil/push-actions";

/**
 * L'interrupteur des notifications push.
 *
 * Trois choses que cet écran doit dire honnêtement, parce qu'elles
 * surprennent tout le monde :
 *
 *   1. L'abonnement vaut pour CET APPAREIL. Autoriser sur le téléphone
 *      n'autorise pas sur l'ordinateur. Le bouton lit donc l'état réel de
 *      l'appareil en cours, pas un réglage de compte.
 *   2. Sur iPhone, ça ne marche QUE si l'app a été ajoutée à l'écran
 *      d'accueil. Dans Safari, l'API n'existe même pas — on le dit au lieu
 *      d'afficher un bouton qui ne ferait rien.
 *   3. Un refus est définitif côté navigateur : on ne peut pas redemander,
 *      il faut passer par les réglages du téléphone. Le texte le précise.
 */

const CLE_PUBLIQUE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// La clé VAPID voyage en base64url ; `applicationServerKey` veut des
// octets. On alloue explicitement un `ArrayBuffer` : le type par défaut de
// `Uint8Array` couvre aussi `SharedArrayBuffer`, que l'API refuse.
function versOctets(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const comble = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const brut = atob(comble);
  const tampon = new ArrayBuffer(brut.length);
  const octets = new Uint8Array(tampon);
  for (let i = 0; i < brut.length; i += 1) octets[i] = brut.charCodeAt(i);
  return octets;
}

function cleEnBase64(cle: ArrayBuffer | null): string {
  if (!cle) return "";
  const octets = new Uint8Array(cle);
  let binaire = "";
  for (const octet of octets) binaire += String.fromCharCode(octet);
  return btoa(binaire).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type Etat = "chargement" | "indisponible" | "refuse" | "inactif" | "actif";

export function BoutonNotifications() {
  const [etat, setEtat] = useState<Etat>("chargement");
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const monte = useRef(true);

  useEffect(() => {
    monte.current = true;
    return () => {
      monte.current = false;
    };
  }, []);

  // Lecture de l'état RÉEL au chargement : ce que le navigateur autorise, et
  // ce que la base connaît déjà de cet appareil.
  useEffect(() => {
    let annule = false;

    async function lire() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window) ||
        !CLE_PUBLIQUE
      ) {
        if (!annule) setEtat("indisponible");
        return;
      }

      if (Notification.permission === "denied") {
        if (!annule) setEtat("refuse");
        return;
      }

      try {
        const enregistrement = await navigator.serviceWorker.ready;
        const abonnement = await enregistrement.pushManager.getSubscription();
        if (annule) return;
        if (!abonnement) {
          setEtat("inactif");
          return;
        }
        // Le navigateur peut avoir gardé un abonnement que la base ne connaît
        // plus (base réinitialisée, ligne supprimée). On croit la base.
        const connu = await hasSubscriptionAction(abonnement.endpoint);
        if (!annule) setEtat(connu ? "actif" : "inactif");
      } catch {
        if (!annule) setEtat("indisponible");
      }
    }

    void lire();
    return () => {
      annule = true;
    };
  }, []);

  const activer = useCallback(async () => {
    setOccupe(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setEtat(permission === "denied" ? "refuse" : "inactif");
        jouer("erreur");
        return;
      }

      const enregistrement = await navigator.serviceWorker.ready;
      const abonnement =
        (await enregistrement.pushManager.getSubscription()) ??
        (await enregistrement.pushManager.subscribe({
          // Obligatoire sur Chrome : un abonnement silencieux, qui reçoit
          // des données sans jamais rien afficher, est refusé.
          userVisibleOnly: true,
          applicationServerKey: versOctets(CLE_PUBLIQUE),
        }));

      const resultat = await saveSubscriptionAction({
        endpoint: abonnement.endpoint,
        p256dh: cleEnBase64(abonnement.getKey("p256dh")),
        auth: cleEnBase64(abonnement.getKey("auth")),
        user_agent: navigator.userAgent.slice(0, 400),
      });

      if (!resultat.ok) {
        setMessage(resultat.error);
        jouer("erreur");
        return;
      }

      setEtat("actif");
      jouer("tampon");
    } catch {
      setMessage("Impossible d'activer les notifications sur cet appareil.");
      jouer("erreur");
    } finally {
      if (monte.current) setOccupe(false);
    }
  }, []);

  const desactiver = useCallback(async () => {
    setOccupe(true);
    setMessage(null);
    try {
      const enregistrement = await navigator.serviceWorker.ready;
      const abonnement = await enregistrement.pushManager.getSubscription();
      if (abonnement) {
        // On retire la ligne AVANT de désabonner le navigateur : si l'ordre
        // était inverse et que la suppression échouait, on garderait en base
        // un abonnement mort auquel on enverrait des messages pour rien.
        await removeSubscriptionAction(abonnement.endpoint);
        await abonnement.unsubscribe();
      }
      setEtat("inactif");
      jouer("pop");
    } catch {
      setMessage("La désactivation n'a pas abouti.");
      jouer("erreur");
    } finally {
      if (monte.current) setOccupe(false);
    }
  }, []);

  const explication: Record<Etat, string> = {
    chargement: "…",
    indisponible:
      "Sur iPhone, ajoute d'abord l'app à ton écran d'accueil : les notifications ne marchent pas depuis le navigateur.",
    refuse:
      "Tu as refusé les notifications sur cet appareil. Il faut les réautoriser dans les réglages du téléphone.",
    inactif:
      "Reçois les relances et les messages même quand l'app est fermée. Réglage propre à cet appareil.",
    actif: "Activées sur cet appareil.",
  };

  return (
    <div className="panneau p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="titre text-xl">Notifications</p>
          <p className="mt-1 text-sm text-faint">{explication[etat]}</p>
        </div>

        {etat === "actif" ? (
          <button
            type="button"
            onClick={desactiver}
            disabled={occupe}
            className="btn btn-fantome shrink-0"
          >
            Couper
          </button>
        ) : etat === "inactif" ? (
          <button
            type="button"
            onClick={activer}
            disabled={occupe}
            className="btn btn-primaire shrink-0"
          >
            {occupe ? "…" : "Activer"}
          </button>
        ) : null}
      </div>

      {message ? <p className="mt-3 text-sm text-peche">{message}</p> : null}
    </div>
  );
}
