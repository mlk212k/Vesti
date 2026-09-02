-- Vesti — parrainage : vocabulaire neutre et cloisonnement de l'attribution
--
-- Côté client, rien ne doit laisser deviner que les codes servent au suivi des
-- partenariats. Deux conséquences :
--   1. le vocabulaire interne devient neutre ("partenaire" et non "influenceur"),
--      pour qu'aucun écran futur ne réutilise le mot par inadvertance ;
--   2. la validation d'un code ne renvoie plus le nom associé — sinon il suffit
--      de tester des codes pour cartographier tous les partenariats.

alter table public.referral_codes
  rename column influencer_name to partner_name;

-- La vue référence l'ancien nom de colonne : on la reconstruit.
drop view if exists public.referral_stats;

create view public.referral_stats as
select
  rc.code,
  rc.partner_name,
  rc.channel,
  rc.active,
  count(p.id)                                          as signups,
  count(p.id) filter (where p.plan <> 'free')          as paying_customers,
  count(p.id) filter (where p.referred_at > now() - interval '30 days') as signups_30d,
  max(p.referred_at)                                   as last_signup_at
from public.referral_codes rc
left join public.profiles p on p.referral_code = rc.code
group by rc.code, rc.partner_name, rc.channel, rc.active;

revoke all on public.referral_stats from anon, authenticated;

-- Validation d'un code : réponse strictement binaire, sans nom de partenaire.
--
-- DROP obligatoire avant recréation : la fonction perd sa colonne de retour
-- `influencer_name`, et Postgres refuse un CREATE OR REPLACE qui modifie le
-- type de retour d'une fonction existante.
drop function if exists public.redeem_referral_code(text);

create function public.redeem_referral_code(p_code text)
returns table (accepted boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_code     text := public.normalize_referral_code(p_code);
  v_existing text;
  v_found    boolean;
begin
  if v_uid is null then
    return query select false, 'unauthenticated';
    return;
  end if;

  if v_code = '' then
    return query select false, 'empty_code';
    return;
  end if;

  select p.referral_code into v_existing
  from public.profiles p
  where p.id = v_uid
  for update;

  -- L'attribution est définitive : le premier partenaire crédité le reste.
  if v_existing is not null then
    return query select false, 'already_referred';
    return;
  end if;

  select exists (
    select 1 from public.referral_codes rc
    where rc.code = v_code and rc.active
  ) into v_found;

  -- Un code inconnu n'est jamais enregistré : sinon les fautes de frappe et les
  -- codes inventés se retrouveraient dans les statistiques d'attribution.
  if not v_found then
    return query select false, 'unknown_code';
    return;
  end if;

  update public.profiles p
     set referral_code = v_code,
         referred_at   = now()
   where p.id = v_uid;

  return query select true, null::text;
end;
$$;

-- Cette fonction exposait le nom du partenaire à qui savait deviner un code.
drop function if exists public.check_referral_code(text);

revoke execute on function public.redeem_referral_code(text) from public, anon;
grant execute on function public.redeem_referral_code(text) to authenticated;
