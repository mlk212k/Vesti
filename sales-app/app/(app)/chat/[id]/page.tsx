import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconBack } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Conversation, Message, Profile } from "@/lib/types";
import { markConversationReadAction } from "../actions";
import { ChatPanel } from "./chat-panel";

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

  const [messagesRes, membersRes, profilesRes] = await Promise.all([
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(200)
      .returns<Message[]>(),
    supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", id)
      .returns<{ user_id: string }[]>(),
    supabase
      .from("profiles")
      .select("id, full_name, role, phone, avatar_url, daily_goal_override, is_active, created_at")
      .returns<Profile[]>(),
  ]);

  const noms: Record<string, string> = {};
  for (const profile of profilesRes.data ?? []) {
    noms[profile.id] = profile.full_name;
  }

  const autres = (membersRes.data ?? [])
    .map((m) => m.user_id)
    .filter((memberId) => memberId !== user.id)
    .map((memberId) => noms[memberId] ?? "Membre");

  const titre =
    conversation.kind === "team"
      ? `# ${conversation.title ?? "Équipe"}`
      : autres.join(", ") || "Conversation";

  // On marque lu à l'ouverture. La pastille de non-lus disparaît dès le
  // retour sur la liste.
  await markConversationReadAction(id);

  const messages = (messagesRes.data ?? []).map((message) => ({
    ...message,
    author_name: message.author_id
      ? (noms[message.author_id] ?? "Membre")
      : "Membre retiré",
  }));

  return (
    <div className="montee">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/chat" className="text-faint hover:text-dim" aria-label="Retour">
          <IconBack className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="titre truncate text-xl">{titre}</h1>
          <p className="text-xs text-faint">
            {conversation.kind === "team"
              ? "Toute l'équipe"
              : "Conversation privée"}
          </p>
        </div>
      </div>

      <ChatPanel
        conversationId={id}
        initialMessages={messages}
        currentUserId={user.id}
        noms={noms}
      />
    </div>
  );
}
