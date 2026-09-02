-- Vesti — commissions de parrainage, ligne par ligne
--
-- Le problème que ça règle : la table `subscriptions` dit qui paie MAINTENANT.
-- Quand quelqu'un résilie, la ligne est mise à jour et l'information d'avant
-- disparaît. Impossible de dire « ce filleul a payé quatre mois puis est
-- parti », donc impossible de calculer une commission honnête.
--
-- 💰 Une ligne par encaissement réel, avec le montant que Stripe a
-- effectivement collecté. Jamais un prix affiché multiplié à la main : un prix
-- catalogue ignore les remises, les mois partiels, les impayés et les
-- remboursements. Pour payer quelqu'un au centime, la seule source acceptable
-- est la facture.

create table public.referral_earnings (
  id              uuid primary key default gen_random_uuid(),

  -- Qui touche la commission, et pour qui.
  referrer_id     uuid not null references public.profiles (id) on delete cascade,
  referred_id     uuid not null references public.profiles (id) on delete cascade,

  -- Identifiant Stripe de l'événement d'argent : facture encaissée, ou
  -- remboursement. UNIQUE, parce que Stripe rejoue ses webhooks — sans cette
  -- contrainte, une livraison répétée paierait deux fois la même commission.
  stripe_id       text not null unique,
  kind            text not null check (kind in ('invoice', 'refund')),

  -- Montants en CENTIMES, en entiers. Un flottant sur de l'argent finit par
  -- produire des centimes fantômes à la sommation ; ici tout est exact.
  -- Négatifs pour un remboursement.
  gross_cents     integer not null,
  commission_cents integer not null,

  -- Le taux est figé sur la ligne, pas lu dans une constante. Le jour où il
  -- passe de 30 % à 25 %, les commissions déjà dues doivent rester calculées
  -- au taux promis à l'époque.
  rate            numeric(5,4) not null check (rate >= 0 and rate <= 1),

  currency        text not null default 'eur',
  occurred_at     timestamptz not null,
  created_at      timestamptz not null default now()
);

create index referral_earnings_referrer_idx
  on public.referral_earnings (referrer_id, occurred_at desc);

alter table public.referral_earnings enable row level security;

-- On voit ce qu'on a gagné, et rien d'autre : ni les lignes des autres, ni
-- l'identité de ses filleuls au-delà de ce que l'application choisit d'exposer.
create policy referral_earnings_select_own on public.referral_earnings
  for select to authenticated
  using (auth.uid() = referrer_id);

-- Écriture réservée au serveur : ces lignes sont de l'argent dû.
revoke insert, update, delete on public.referral_earnings from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Taux en vigueur, en un seul endroit
-- ---------------------------------------------------------------------------
create or replace function public.referral_commission_rate()
returns numeric language sql immutable set search_path = '' as $$ select 0.30 $$;

-- ---------------------------------------------------------------------------
-- Ce qu'un parrain a gagné
--
-- Trois nombres différents, et les confondre serait une faute :
--  - `total` : tout ce qui a été gagné depuis le début, remboursements déduits ;
--  - `pending` : ce qui n'a pas encore été versé ;
--  - `paid_out` : ce qui a déjà été versé.
--
-- La colonne de versement n'existe pas encore — les paiements se feront à la
-- main au début. `paid_out` reste donc à zéro, mais la forme est posée pour ne
-- pas avoir à réécrire l'affichage le jour où elle arrivera.
-- ---------------------------------------------------------------------------
create or replace function public.referral_earnings_summary()
returns table (
  total_cents      bigint,
  referred_paying  integer,
  invoices         integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(e.commission_cents), 0)::bigint,
    count(distinct e.referred_id) filter (where e.kind = 'invoice')::integer,
    count(*) filter (where e.kind = 'invoice')::integer
  from public.referral_earnings e
  where e.referrer_id = auth.uid();
$$;

revoke execute on function public.referral_earnings_summary() from public, anon;
grant execute on function public.referral_earnings_summary() to authenticated;
