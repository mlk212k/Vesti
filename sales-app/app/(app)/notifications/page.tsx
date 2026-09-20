import type { Metadata } from "next";
import Link from "next/link";
import { EnTete, Vide } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatRelative } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/types";
import { MarkAllRead } from "./mark-all-read";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await requireUser();
  const supabase = await createClient();

  // La policy `notifications_select_own` fait le filtre : pas de `.eq` sur
  // l'utilisateur ici, il serait redondant.
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Notification[]>();

  const notifications = data ?? [];
  const nonLues = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="montee space-y-5">
      <EnTete
        surtitre={nonLues > 0 ? `${nonLues} non lue(s)` : "À jour"}
        titre="Notifications"
      >
        {nonLues > 0 ? <MarkAllRead /> : null}
      </EnTete>

      {notifications.length === 0 ? (
        <Vide titre="Rien pour l'instant">
          Les ventes, les journées et les messages de l&apos;équipe
          apparaîtront ici.
        </Vide>
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => {
            const contenu = (
              <div
                className={`panneau p-4 ${
                  notification.read_at ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">{notification.title}</p>
                  <span className="shrink-0 text-sm text-faint">
                    {formatRelative(notification.created_at)}
                  </span>
                </div>
                {notification.body ? (
                  <p className="mt-1 text-sm text-dim">{notification.body}</p>
                ) : null}
              </div>
            );

            return (
              <li key={notification.id}>
                {notification.link ? (
                  <Link href={notification.link}>{contenu}</Link>
                ) : (
                  contenu
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
