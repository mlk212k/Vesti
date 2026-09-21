import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, EnTete, Vide } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatRelative } from "@/lib/format";
import { listProfiles } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { openDirectConversationAction } from "./actions";

export const metadata: Metadata = { title: "Chat" };

type ConversationRow = {
  id: string;
  kind: "team" | "direct";
  title: string | null;
  last_message_at: string;
  unread: number;
  last_body: string | null;
  last_author: string | null;
  other_names: string | null;
};

export default async function ChatPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [conversationsRes, profiles, membresRes] = await Promise.all([
    supabase
      .from("v_my_conversations")
      .select("*")
      .order("last_message_at", { ascending: false })
      .returns<ConversationRow[]>(),
    listProfiles({ activeOnly: true }),
    // La RLS ne rend que les lignes des conversations dont on fait partie :
    // cette requête décrit donc exactement « avec qui j'ai déjà un fil ».
    supabase
      .from("conversation_members")
      .select("user_id")
      .returns<{ user_id: string }[]>(),
  ]);

  const conversations = conversationsRes.data ?? [];
  // Les collègues à qui on n'a pas encore écrit : proposés en bas pour
  // démarrer une conversation en un geste. On compare des identifiants, pas
  // des noms — deux homonymes dans l'équipe suffiraient à fausser la liste.
  const dejaEnLien = new Set((membresRes.data ?? []).map((m) => m.user_id));
  const autres = profiles.filter(
    (p) => p.id !== user.id && !dejaEnLien.has(p.id),
  );

  return (
    <div className="space-y-6">
      <EnTete surtitre="Messagerie interne" titre="Chat" />

      <ul className="space-y-2">
        {conversations.map((conversation) => {
          const nom =
            conversation.kind === "team"
              ? (conversation.title ?? "Équipe")
              : (conversation.other_names ?? "Conversation");

          return (
            <li key={conversation.id}>
              <Link
                href={`/chat/${conversation.id}`}
                className="panneau flex items-center gap-3 p-4 transition-transform active:scale-[0.99]"
              >
                <Avatar nom={nom} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-medium">
                      {conversation.kind === "team" ? `# ${nom}` : nom}
                    </p>
                    <span className="shrink-0 text-sm text-faint">
                      {formatRelative(conversation.last_message_at)}
                    </span>
                  </div>
                  <p className="truncate text-sm text-faint">
                    {conversation.last_body
                      ? `${conversation.last_author ? `${conversation.last_author.split(" ")[0]} : ` : ""}${conversation.last_body}`
                      : "Aucun message"}
                  </p>
                </div>
                {conversation.unread > 0 ? (
                  <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-sm bg-os px-1.5 text-sm text-white">
                    {conversation.unread}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      {autres.length > 0 ? (
        <section className="space-y-3">
          <h2 className="surtitre">Démarrer une conversation</h2>
          <ul className="space-y-2">
            {autres.map((profile) => (
              <li key={profile.id}>
                <form action={openDirectConversationAction}>
                  <input type="hidden" name="member_id" value={profile.id} />
                  <button
                    type="submit"
                    className="panneau-plat flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:border-[var(--trait-fort)]"
                  >
                    <Avatar nom={profile.full_name} taille="sm" />
                    <span className="flex-1 truncate text-sm">
                      {profile.full_name}
                    </span>
                    <span className="text-sm text-faint">Écrire</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {conversations.length === 0 && autres.length === 0 ? (
        <Vide titre="Personne à qui parler pour l'instant" />
      ) : null}
    </div>
  );
}
