-- Vesti — la commission de 30 % n'est due qu'aux partenaires
--
-- ⚠️ Le défaut corrigé : le registre créditait 30 % à N'IMPORTE QUEL parrain.
--
-- `recordReferralEarning` écrivait une commission dès qu'un filleul avait un
-- parrain, sans distinguer un influenceur avec qui un accord existe d'un client
-- qui a simplement partagé son code à un ami. Or les 30 % sont une contrepartie
-- négociée avec des partenaires ; le programme de parrainage grand public, lui,
-- récompense en Style — des mois offerts, qui ne coûtent pas de trésorerie.
--
-- Tant qu'aucun client ne paie, la différence est invisible. Au premier abonné
-- elle devient une dette : des lignes comptables donnant raison à des gens à
-- qui rien n'a jamais été promis. Un registre d'argent dû ne se corrige pas
-- après coup sans casser la confiance — donc on le règle avant.

-- ---------------------------------------------------------------------------
-- Qui est partenaire
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column is_partner boolean not null default false;

comment on column public.profiles.is_partner is
  'Partenaire rémunéré à la commission (influenceur). Faux par défaut : la commission se mérite par un accord, pas par un parrainage.';

-- 🔒 Aucun GRANT. Cette colonne décide de qui touche de l'argent : elle se pose
-- côté serveur, jamais depuis le navigateur. Le test de permissions vérifie
-- qu'elle reste hors de portée du client.

create index profiles_partner_idx on public.profiles (is_partner) where is_partner;

-- ---------------------------------------------------------------------------
-- À qui revient la commission pour un client Stripe donné
--
-- Cette fonction porte la règle, plutôt que de la laisser dans le TypeScript
-- du webhook. Deux raisons :
--   • elle devient vérifiable par un test SQL, sans simuler Stripe ;
--   • la règle vit à côté des données qu'elle protège, donc un second appelant
--     ne peut pas l'oublier.
--
-- Renvoie zéro ligne quand il n'y a rien à payer — client inconnu, pas de
-- parrain, ou parrain non partenaire. C'est le cas NORMAL, pas une erreur :
-- l'immense majorité des clients n'a pas de parrain.
-- ---------------------------------------------------------------------------
create or replace function public.commission_recipient(p_customer text)
returns table (referred_id uuid, referrer_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select filleul.id, parrain.id
  from public.profiles filleul
  join public.profiles parrain on parrain.id = filleul.referred_by
  where filleul.stripe_customer_id = p_customer
    and parrain.is_partner;
$$;

-- Appelée par le webhook Stripe avec la clé de service, qui ignore ces droits.
-- Personne d'autre n'a à savoir qui est partenaire.
revoke execute on function public.commission_recipient(text)
  from public, anon, authenticated;
