-- Vesti — la commission de 30 % ne va qu'aux partenaires
--
-- Ce test protège de l'argent : il vérifie qu'un parrainage entre clients
-- ordinaires ne désigne AUCUN destinataire de commission, alors qu'il en
-- désignait un avant 0018.
do $$
declare
  v_influ    uuid := gen_random_uuid();
  v_client   uuid := gen_random_uuid();
  v_filleulA uuid := gen_random_uuid();
  v_filleulB uuid := gen_random_uuid();
  v_orphelin uuid := gen_random_uuid();
  v_n        integer;
  v_qui      uuid;
begin
  insert into auth.users (id, email) values
    (v_influ,    'influenceuse@test.local'),
    (v_client,   'cliente-ordinaire@test.local'),
    (v_filleulA, 'filleul-influ@test.local'),
    (v_filleulB, 'filleul-client@test.local'),
    (v_orphelin, 'sans-parrain@test.local');

  -- Une influenceuse (partenaire) et une cliente ordinaire, toutes deux avec
  -- un filleul qui paie.
  update public.profiles set is_partner = true  where id = v_influ;
  update public.profiles set is_partner = false where id = v_client;

  update public.profiles
     set referred_by = v_influ, stripe_customer_id = 'cus_filleul_influ'
   where id = v_filleulA;

  update public.profiles
     set referred_by = v_client, stripe_customer_id = 'cus_filleul_client'
   where id = v_filleulB;

  update public.profiles
     set stripe_customer_id = 'cus_sans_parrain'
   where id = v_orphelin;

  -- ---------------------------------------------------------------------
  -- Le filleul d'une partenaire désigne bien sa marraine.
  -- ---------------------------------------------------------------------
  select referrer_id into v_qui
    from public.commission_recipient('cus_filleul_influ');

  if v_qui is distinct from v_influ then
    raise exception 'FAIL  la commission ne revient pas à la partenaire (vu : %)', v_qui;
  end if;
  raise notice 'PASS  le filleul d une partenaire lui rapporte bien une commission';

  -- ---------------------------------------------------------------------
  -- ⚠️ LE CŒUR DU TEST : le filleul d'un client ordinaire ne désigne
  -- personne. Avant 0018, cette ligne rendait le parrain et créait une dette.
  -- ---------------------------------------------------------------------
  select count(*) into v_n
    from public.commission_recipient('cus_filleul_client');

  if v_n <> 0 then
    raise exception 'FAIL  un parrainage entre clients a créé un droit à commission';
  end if;
  raise notice 'PASS  un parrainage entre clients ne donne droit à aucune commission';

  -- ---------------------------------------------------------------------
  -- Un client sans parrain : le cas de l'immense majorité des factures.
  -- ---------------------------------------------------------------------
  select count(*) into v_n
    from public.commission_recipient('cus_sans_parrain');

  if v_n <> 0 then
    raise exception 'FAIL  un client sans parrain a désigné un bénéficiaire';
  end if;
  raise notice 'PASS  un client sans parrain ne doit rien à personne';

  -- ---------------------------------------------------------------------
  -- Un client Stripe inconnu ne fait pas échouer le webhook.
  -- ---------------------------------------------------------------------
  select count(*) into v_n
    from public.commission_recipient('cus_inexistant');

  if v_n <> 0 then
    raise exception 'FAIL  un client inconnu a désigné un bénéficiaire';
  end if;
  raise notice 'PASS  un client Stripe inconnu ne casse rien';

  -- ---------------------------------------------------------------------
  -- Retirer le statut de partenaire coupe la commission pour la suite.
  -- ---------------------------------------------------------------------
  update public.profiles set is_partner = false where id = v_influ;

  select count(*) into v_n
    from public.commission_recipient('cus_filleul_influ');

  if v_n <> 0 then
    raise exception 'FAIL  une ex-partenaire touche encore une commission';
  end if;
  raise notice 'PASS  retirer le statut de partenaire arrête la commission';

  raise notice 'TOUS LES TESTS DE COMMISSION SONT PASSÉS';
end $$;

-- --------------------------------------------------------------------------
-- Le client ne doit jamais pouvoir se déclarer partenaire lui-même : ce serait
-- s'attribuer 30 % du chiffre de ses filleuls.
-- --------------------------------------------------------------------------
do $$
declare
  v_ok boolean := false;
begin
  if has_column_privilege('authenticated', 'public.profiles', 'is_partner', 'UPDATE') then
    raise exception 'FAIL  un client peut se déclarer partenaire';
  end if;
  v_ok := true;
  raise notice 'PASS  le statut de partenaire est hors de portée du client';
end $$;
