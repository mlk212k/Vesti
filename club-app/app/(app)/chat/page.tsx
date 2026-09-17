import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChatPanel, type ChatMessage } from "./chat-panel";

export default async function ChatPage() {
  const me = await requireUser();
  const supabase = await createClient();

  const { data: rows = [] } = await supabase
    .from("messages")
    .select("id, body, created_at, author_id, profiles(full_name)")
    .order("created_at", { ascending: true })
    .limit(200);

  const initial: ChatMessage[] = (rows ?? []).map((r) => ({
    id: r.id,
    body: r.body,
    created_at: r.created_at,
    author_id: r.author_id,
    author_name:
      (r.profiles as unknown as { full_name: string } | null)?.full_name ??
      "Membre",
  }));

  const { data: profiles = [] } = await supabase
    .from("profiles")
    .select("id, full_name");
  const nameById = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p.full_name] as const),
  );

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Chat de l&apos;équipe</h1>
        <p className="text-sm text-muted">
          Messages visibles par tous les membres du club.
        </p>
      </header>

      <ChatPanel
        initial={initial}
        currentUserId={me.id}
        currentUserName={me.full_name}
        nameById={nameById}
      />
    </div>
  );
}
