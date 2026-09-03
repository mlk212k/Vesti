-- Vesti — le budget IA garantit un bénéfice, quoi que fasse l'abonné
--
-- Ces tests protègent une promesse commerciale, pas un détail technique :
-- aucun abonné ne doit pouvoir coûter plus qu'il ne rapporte.
do $$
declare
  v_user uuid := gen_random_uuid();
  v_reste bigint;
begin
  insert into auth.users (id, email) values (v_user, 'budget@test.local');
  update public.profiles
     set plan = 'styliste', period_start = now()
   where id = v_user;

  -- ---------------------------------------------------------------------
  -- Départ : l'enveloppe complète.
  -- ---------------------------------------------------------------------
  select public.ai_budget_remaining(v_user) into v_reste;
  if v_reste <> 5000000 then
    raise exception 'FAIL  budget Styliste attendu 5 000 000, vu %', v_reste;
  end if;
  raise notice 'PASS  un Styliste démarre avec 5,00 $ d enveloppe';

  -- ---------------------------------------------------------------------
  -- Une analyse ordinaire entame à peine le budget : le garde-fou ne doit
  -- pas gêner l'usage normal, sinon il coupe des clients qui paient.
  -- ---------------------------------------------------------------------
  perform public.record_ai_spend(v_user, 'verdict', 34000);
  select public.ai_budget_remaining(v_user) into v_reste;

  if v_reste <> 4966000 then
    raise exception 'FAIL  dépense mal décomptée (reste %)', v_reste;
  end if;
  raise notice 'PASS  un verdict à 0,034 $ laisse l essentiel de l enveloppe';

  -- ---------------------------------------------------------------------
  -- ⚠️ LE SCÉNARIO QUI FAISAIT PERDRE DE L'ARGENT : un abonné qui enchaîne
  -- les analyses AVEC recherche produits. Une telle analyse coûte 0,155 $
  -- (0,034 de verdict + 0,121 de recherche) ; à ce rythme, il passait sous
  -- zéro bien avant son plafond de 60 analyses.
  --
  -- 📏 Ce que la boucle mesure au passage : l'enveloppe tient environ 32
  -- analyses avec liens. Au-delà, les verdicts continuent — seuls les liens
  -- s'arrêtent. C'est la capacité réelle du forfait, écrite noir sur blanc.
  -- ---------------------------------------------------------------------
  for i in 1..33 loop
    perform public.record_ai_spend(v_user, 'product_search', 121000);
    perform public.record_ai_spend(v_user, 'verdict', 34000);
  end loop;

  select public.ai_budget_remaining(v_user) into v_reste;
  if v_reste > 0 then
    raise exception 'FAIL  33 analyses avec liens n ont pas épuisé le budget (reste %)', v_reste;
  end if;
  raise notice 'PASS  l enveloppe s épuise avant que l abonné ne coûte trop cher';

  -- ---------------------------------------------------------------------
  -- La garantie, énoncée en euros : ce qu'on peut dépenser reste sous ce
  -- que le plan rapporte, même au pire cas (influenceur + cotisations).
  --
  -- Styliste 17,99 € − 5,40 (commission) − 0,52 (Stripe) − 3,96 (cotisations)
  --          = 8,11 € disponibles. Budget 5,00 $ ≈ 4,65 €.
  -- ---------------------------------------------------------------------
  if public.ai_budget_micros('styliste') > 8100000 then
    raise exception 'FAIL  le budget Styliste dépasse ce que le plan laisse disponible';
  end if;
  if public.ai_budget_micros('pro') > 3900000 then
    raise exception 'FAIL  le budget Pro dépasse ce que le plan laisse disponible';
  end if;
  raise notice 'PASS  chaque budget reste sous ce que son plan rapporte, pire cas compris';

  -- ---------------------------------------------------------------------
  -- Le gratuit est borné lui aussi : c'est le coût d'acquisition d'un
  -- inscrit qui ne convertira jamais.
  -- ---------------------------------------------------------------------
  if public.ai_budget_micros('free') > 200000 then
    raise exception 'FAIL  le plan gratuit peut coûter plus de 0,20 $';
  end if;
  raise notice 'PASS  un inscrit gratuit ne peut pas coûter plus de 0,20 $';

  -- ---------------------------------------------------------------------
  -- Le renouvellement mensuel remet l'enveloppe à neuf.
  --
  -- ⚠️ Les dépenses sont vieillies explicitement. Dans une même transaction
  -- `now()` ne bouge pas : sans ça, elles porteraient l'horodatage exact du
  -- nouveau départ de période et compteraient encore. C'est un artefact de
  -- test — en production les requêtes sont séparées dans le temps — mais un
  -- test qui échoue pour une raison qui n'existe pas ailleurs ne prouve rien.
  -- ---------------------------------------------------------------------
  update public.ai_spend
     set created_at = now() - interval '40 days'
   where user_id = v_user;
  update public.profiles set period_start = now() - interval '32 days' where id = v_user;

  select public.ai_budget_remaining(v_user) into v_reste;

  if v_reste <> 5000000 then
    raise exception 'FAIL  le budget ne repart pas au mois suivant (reste %)', v_reste;
  end if;
  raise notice 'PASS  l enveloppe repart entière au renouvellement';

  raise notice 'TOUS LES TESTS DE BUDGET SONT PASSÉS';
end $$;

-- --------------------------------------------------------------------------
-- Le registre décide de couper des fonctions payées : le client ne doit ni
-- l'écrire ni l'effacer.
-- --------------------------------------------------------------------------
do $$
begin
  if has_table_privilege('authenticated', 'public.ai_spend', 'INSERT')
     or has_table_privilege('authenticated', 'public.ai_spend', 'UPDATE')
     or has_table_privilege('authenticated', 'public.ai_spend', 'DELETE') then
    raise exception 'FAIL  un client peut modifier le registre des dépenses';
  end if;
  raise notice 'PASS  le registre des dépenses est hors de portée du client';

  -- Même garantie sur les réservations de quota : elles décident de ce qu'un
  -- client a le droit de consommer.
  if has_table_privilege('authenticated', 'public.analysis_reservations', 'DELETE') then
    raise exception 'FAIL  un client peut effacer ses réservations de quota';
  end if;
  raise notice 'PASS  les réservations de quota sont hors de portée du client';
end $$;
