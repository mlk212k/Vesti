"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Alerte } from "@/components/alerte";
import { IconSend } from "@/components/icons";
import { Avatar } from "@/components/ui";
import { appelerAction } from "@/lib/deploiement";
import type { ActionResult } from "@/lib/errors";
import { formatTime } from "@/lib/format";
import { jouer } from "@/lib/sfx";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types";
import { sendMessageAction, toggleReactionAction } from "../actions";

export type MembreFil = {
  id: string;
  nom: string;
  avatar: string | null;
  role: string;
};

type Affichage = Message & { auteur: MembreFil | null };

export type ReactionFil = {
  message_id: string;
  user_id: string;
  emoji: string;
};

// Les réactions proposées. Volontairement peu nombreuses : une palette
// complète transforme chaque réponse en choix, alors qu'on veut acquitter en
// un geste.
const PALETTE = ["🔥", "💪", "👍", "😂", "😮", "❤️"];

export function ChatPanel({
  conversationId,
  messagesInitiaux,
  reactionsInitiales,
  membres,
  moi,
}: {
  conversationId: string;
  messagesInitiaux: Affichage[];
  reactionsInitiales: ReactionFil[];
  membres: MembreFil[];
  moi: string;
}) {
  const [messages, setMessages] = useState<Affichage[]>(messagesInitiaux);
  const [reactions, setReactions] = useState<ReactionFil[]>(reactionsInitiales);
  const [ouvertSur, setOuvertSur] = useState<string | null>(null);
  const [enLigne, setEnLigne] = useState<string[]>([]);

  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    async (precedent: ActionResult | undefined, donnees: FormData) => {
      // `appelerAction` attrape le cas « l'app vient d'être redéployée » :
      // la page ouverte appelle alors une action qui n'existe plus côté
      // serveur, et sans lui on tombait sur un écran technique en anglais
      // au lieu d'envoyer le message.
      const resultat = await appelerAction<ActionResult>(
        () => sendMessageAction(precedent, donnees),
        (message) => ({ ok: false, error: message }),
      );
      jouer(resultat.ok ? "pop" : "erreur");
      return resultat;
    },
    undefined,
  );

  const formRef = useRef<HTMLFormElement>(null);
  const finRef = useRef<HTMLDivElement>(null);

  const annuaire = useMemo(() => {
    const table: Record<string, MembreFil> = {};
    for (const membre of membres) table[membre.id] = membre;
    return table;
  }, [membres]);

  // Temps réel : nouveaux messages, nouvelles réactions, et présence.
  //
  // La RLS s'applique aussi au flux temps réel : on ne reçoit que ce qui
  // concerne les conversations dont on est membre.
  useEffect(() => {
    const supabase = createClient();
    const canal = supabase.channel(`conversation:${conversationId}`, {
      config: { presence: { key: moi } },
    });

    canal
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
          setMessages((courant) => {
            // Le message qu'on vient d'envoyer revient aussi par ce canal :
            // on évite le doublon plutôt que de le masquer.
            if (courant.some((m) => m.id === message.id)) return courant;
            if (message.author_id !== moi) jouer("blip");
            return [
              ...courant,
              {
                ...message,
                auteur: message.author_id
                  ? (annuaire[message.author_id] ?? null)
                  : null,
              },
            ];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        (payload) => {
          const ligne = (payload.new ?? payload.old) as ReactionFil;
          setReactions((courant) => {
            const sans = courant.filter(
              (r) =>
                !(
                  r.message_id === ligne.message_id &&
                  r.user_id === ligne.user_id &&
                  r.emoji === ligne.emoji
                ),
            );
            return payload.eventType === "DELETE" ? sans : [...sans, ligne];
          });
        },
      )
      .on("presence", { event: "sync" }, () => {
        setEnLigne(Object.keys(canal.presenceState()));
      })
      .subscribe((statut) => {
        if (statut === "SUBSCRIBED") {
          void canal.track({ at: Date.now() });
        }
      });

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [conversationId, moi, annuaire]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  async function reagir(messageId: string, emoji: string) {
    setOuvertSur(null);
    // Optimiste : la réaction s'affiche tout de suite, le serveur confirme
    // ensuite par le canal temps réel.
    setReactions((courant) => {
      const deja = courant.some(
        (r) => r.message_id === messageId && r.user_id === moi && r.emoji === emoji,
      );
      return deja
        ? courant.filter(
            (r) =>
              !(r.message_id === messageId && r.user_id === moi && r.emoji === emoji),
          )
        : [...courant, { message_id: messageId, user_id: moi, emoji }];
    });
    jouer("tick");
    await appelerAction<ActionResult>(
      () => toggleReactionAction(messageId, emoji),
      (message) => ({ ok: false, error: message }),
    );
  }

  return (
    <div className="flex min-h-[62vh] flex-col">
      <div className="flex-1 space-y-1 pb-4">
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-faint">
            Aucun message
          </p>
        ) : null}

        {messages.map((message, index) => {
          const precedent = messages[index - 1];
          const moiMeme = message.author_id === moi;
          const nouveauJour =
            !precedent ||
            new Date(precedent.created_at).toDateString() !==
              new Date(message.created_at).toDateString();
          // Messages consécutifs du même auteur : on ne répète ni l'avatar
          // ni le nom, le fil respire.
          const suite =
            !nouveauJour &&
            precedent?.author_id === message.author_id &&
            new Date(message.created_at).getTime() -
              new Date(precedent.created_at).getTime() <
              5 * 60 * 1000;

          const reactionsMessage = reactions.filter(
            (r) => r.message_id === message.id,
          );
          const groupes = new Map<string, string[]>();
          for (const r of reactionsMessage) {
            groupes.set(r.emoji, [...(groupes.get(r.emoji) ?? []), r.user_id]);
          }

          return (
            <div key={message.id}>
              {nouveauJour ? (
                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-[var(--trait)]" />
                  <span className="text-sm text-faint">
                    {etiquetteJour(message.created_at)}
                  </span>
                  <span className="h-px flex-1 bg-[var(--trait)]" />
                </div>
              ) : null}

              <div
                className={`flex items-end gap-2 ${moiMeme ? "flex-row-reverse" : ""} ${
                  suite ? "mt-0.5" : "mt-3"
                }`}
              >
                <div className="w-8 shrink-0">
                  {!moiMeme && !suite ? (
                    <div className="relative">
                      <Avatar
                        nom={message.auteur?.nom ?? "?"}
                        url={message.auteur?.avatar}
                        taille="sm"
                      />
                      {message.author_id && enLigne.includes(message.author_id) ? (
                        <span
                          className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-nuit bg-accent"
                          title="En ligne"
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className={`max-w-[76%] ${moiMeme ? "items-end" : ""}`}>
                  {!moiMeme && !suite ? (
                    <p className="mb-1 text-sm text-faint">
                      {message.auteur?.nom ?? "Membre retiré"}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() =>
                      setOuvertSur(ouvertSur === message.id ? null : message.id)
                    }
                    className={`block w-full text-left ${
                      moiMeme
                        ? "rounded-[8px] rounded-br-[2px] bg-accent px-3.5 py-2.5 text-sm text-[var(--accent-encre)]"
                        : "rounded-[8px] rounded-bl-[2px] border border-trait bg-velours px-3.5 py-2.5 text-sm"
                    }`}
                  >
                    <span className="texte-libre whitespace-pre-wrap">
                      {message.body}
                    </span>
                  </button>

                  {groupes.size > 0 ? (
                    <div
                      className={`mt-1 flex flex-wrap gap-1 ${moiMeme ? "justify-end" : ""}`}
                    >
                      {[...groupes.entries()].map(([emoji, auteurs]) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => reagir(message.id, emoji)}
                          className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-sm ${
                            auteurs.includes(moi)
                              ? "border-accent bg-[rgba(203,255,60,0.14)]"
                              : "border-trait bg-velours"
                          }`}
                          title={auteurs
                            .map((id) => annuaire[id]?.nom ?? "?")
                            .join(", ")}
                        >
                          <span>{emoji}</span>
                          <span className="text-faint">
                            {auteurs.length}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {ouvertSur === message.id ? (
                    <div
                      className={`apparition mt-1.5 flex gap-1 ${moiMeme ? "justify-end" : ""}`}
                    >
                      {PALETTE.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => reagir(message.id, emoji)}
                          className="rounded-[6px] border border-trait bg-velours px-2 py-1 text-base transition-transform active:scale-90"
                          aria-label={`Réagir ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <p
                    className={`mt-1 text-sm text-faint ${moiMeme ? "text-right" : ""}`}
                  >
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={finRef} />
      </div>

      <form
        ref={formRef}
        action={action}
        className="safe-bottom sticky bottom-20 z-10 flex gap-2 border-t border-trait bg-[rgba(8,8,10,0.96)] py-3 backdrop-blur-md lg:bottom-0"
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

function etiquetteJour(valeur: string): string {
  const date = new Date(valeur);
  const aujourdhui = new Date();
  const hier = new Date();
  hier.setDate(hier.getDate() - 1);

  if (date.toDateString() === aujourdhui.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === hier.toDateString()) return "Hier";

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}
