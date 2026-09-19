"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Alerte } from "@/components/alerte";
import { IconSend } from "@/components/icons";
import { Avatar } from "@/components/ui";
import type { ActionResult } from "@/lib/errors";
import { formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types";
import { sendMessageAction } from "../actions";

type Affichage = Message & { author_name: string };

// Le fil de discussion.
//
// Les messages arrivent par le canal temps réel de Supabase, qui applique la
// même RLS que le reste : on ne reçoit que les conversations dont on est
// membre. L'envoi passe par une server action — pas d'insertion depuis le
// navigateur, pour que la validation (longueur, appartenance) reste au même
// endroit que partout ailleurs.
export function ChatPanel({
  conversationId,
  initialMessages,
  currentUserId,
  noms,
}: {
  conversationId: string;
  initialMessages: Affichage[];
  currentUserId: string;
  noms: Record<string, string>;
}) {
  const [messages, setMessages] = useState<Affichage[]>(initialMessages);
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    sendMessageAction,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new as Message;
          setMessages((current) =>
            // Le message qu'on vient d'envoyer revient aussi par ce canal :
            // on évite le doublon plutôt que de le masquer.
            current.some((m) => m.id === message.id)
              ? current
              : [
                  ...current,
                  {
                    ...message,
                    author_name: message.author_id
                      ? (noms[message.author_id] ?? "Membre")
                      : "Membre retiré",
                  },
                ],
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, noms]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="flex-1 space-y-3 pb-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-faint">
            Aucun message. Lance la conversation.
          </p>
        ) : null}

        {messages.map((message) => {
          const moi = message.author_id === currentUserId;
          return (
            <div
              key={message.id}
              className={`flex items-end gap-2 ${moi ? "flex-row-reverse" : ""}`}
            >
              {!moi ? <Avatar nom={message.author_name} taille="sm" /> : null}
              <div className={`max-w-[78%] ${moi ? "text-right" : ""}`}>
                {!moi ? (
                  <p className="mb-1 text-[11px] text-faint">
                    {message.author_name}
                  </p>
                ) : null}
                <div
                  className={
                    moi
                      ? "rounded-2xl rounded-br-sm bg-gradient-to-br from-[#7c3aed] to-[#c026a5] px-3.5 py-2.5 text-sm text-white"
                      : "panneau rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm"
                  }
                >
                  <p className="texte-libre whitespace-pre-wrap">{message.body}</p>
                </div>
                <p className="mt-1 text-[10px] text-faint">
                  {formatTime(message.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={finRef} />
      </div>

      <form
        ref={formRef}
        action={action}
        className="safe-bottom sticky bottom-20 z-10 flex gap-2 bg-[rgba(7,7,10,0.9)] py-3 backdrop-blur-xl lg:bottom-0"
      >
        <input type="hidden" name="conversation_id" value={conversationId} />
        <input
          name="body"
          required
          maxLength={4000}
          className="champ flex-1"
          placeholder="Ton message…"
          autoComplete="off"
          aria-label="Message"
        />
        <button
          type="submit"
          className="btn btn-primaire w-12 shrink-0 px-0"
          aria-label="Envoyer"
        >
          <IconSend className="h-5 w-5" />
        </button>
      </form>

      {state && !state.ok ? <Alerte>{state.error}</Alerte> : null}
    </div>
  );
}
