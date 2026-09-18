"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatShort } from "@/lib/format";

export type ChatMessage = {
  id: string;
  body: string;
  created_at: string;
  author_id: string | null;
  author_name: string;
};

export function ChatPanel({
  initial,
  currentUserId,
  currentUserName,
  nameById,
}: {
  initial: ChatMessage[];
  currentUserId: string;
  currentUserName: string;
  nameById: Record<string, string>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Subscribe to inserts and deletes.
  useEffect(() => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as {
            id: string;
            body: string;
            created_at: string;
            author_id: string | null;
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [
              ...prev,
              {
                id: row.id,
                body: row.body,
                created_at: row.created_at,
                author_id: row.author_id,
                author_name:
                  (row.author_id && nameById[row.author_id]) || "Membre",
              },
            ];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) => {
          const old = payload.old as { id: string };
          setMessages((prev) => prev.filter((m) => m.id !== old.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, nameById]);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setError(null);

    const { error: insertError } = await supabase
      .from("messages")
      .insert({ author_id: currentUserId, body: trimmed });

    setPending(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setBody("");
  }

  async function handleDelete(id: string) {
    setError(null);
    const { error: delError } = await supabase
      .from("messages")
      .delete()
      .eq("id", id);
    if (delError) setError(delError.message);
  }

  return (
    <div className="clay flex flex-col overflow-hidden">
      <div
        ref={listRef}
        className="h-[60vh] space-y-3 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && (
          <p className="pt-24 text-center text-sm text-muted">
            Aucun message. Lance la conversation !
          </p>
        )}
        {messages.map((m) => {
          const mine = m.author_id === currentUserId;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 ${mine ? "clay-accent" : "clay"}`}
              >
                <div className="flex items-baseline gap-2 text-xs opacity-70">
                  <span className="font-medium">
                    {mine ? currentUserName : m.author_name}
                  </span>
                  <span>{formatShort(m.created_at)}</span>
                </div>
                <div className="whitespace-pre-wrap text-sm">{m.body}</div>
                {mine && (
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    className="mt-1 text-[10px] opacity-70 hover:opacity-100 hover:underline"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="border-t border-border bg-accent/8 px-4 py-2 text-xs text-accent-strong">
          {error}
        </p>
      )}

      <form
        onSubmit={handleSend}
        className="flex gap-2 border-t border-border bg-surface-2 p-3"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          placeholder="Écris un message…"
          className="clay-creux flex-1 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/60"
        />
        <button
          type="submit"
          disabled={pending || body.trim().length === 0}
          className="clay-accent clay-presse px-5 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
