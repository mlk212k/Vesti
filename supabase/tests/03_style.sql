\set ON_ERROR_STOP on
set search_path = public;

-- Trois comptes : un parrain, un filleul, un tricheur.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'parrain@test.fr'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'filleul@test.fr');

do $$
declare
  v_parrain uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  v_filleul uuid := 'bbbbbbbb-0000-4000-8000-000000000002';
  v_code text;
  r record;
  v_solde integer;
  v_plan text;
begin
  select own_code into v_code from profiles where id = v_parrain;
  if v_code is null or length(v_code) <> 6 then
    raise exception 'FAIL  le parrain n a pas de code personnel';
  end if;
  raise notice 'PASS  chaque profil reçoit un code de 6 caractères (%)', v_code;

  if v_code ~ '[O0I1L]' then
    raise exception 'FAIL  le code contient un caractère ambigu';
  end if;
  raise notice 'PASS  le code évite les caractères ambigus';

  -- Le filleul enregistre le code du parrain.
  perform set_config('request.jwt.claim.sub', v_filleul::text, true);
  select * into r from redeem_style_code(v_code);
  if not r.accepted then raise exception 'FAIL  code refusé : %', r.reason; end if;
  raise notice 'PASS  le filleul enregistre le code de son parrain';

  -- Deuxième tentative : refusée.
  select * into r from redeem_style_code(v_code);
  if r.accepted or r.reason <> 'already_referred' then
    raise exception 'FAIL  on peut changer de parrain après coup (%)', r.reason;
  end if;
  raise notice 'PASS  l attribution est définitive';

  -- Auto-parrainage.
  perform set_config('request.jwt.claim.sub', v_parrain::text, true);
  select * into r from redeem_style_code(v_code);
  if r.accepted or r.reason <> 'self_referral' then
    raise exception 'FAIL  auto-parrainage accepté (%)', r.reason;
  end if;
  raise notice 'PASS  on ne peut pas se parrainer soi-même';

  -- Aucun Style tant que le filleul n a rien fait.
  select style_balance into v_solde from profiles where id = v_parrain;
  if v_solde <> 0 then raise exception 'FAIL  Style versé avant usage réel'; end if;
  raise notice 'PASS  aucun Style à la simple inscription';

  -- Le filleul fait sa première analyse.
  -- Le versement est déclenché par le serveur, pas par le client : il reçoit
  -- le filleul en paramètre.
  perform award_referral_style(v_filleul);
  select style_balance into v_solde from profiles where id = v_parrain;
  if v_solde <> style_per_referral() then
    raise exception 'FAIL  solde attendu %, obtenu %', style_per_referral(), v_solde;
  end if;
  raise notice 'PASS  le parrain gagne % Style après la première analyse', v_solde;

  -- Rejouer ne double pas.
  perform award_referral_style(v_filleul);
  perform award_referral_style(v_filleul);
  select style_balance into v_solde from profiles where id = v_parrain;
  if v_solde <> style_per_referral() then
    raise exception 'FAIL  versement dupliqué : %', v_solde;
  end if;
  raise notice 'PASS  le versement n a lieu qu une fois, même rejoué';

  -- Échange en dessous du seuil.
  perform set_config('request.jwt.claim.sub', v_parrain::text, true);
  select * into r from redeem_style_gift();
  if r.accepted then raise exception 'FAIL  cadeau accordé sous le seuil'; end if;
  raise notice 'PASS  pas de cadeau en dessous de % Style', style_gift_threshold();

  -- On amène le solde au seuil.
  update profiles set style_balance = style_gift_threshold() where id = v_parrain;
  select * into r from redeem_style_gift();
  if not r.accepted then raise exception 'FAIL  cadeau refusé au seuil : %', r.reason; end if;
  raise notice 'PASS  100 Style donnent 6 mois (jusqu au %)', r.until::date;

  select style_balance into v_solde from profiles where id = v_parrain;
  if v_solde <> 0 then raise exception 'FAIL  les Style n ont pas été débités : %', v_solde; end if;
  raise notice 'PASS  les Style sont débités';

  -- Le plan effectif devient styliste sans toucher à Stripe.
  select effective_plan(plan, gift_plan, gift_plan_until) into v_plan
  from profiles where id = v_parrain;
  if v_plan <> 'styliste' then raise exception 'FAIL  plan effectif = %', v_plan; end if;
  if (select plan from profiles where id = v_parrain) <> 'free' then
    raise exception 'FAIL  la colonne plan a été écrasée (elle appartient à Stripe)';
  end if;
  raise notice 'PASS  plan effectif styliste, colonne Stripe intacte';

  -- Le quota suit le plan offert.
  select * into r from get_quota_status();
  if r.plan_code <> 'styliste' or r.limit_total <> plan_analysis_limit('styliste') then
    raise exception 'FAIL  quota non aligné : % / %', r.plan_code, r.limit_total;
  end if;
  raise notice 'PASS  le quota suit le plan offert (% analyses)', r.limit_total;

  -- Un cadeau expiré ne compte plus.
  update profiles set gift_plan_until = now() - interval '1 day' where id = v_parrain;
  select effective_plan(plan, gift_plan, gift_plan_until) into v_plan
  from profiles where id = v_parrain;
  if v_plan <> 'free' then raise exception 'FAIL  cadeau expiré encore actif : %', v_plan; end if;
  raise notice 'PASS  un cadeau expiré retombe sur le plan payé';

  -- Un abonnement payant meilleur que le cadeau gagne.
  update profiles set plan = 'styliste', gift_plan = 'pro',
         gift_plan_until = now() + interval '1 month' where id = v_parrain;
  select effective_plan(plan, gift_plan, gift_plan_until) into v_plan
  from profiles where id = v_parrain;
  if v_plan <> 'styliste' then raise exception 'FAIL  le cadeau a rétrogradé un client payant'; end if;
  raise notice 'PASS  un cadeau ne rétrograde jamais un abonnement payant';

  -- Le navigateur ne doit pas pouvoir se verser lui-même la récompense :
  -- sinon la condition « après une vraie analyse » ne protège plus rien.
  if has_function_privilege('authenticated', 'award_referral_style(uuid)', 'execute') then
    raise exception 'FAIL  le client peut déclencher le versement lui-même';
  end if;
  raise notice 'PASS  le versement est hors de portée du navigateur';

  raise notice 'TOUS LES TESTS STYLE SONT PASSÉS';
end $$;
