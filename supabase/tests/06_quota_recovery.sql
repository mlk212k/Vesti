-- Vesti — un crédit ne se perd plus quand le serveur meurt en vol
--
-- Ces tests rejouent exactement l'incident observé en production : deux
-- comptes avec un crédit décompté pour une analyse jamais rendue.
do $$
declare
  v_user uuid := gen_random_uuid();
  v_res  uuid;
  r      record;
  v_ok   boolean;
begin
  insert into auth.users (id, email) values (v_user, 'quota-recovery@test.local');
  perform set_config('request.jwt.claim.sub', v_user::text, true);

  -- Plan gratuit : 3 analyses, la marge d'erreur la plus étroite.
  --
  -- ⚠️ Période démarrée il y a dix jours, et ce n'est pas un détail. Avec une
  -- période commençant maintenant, une réservation vieillie artificiellement
  -- tomberait AVANT le début de période et serait écartée pour cette raison —
  -- le test passerait sans jamais éprouver l'expiration, qui est pourtant tout
  -- son objet. Vérifié en retirant l'expiration : le test doit rougir.
  update public.profiles
     set plan = 'free', period_start = now() - interval '10 days'
   where id = v_user;

  -- ---------------------------------------------------------------------
  -- Départ : rien consommé.
  -- ---------------------------------------------------------------------
  select * into r from public.get_quota_status();
  if r.used_count <> 0 or r.remaining <> 3 then
    raise exception 'FAIL  départ : % utilisées, % restantes', r.used_count, r.remaining;
  end if;
  raise notice 'PASS  départ : 3 analyses disponibles';

  -- ---------------------------------------------------------------------
  -- Une analyse en cours compte : sans ça, des requêtes simultanées
  -- passeraient toutes dans l'intervalle entre le lancement et le résultat.
  -- ---------------------------------------------------------------------
  select * into r from public.consume_analysis_quota('outfit');
  v_res := r.reservation_id;

  if not r.allowed or r.used_count <> 1 or v_res is null then
    raise exception 'FAIL  réservation refusée ou sans identifiant';
  end if;

  select * into r from public.get_quota_status();
  if r.used_count <> 1 then
    raise exception 'FAIL  une analyse en cours devrait compter (vu : %)', r.used_count;
  end if;
  raise notice 'PASS  une analyse en cours occupe bien un crédit';

  -- ---------------------------------------------------------------------
  -- ⚠️ LE CAS DE L'INCIDENT : le serveur est tué avant de rendre le crédit.
  -- Aucun appel de libération n'a lieu — on ne simule rien d'autre que le
  -- passage du temps.
  -- ---------------------------------------------------------------------
  update public.analysis_reservations
     set created_at = now() - interval '10 minutes'
   where id = v_res;

  select * into r from public.get_quota_status();
  if r.used_count <> 0 or r.remaining <> 3 then
    raise exception 'FAIL  crédit perdu après une requête tuée en vol (% utilisées)', r.used_count;
  end if;
  raise notice 'PASS  une requête tuée en vol ne coûte plus de crédit';

  -- ---------------------------------------------------------------------
  -- Une analyse RENDUE, elle, compte pour de bon — et pour toujours.
  -- ---------------------------------------------------------------------
  insert into public.analyses (user_id, kind, image_paths, verdict, score)
  values (v_user, 'outfit', array['x/1.jpg'], '{"verdict":"ok"}'::jsonb, 70);

  select * into r from public.get_quota_status();
  if r.used_count <> 1 or r.remaining <> 2 then
    raise exception 'FAIL  analyse rendue mal comptée (% utilisées)', r.used_count;
  end if;
  raise notice 'PASS  une analyse rendue compte, et ne s efface pas avec le temps';

  -- ---------------------------------------------------------------------
  -- Pas de double comptage : la réservation libérée après un succès ne doit
  -- pas s'ajouter à la ligne qu'elle a produite.
  -- ---------------------------------------------------------------------
  select * into r from public.consume_analysis_quota('outfit');
  v_res := r.reservation_id;

  insert into public.analyses (user_id, kind, image_paths, verdict, score)
  values (v_user, 'outfit', array['x/2.jpg'], '{"verdict":"ok"}'::jsonb, 80);

  perform public.release_analysis_quota(v_res);

  select * into r from public.get_quota_status();
  if r.used_count <> 2 then
    raise exception 'FAIL  analyse comptée deux fois (% utilisées)', r.used_count;
  end if;
  raise notice 'PASS  une analyse réussie n est comptée qu une fois';

  -- ---------------------------------------------------------------------
  -- Le plafond tient toujours : c'est ce que tout le reste protège.
  -- ---------------------------------------------------------------------
  select * into r from public.consume_analysis_quota('outfit');
  if not r.allowed then
    raise exception 'FAIL  la 3e analyse aurait dû passer';
  end if;

  select * into r from public.consume_analysis_quota('outfit');
  if r.allowed or r.reason <> 'quota_exceeded' then
    raise exception 'FAIL  la 4e analyse a été autorisée (raison : %)', r.reason;
  end if;
  raise notice 'PASS  le plafond de 3 tient toujours';

  -- ---------------------------------------------------------------------
  -- Sécurité : on ne libère pas la réservation d'un autre.
  -- ---------------------------------------------------------------------
  declare
    v_autre uuid := gen_random_uuid();
    v_vol   uuid;
    v_avant integer;
  begin
    insert into auth.users (id, email) values (v_autre, 'quota-voleur@test.local');
    perform set_config('request.jwt.claim.sub', v_autre::text, true);
    update public.profiles set plan = 'free', period_start = now() where id = v_autre;

    select * into r from public.consume_analysis_quota('outfit');
    v_vol := r.reservation_id;

    -- L'autre utilisateur tente de libérer la réservation du premier.
    select count(*) into v_avant from public.analysis_reservations where user_id = v_user;
    perform public.release_analysis_quota(
      (select id from public.analysis_reservations where user_id = v_user limit 1)
    );

    select count(*) = v_avant into v_ok
      from public.analysis_reservations where user_id = v_user;

    if not v_ok then
      raise exception 'FAIL  un utilisateur a libéré la réservation d un autre';
    end if;
    raise notice 'PASS  la réservation d un autre est hors de portée';
  end;

  raise notice 'TOUS LES TESTS DE QUOTA SONT PASSÉS';
end $$;
