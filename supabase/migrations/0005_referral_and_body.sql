-- Vesti — parrainage influenceurs + gabarit
--
-- Objectif : savoir quel influenceur a amené quel client, de façon fiable
-- (codes réels uniquement, attribution non modifiable après coup).

-- ---------------------------------------------------------------------------
-- Codes de parrainage. Un code = un influenceur / une campagne.
-- ---------------------------------------------------------------------------
create table public.referral_codes (
  code            text primary key,
  influencer_name text not null,
  -- Réseau et notes : utiles pour trier les campagnes plus tard.
  channel         text,
  notes           text,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Les codes sont saisis à la main par des humains : on normalise en majuscules
-- sans espaces pour que "lea 10", "Lea10" et "LEA10" désignent le même code.
create or replace function public.normalize_referral_code(p_code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^a-zA-Z0-9]', '', 'g'));
$$;

alter table public.referral_codes
  add constraint referral_codes_normalized
  check (code = public.normalize_referral_code(code));

-- ---------------------------------------------------------------------------
-- Attribution + gabarit sur le profil
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column referral_code text references public.referral_codes (code),
  add column referred_at   timestamptz,

  -- Facultatif. Sert uniquement à affiner les proportions conseillées ; le
  -- prompt interdit explicitement tout commentaire sur le corps.
  add column weight_kg integer check (weight_kg between 30 and 300);

create index profiles_referral_idx on public.profiles (referral_code);

comment on column public.profiles.weight_kg is
  'Facultatif. Utilisé pour ajuster les conseils de coupe, jamais restitué ni commenté à l''utilisateur.';

-- ---------------------------------------------------------------------------
-- Enregistrement du code
--
-- SECURITY DEFINER parce que `referral_code` n'est pas dans les colonnes que le
-- client peut écrire (cf. 0002_rls.sql) : sans ça, n'importe qui pourrait se
-- réattribuer au code de son choix, ou changer d'influenceur après coup et
-- fausser les statistiques de campagne.
-- ---------------------------------------------------------------------------
create or replace function public.redeem_referral_code(p_code text)
returns table (accepted boolean, reason text, influencer_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_code      text := public.normalize_referral_code(p_code);
  v_existing  text;
  v_name      text;
begin
  if v_uid is null then
    return query select false, 'unauthenticated', null::text;
    return;
  end if;

  if v_code = '' then
    return query select false, 'empty_code', null::text;
    return;
  end if;

  select p.referral_code into v_existing
  from public.profiles p
  where p.id = v_uid
  for update;

  -- L'attribution est définitive : le premier influenceur crédité le reste.
  if v_existing is not null then
    return query select false, 'already_referred', null::text;
    return;
  end if;

  select rc.influencer_name into v_name
  from public.referral_codes rc
  where rc.code = v_code and rc.active;

  -- Un code inconnu n'est jamais enregistré : sinon les fautes de frappe et les
  -- codes inventés se retrouveraient dans les stats d'attribution.
  if v_name is null then
    return query select false, 'unknown_code', null::text;
    return;
  end if;

  update public.profiles p
     set referral_code = v_code,
         referred_at   = now()
   where p.id = v_uid;

  return query select true, null::text, v_name;
end;
$$;

/** Vérifie un code sans l'enregistrer : sert au retour visuel pendant la saisie. */
create or replace function public.check_referral_code(p_code text)
returns table (valid boolean, influencer_name text)
language sql
security definer
set search_path = public
as $$
  select true, rc.influencer_name
  from public.referral_codes rc
  where rc.code = public.normalize_referral_code(p_code)
    and rc.active
  union all
  select false, null::text
  where not exists (
    select 1 from public.referral_codes rc2
    where rc2.code = public.normalize_referral_code(p_code) and rc2.active
  );
$$;

-- ---------------------------------------------------------------------------
-- Tableau de bord d'attribution (lecture service_role / admin uniquement)
-- ---------------------------------------------------------------------------
create view public.referral_stats as
select
  rc.code,
  rc.influencer_name,
  rc.channel,
  rc.active,
  count(p.id)                                          as signups,
  count(p.id) filter (where p.plan <> 'free')          as paying_customers,
  count(p.id) filter (where p.referred_at > now() - interval '30 days') as signups_30d,
  max(p.referred_at)                                   as last_signup_at
from public.referral_codes rc
left join public.profiles p on p.referral_code = rc.code
group by rc.code, rc.influencer_name, rc.channel, rc.active;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
alter table public.referral_codes enable row level security;
-- Aucune policy : la table des codes n'est jamais lisible par le client, qui
-- pourrait sinon récupérer la liste complète des campagnes.
revoke all on public.referral_codes from anon, authenticated;

-- La vue hérite des droits de son propriétaire : on la ferme explicitement.
revoke all on public.referral_stats from anon, authenticated;

revoke execute on function public.redeem_referral_code(text) from public, anon;
revoke execute on function public.check_referral_code(text)  from public, anon;
grant execute on function public.redeem_referral_code(text) to authenticated;
grant execute on function public.check_referral_code(text)  to authenticated;

-- Le client peut renseigner son poids lui-même (colonne d'onboarding).
grant update (weight_kg) on public.profiles to authenticated;
