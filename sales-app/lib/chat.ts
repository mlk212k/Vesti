import { z } from "zod";

/**
 * Identifiant de la conversation d'équipe.
 *
 * Il est fixé en dur dans la migration 0001 parce qu'il doit être connu
 * d'avance : le trigger `handle_new_profile` y inscrit chaque nouveau membre
 * à la création de son compte, sans avoir à chercher « la » conversation
 * générale.
 *
 * Ce n'est PAS un UUID conforme à la RFC 9562 : ses chiffres de version et de
 * variante valent zéro. Postgres s'en moque — le type `uuid` n'accepte que
 * la forme, pas la sémantique — mais `z.uuid()` de Zod 4, lui, vérifie la
 * version et la variante, et rejetait donc cet identifiant. Résultat : les
 * messages privés partaient (vrais UUID v4 tirés par `gen_random_uuid()`) et
 * ceux de l'équipe échouaient sur une erreur d'UUID invalide.
 *
 * D'où `z.guid()` ci-dessous, qui ne valide que la forme — c'est exactement
 * la garantie dont on a besoin ici, puisque la seule chose à empêcher est
 * qu'une chaîne quelconque arrive jusqu'à la requête SQL.
 */
export const CONVERSATION_EQUIPE = "00000000-0000-0000-0000-000000000001";

export const conversationIdSchema = z.guid();
