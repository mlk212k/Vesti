-- Vesti — un bénéfice garanti, quoi que fasse l'abonné
--
-- ⚠️ Le problème que ça ferme définitivement. Mesuré, pas estimé : une analyse
-- Styliste avec recherches produits coûte 0,397 $ — dont 0,363 $ pour les
-- seules recherches, chaque recherche web ramenant des dizaines de milliers de
-- tokens de page dans le contexte.
--
-- Sur 17,99 €, une fois retirés la commission d'influenceur (5,40 €), Stripe
-- (0,52 €) et les cotisations (~3,96 €), il reste 8,11 € pour payer l'IA. À
-- 0,397 $ l'analyse, le point de bascule tombe à 22 analyses — pour un plafond
-- fixé à 60. Un abonné actif pouvait coûter 14 € par mois.
--
-- 🔑 Les plafonds d'analyses ne suffisent pas, et c'est le cœur du problème :
-- ils comptent des ACTES, pas des EUROS. Deux analyses peuvent coûter dix fois
-- l'une l'autre selon qu'elles déclenchent des recherches. Compter les actes
-- pour contrôler une dépense, c'est compter les tickets de caisse pour
-- contrôler un budget.
--
-- D'où un plafond exprimé dans la seule unité qui compte : l'argent dépensé.
-- Au-delà, les fonctions coûteuses s'effacent — le verdict, lui, passe
-- toujours. Un abonné qui atteint son budget garde l'essentiel du produit et
-- perd les liens d'achat, pas l'inverse.

-- ---------------------------------------------------------------------------
-- Le registre des dépenses IA
--
-- Séparé de `analyses.cost_micros` (qui reste, pour le coût d'UNE analyse) :
-- toutes les dépenses ne sont pas rattachées à une analyse — la recherche de
-- l'onglet Acheter et la suggestion du jour n'en ont pas. Sans registre commun,
-- ces dépenses-là resteraient invisibles, ce qui est exactement l'erreur qu'on
-- vient de payer.
-- ---------------------------------------------------------------------------
create table public.ai_spend (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('verdict', 'product_search', 'dressing', 'daily')),
  micros     integer not null check (micros >= 0),
  created_at timestamptz not null default now()
);

create index ai_spend_user_idx on public.ai_spend (user_id, created_at desc);

-- 🔒 Deux verrous, et le second n'est pas redondant.
--
-- RLS activé sans policy ferme déjà la table. Mais Supabase accorde par défaut
-- les droits d'écriture aux rôles `anon` et `authenticated` sur toute nouvelle
-- table du schéma public : sans révocation explicite, la sécurité de ce
-- registre reposerait ENTIÈREMENT sur le fait que RLS reste activé.
--
-- Or ce registre décide de couper des fonctions payantes. Un client capable
-- d'effacer ses lignes se refait un budget neuf quand il veut. On révoque donc
-- aussi les droits, pour que deux erreurs distinctes soient nécessaires plutôt
-- qu'une seule. Un test le vérifie.
alter table public.ai_spend enable row level security;
revoke all on public.ai_spend from anon, authenticated;

-- Même raisonnement, appliqué rétroactivement à la table des réservations de
-- quota (0017) : elle décide de ce qu'on a le droit de consommer.
revoke all on public.analysis_reservations from anon, authenticated;

comment on table public.ai_spend is
  'Dépense IA réelle par utilisateur, en micro-dollars. Sert à garantir la marge, pas à facturer.';

-- ---------------------------------------------------------------------------
-- Le budget mensuel par plan, en micro-dollars
--
-- 💰 L'arithmétique, au pire cas — client amené par un influenceur, TVA non
-- applicable, cotisations d'auto-entrepreneur à 22 % :
--
--   PRO       8,99 € − 2,70 (commission) − 0,39 (Stripe) − 1,98 (cotisations)
--             = 3,92 € disponibles.  Budget 1,80 $ ≈ 1,67 € → il reste 2,25 €.
--
--   STYLISTE 17,99 € − 5,40 − 0,52 − 3,96 = 8,11 € disponibles.
--             Budget 5,00 $ ≈ 4,65 € → il reste 3,46 €.
--
--   FREE      aucun revenu. 0,20 $ couvre les 3 analyses offertes (~0,10 $) et
--             borne le coût d'acquisition d'un inscrit qui ne convertit pas.
--
-- Ces montants sont des PLANCHERS de bénéfice : sans influenceur, il reste
-- 2,70 € de plus sur un Pro et 5,40 € sur un Styliste.
--
-- ⚠️ À revoir si les prix, le taux de commission ou les cotisations changent.
-- Le lien est écrit ici pour qu'on ne l'oublie pas.
-- ---------------------------------------------------------------------------
create or replace function public.ai_budget_micros(p_plan text)
returns integer language sql immutable set search_path = '' as $$
  select case p_plan
    when 'free'     then   200000  -- 0,20 $
    when 'pro'      then  1800000  -- 1,80 $
    when 'styliste' then  5000000  -- 5,00 $
    else 0
  end;
$$;

-- ---------------------------------------------------------------------------
-- Ce qui reste à dépenser pour cet utilisateur, sur sa période en cours
--
-- Rend un nombre négatif si le budget est dépassé : l'appelant n'a qu'à
-- comparer à zéro.
-- ---------------------------------------------------------------------------
create or replace function public.ai_budget_remaining(p_user uuid)
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan  text;
  v_start timestamptz;
  v_spent bigint;
begin
  select public.effective_plan(p.plan, p.gift_plan, p.gift_plan_until), p.period_start
    into v_plan, v_start
  from public.profiles p
  where p.id = p_user;

  if not found then
    return 0;
  end if;

  -- Renouvellement mensuel glissant, appliqué virtuellement comme ailleurs :
  -- une lecture ne doit pas écrire.
  if v_start + interval '1 month' <= now() then
    v_start := now();
  end if;

  select coalesce(sum(s.micros), 0) into v_spent
  from public.ai_spend s
  where s.user_id = p_user and s.created_at >= v_start;

  return public.ai_budget_micros(v_plan)::bigint - v_spent;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enregistrer une dépense
-- ---------------------------------------------------------------------------
create or replace function public.record_ai_spend(p_user uuid, p_kind text, p_micros integer)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ai_spend (user_id, kind, micros)
  select p_user, p_kind, p_micros
  where p_micros > 0;
$$;

-- Appelées par le serveur avec la clé de service, qui ignore ces droits.
revoke execute on function public.ai_budget_micros(text)              from public, anon, authenticated;
revoke execute on function public.record_ai_spend(uuid, text, integer) from public, anon, authenticated;
-- ⚠️ `ai_budget_remaining` prend l'utilisateur EN PARAMÈTRE. Exposée au
-- navigateur, elle laisserait lire le budget de n'importe qui — il suffirait
-- de passer un autre identifiant. Elle reste donc serveur uniquement.
--
-- Le jour où l'app voudra afficher son budget à l'abonné, la bonne forme sera
-- une fonction SANS paramètre qui lit `auth.uid()` elle-même. Ce n'est pas
-- qu'un détail de confort : c'est ce qui rend l'usurpation impossible plutôt
-- que simplement interdite.
revoke execute on function public.ai_budget_remaining(uuid) from public, anon, authenticated;
