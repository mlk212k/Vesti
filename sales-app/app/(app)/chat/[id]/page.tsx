import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconBack } from "@/components/icons";
import { Avatar } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { urlAvatar } from "@/lib/avatar";
import { listConversationMembers, listReactions } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL, type Conversation, type Message } from "@/lib/types";
import { markConversationReadAction } from "../actions";
import { ChatPanel, type MembreFil } from "./chat-panel";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  // Si on n'est pas membre de la conversation, la policy ne rend rien : 404.
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle<Conversation>();

  if (!conversation) notFound();

  const [messagesRes, membresBruts] = await Promise.all([
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(300)
      .returns<Message[]>(),
    listConversationMembers(id),
  ]);

  const messagesBruts = messagesRes.data ?? [];
  const reactions = await listReactions(messagesBruts.map((m) => m.id));

  const membres: MembreFil[] = membresBruts.map((m) => ({
    id: m.user_id,
    nom: m.profil?.full_name ?? "Membre",
    avatar: urlAvatar(m.profil?.avatar_url),
    role: m.profil ? ROLE_LABEL[m.profil.role] : "",
  }));

  const annuaire = new Map(membres.map((m) => [m.id, m]));
  const messages = messagesBruts.map((message) => ({
    ...message,
    auteur: message.author_id ? (annuaire.get(message.author_id) ?? null) : null,
  }));

  const autres = membres.filter((m) => m.id !== user.id);
  const titre =
    conversation.kind === "team"
      ? (conversation.title ?? "Équipe")
      : (autres.map((m) => m.nom).join(", ") || "Conversation");

  // On marque lu à l'ouverture : la pastille de non-lus disparaît dès le
  // retour sur la liste.
  await markConversationReadAction(id);

  return (
    <div className="montee">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/chat" className="text-faint hover:text-dim" aria-label="Retour">
          <IconBack className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="titre truncate text-2xl">
            {conversation.kind === "team" ? `# ${titre}` : titre}
          </h1>
          <p className="text-sm text-faint">
            {membres.length} membre{membres.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Qui est dans la conversation. Replié par défaut : l'information est
          utile une fois, pas à chaque message. */}
      <details className="panneau mb-4 overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
          <span className="surtitre">Les participants</span>
          <div className="flex -space-x-2">
            {membres.slice(0, 6).map((membre) => (
              <Avatar
                key={membre.id}
                nom={membre.nom}
                url={membre.avatar}
                taille="sm"
              />
            ))}
          </div>
        </summary>
        <ul className="border-t border-trait">
          {membres.map((membre) => (
            <li
              key={membre.id}
              className="flex items-center gap-3 border-b border-trait px-4 py-2.5 last:border-b-0"
            >
              <Avatar nom={membre.nom} url={membre.avatar} taille="sm" />
              <span className="flex-1 truncate text-sm">
                {membre.nom}
                {membre.id === user.id ? (
                  <span className="text-faint"> (toi)</span>
                ) : null}
              </span>
              <span className="pastille">{membre.role}</span>
            </li>
          ))}
        </ul>
      </details>

      <ChatPanel
        conversationId={id}
        messagesInitiaux={messages}
        reactionsInitiales={reactions}
        membres={membres}
        moi={user.id}
      />
    </div>
  );
}
