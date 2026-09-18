"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { VAPID_PUBLIC_KEY } from "@/lib/push/config";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "checking" | "unsupported" | "off" | "on" | "denied";

function isSupported() {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function NotificationOptIn() {
  const [status, setStatus] = useState<Status>(() =>
    isSupported() ? "checking" : "unsupported",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "checking") return;
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (sub) setStatus("on");
      else if (Notification.permission === "denied") setStatus("denied");
      else setStatus("off");
    });
  }, [status]);

  async function enable() {
    setError(null);
    setPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const json = sub.toJSON();
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("save_push_subscription", {
        p_endpoint: json.endpoint,
        p_p256dh: json.keys?.p256dh,
        p_auth: json.keys?.auth,
      });
      if (rpcError) throw new Error(rpcError.message);
      setStatus("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setPending(false);
    }
  }

  if (status === "checking") return null;

  return (
    <div className="clay p-4">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
        Notifications
      </h2>
      {status === "unsupported" && (
        <p className="text-sm text-muted">
          Non disponible sur ce navigateur. Sur iPhone&nbsp;: ajoute
          d&apos;abord l&apos;app à l&apos;écran d&apos;accueil (Partager →
          « Sur l&apos;écran d&apos;accueil »), puis relance-la depuis son
          icône et reviens sur cette page.
        </p>
      )}
      {status === "denied" && (
        <p className="text-sm text-muted">
          Notifications bloquées pour cette app dans les réglages du
          téléphone/navigateur. Autorise-les puis reviens ici.
        </p>
      )}
      {status === "off" && (
        <>
          <p className="mb-3 text-sm text-muted">
            Reçois une notification dès que tu es convoqué à un match, et
            un rappel le jour de chaque entraînement.
          </p>
          <button
            type="button"
            onClick={enable}
            disabled={pending}
            className="clay-accent clay-presse px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {pending ? "Activation…" : "Activer les notifications"}
          </button>
        </>
      )}
      {status === "on" && (
        <p className="text-sm text-accent-strong">Notifications activées ✓</p>
      )}
      {error && <p className="mt-2 text-xs text-accent-strong">{error}</p>}
    </div>
  );
}
