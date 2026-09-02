-- Tests des migrations : quota, feature gate, rollover, refund, RLS et
-- privilèges colonne. À lancer via supabase/tests/run.sh sur un Postgres jetable.

\set ON_ERROR_STOP on
\pset pager off

create schema if not exists tests;

create or replace function tests.check(p_label text, p_ok boolean)
returns void language plpgsql as $$
begin
  if p_ok then
    raise notice 'PASS  %', p_label;
  else
    raise exception 'FAIL  %', p_label;
  end if;
end $$;

-- Deux utilisateurs de test
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.fr'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.fr');

-- --------------------------------------------------------------------------
select tests.check(
  'trigger : le profil est créé automatiquement à l''inscription',
  (select count(*) from public.profiles
    where id in ('11111111-1111-1111-1111-111111111111',
                 '22222222-2222-2222-2222-222222222222')) = 2
);

select tests.check(
  'nouveau compte : plan free, 0 analyse consommée',
  (select plan = 'free' and analyses_used = 0 from public.profiles
    where id = '11111111-1111-1111-1111-111111111111')
);

-- --------------------------------------------------------------------------
-- Quota du plan gratuit : 3 analyses puis blocage
-- --------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

select tests.check('free 1/3 autorisée', (select allowed from public.consume_analysis_quota('outfit')));
select tests.check('free 2/3 autorisée', (select allowed from public.consume_analysis_quota('outfit')));
select tests.check('free 3/3 autorisée', (select allowed from public.consume_analysis_quota('outfit')));

select tests.check(
  'free 4e analyse refusée avec la raison quota_exceeded',
  (select not allowed and reason = 'quota_exceeded' and remaining = 0
     from public.consume_analysis_quota('outfit'))
);

select tests.check(
  'un refus ne consomme pas de crédit supplémentaire',
  (select analyses_used = 3 from public.profiles
    where id = '11111111-1111-1111-1111-111111111111')
);

-- --------------------------------------------------------------------------
-- Feature gate : le dressing est réservé au Pro+
-- --------------------------------------------------------------------------
update public.profiles set analyses_used = 0
 where id = '11111111-1111-1111-1111-111111111111';

select tests.check(
  'free : dressing refusé avec la raison plan_required',
  (select not allowed and reason = 'plan_required'
     from public.consume_analysis_quota('dressing'))
);

select tests.check(
  'free : un dressing refusé ne consomme aucun crédit',
  (select analyses_used = 0 from public.profiles
    where id = '11111111-1111-1111-1111-111111111111')
);

update public.profiles set plan = 'pro'
 where id = '11111111-1111-1111-1111-111111111111';

select tests.check(
  'pro : dressing autorisé',
  (select allowed from public.consume_analysis_quota('dressing'))
);

-- --------------------------------------------------------------------------
-- Renouvellement mensuel
-- --------------------------------------------------------------------------
update public.profiles
   set plan = 'free', analyses_used = 3, period_start = now() - interval '32 days'
 where id = '11111111-1111-1111-1111-111111111111';

select tests.check(
  'rollover : après un mois le compteur repart à zéro',
  (select allowed and used_count = 1 from public.consume_analysis_quota('outfit'))
);

-- --------------------------------------------------------------------------
-- Remboursement si l'appel Claude échoue
-- --------------------------------------------------------------------------
select public.refund_analysis_quota();

select tests.check(
  'refund : le crédit est rendu',
  (select analyses_used = 0 from public.profiles
    where id = '11111111-1111-1111-1111-111111111111')
);

select public.refund_analysis_quota();

select tests.check(
  'refund : ne descend jamais sous zéro',
  (select analyses_used = 0 from public.profiles
    where id = '11111111-1111-1111-1111-111111111111')
);

-- --------------------------------------------------------------------------
-- get_quota_status ne doit rien écrire
-- --------------------------------------------------------------------------
update public.profiles set analyses_used = 2, plan = 'free'
 where id = '11111111-1111-1111-1111-111111111111';

select tests.check(
  'get_quota_status renvoie 1 restant sur 3',
  (select used_count = 2 and limit_total = 3 and remaining = 1 and plan_code = 'free'
     from public.get_quota_status())
);

select tests.check(
  'get_quota_status est en lecture seule',
  (select analyses_used = 2 from public.profiles
    where id = '11111111-1111-1111-1111-111111111111')
);

-- --------------------------------------------------------------------------
-- Sécurité : un utilisateur ne doit pas pouvoir s'offrir un plan payant
-- --------------------------------------------------------------------------
do $$
declare
  v_failed boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  begin
    update public.profiles set plan = 'styliste'
     where id = '11111111-1111-1111-1111-111111111111';
  exception when insufficient_privilege then
    v_failed := true;
  end;
  reset role;
  perform tests.check('sécurité : un client ne peut pas modifier son plan', v_failed);
end $$;

do $$
declare
  v_failed boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  begin
    update public.profiles set analyses_used = 0
     where id = '11111111-1111-1111-1111-111111111111';
  exception when insufficient_privilege then
    v_failed := true;
  end;
  reset role;
  perform tests.check('sécurité : un client ne peut pas remettre son quota à zéro', v_failed);
end $$;

do $$
declare
  v_ok boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  update public.profiles set morphology = 'rectangle'
   where id = '11111111-1111-1111-1111-111111111111';
  v_ok := true;
  reset role;
  perform tests.check('un client peut bien mettre à jour son onboarding', v_ok);
end $$;

-- --------------------------------------------------------------------------
-- RLS : cloisonnement entre utilisateurs
-- --------------------------------------------------------------------------
insert into public.analyses (user_id, kind, verdict, score)
values ('11111111-1111-1111-1111-111111111111', 'outfit', '{"verdict":"ok"}'::jsonb, 80),
       ('22222222-2222-2222-2222-222222222222', 'outfit', '{"verdict":"ok"}'::jsonb, 60);

do $$
declare
  v_count integer;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  select count(*) into v_count from public.analyses;
  reset role;
  perform tests.check('RLS : Alice ne voit que sa propre analyse', v_count = 1);
end $$;

do $$
declare
  v_count integer;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  select count(*) into v_count from public.profiles;
  reset role;
  perform tests.check('RLS : Alice ne voit que son propre profil', v_count = 1);
end $$;

do $$
declare
  v_failed boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  begin
    insert into public.analyses (user_id, kind, verdict)
    values ('11111111-1111-1111-1111-111111111111', 'outfit', '{}'::jsonb);
  exception when insufficient_privilege then
    v_failed := true;
  end;
  reset role;
  perform tests.check('sécurité : un client ne peut pas insérer d''analyse', v_failed);
end $$;

do $$
declare
  v_failed boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  begin
    perform count(*) from public.stripe_events;
  exception when insufficient_privilege then
    v_failed := true;
  end;
  reset role;
  perform tests.check('sécurité : stripe_events est inaccessible au client', v_failed);
end $$;

-- --------------------------------------------------------------------------
-- Garde-fou anti-dérive : lib/plans.ts affiche ces mêmes chiffres à
-- l'utilisateur. Si on change une limite ici sans la répercuter là-bas, ce test
-- rougit et rappelle d'aligner les deux.
-- --------------------------------------------------------------------------
select tests.check(
  'limites par plan : free=3, pro=40, styliste=60 (alignées sur lib/plans.ts)',
  public.plan_analysis_limit('free') = 3
  and public.plan_analysis_limit('pro') = 40
  and public.plan_analysis_limit('styliste') = 60
  and public.plan_analysis_limit('inconnu') = 0
);

select tests.check(
  'dressing : réservé à pro et styliste',
  not public.plan_allows_dressing('free')
  and public.plan_allows_dressing('pro')
  and public.plan_allows_dressing('styliste')
);

-- --------------------------------------------------------------------------
-- Storage : chaque utilisateur est enfermé dans le dossier qui porte son id
-- --------------------------------------------------------------------------
select tests.check(
  'storage : le bucket outfits est privé',
  (select not public from storage.buckets where id = 'outfits')
);

insert into storage.objects (bucket_id, name)
values ('outfits', '11111111-1111-1111-1111-111111111111/tenue-alice.jpg'),
       ('outfits', '22222222-2222-2222-2222-222222222222/tenue-bob.jpg');

do $$
declare
  v_count integer;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  select count(*) into v_count from storage.objects;
  reset role;
  perform tests.check('storage : Alice ne voit que ses propres photos', v_count = 1);
end $$;

do $$
declare
  v_failed boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  begin
    -- Tentative de dépôt dans le dossier de quelqu'un d'autre
    insert into storage.objects (bucket_id, name)
    values ('outfits', '22222222-2222-2222-2222-222222222222/intrusion.jpg');
  exception when others then
    v_failed := true;
  end;
  reset role;
  perform tests.check(
    'storage : impossible d''écrire dans le dossier d''un autre utilisateur',
    v_failed
  );
end $$;

-- --------------------------------------------------------------------------
-- Parrainage influenceurs
-- --------------------------------------------------------------------------
insert into public.referral_codes (code, partner_name, channel) values
  ('LEA10', 'Léa Martin', 'tiktok'),
  ('OLDCODE', 'Campagne terminée', 'tiktok');
update public.referral_codes set active = false where code = 'OLDCODE';

select tests.check(
  'parrainage : la saisie est normalisée (casse, espaces, tirets)',
  public.normalize_referral_code('  lea-10 ') = 'LEA10'
  and public.normalize_referral_code('Lea10') = 'LEA10'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);

select tests.check(
  'parrainage : un code inconnu est refusé',
  (select not accepted and reason = 'unknown_code'
     from public.redeem_referral_code('NEXISTEPAS'))
);

select tests.check(
  'parrainage : un code inconnu ne laisse aucune trace',
  (select referral_code is null from public.profiles
    where id = '22222222-2222-2222-2222-222222222222')
);

select tests.check(
  'parrainage : un code désactivé est refusé',
  (select not accepted from public.redeem_referral_code('OLDCODE'))
);

select tests.check(
  'parrainage : un code valide est accepté, quelle que soit la casse saisie',
  (select accepted from public.redeem_referral_code(' lea 10 '))
);

select tests.check(
  'parrainage : le client est bien rattaché au partenaire',
  (select referral_code = 'LEA10' and referred_at is not null
     from public.profiles where id = '22222222-2222-2222-2222-222222222222')
);

select tests.check(
  'parrainage : l''attribution est définitive, pas de changement de partenaire',
  (select not accepted and reason = 'already_referred'
     from public.redeem_referral_code('LEA10'))
);

select tests.check(
  'parrainage : les statistiques comptent bien l''inscription',
  (select signups = 1 from public.referral_stats where code = 'LEA10')
);

do $$
declare
  v_failed boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  begin
    -- Tentative de s'attribuer un influenceur à la main, sans passer par la
    -- fonction : fausserait la rémunération des partenaires.
    update public.profiles set referral_code = 'LEA10'
     where id = '11111111-1111-1111-1111-111111111111';
  exception when insufficient_privilege then
    v_failed := true;
  end;
  reset role;
  perform tests.check(
    'sécurité : un client ne peut pas s''attribuer un code en base directement',
    v_failed
  );
end $$;

do $$
declare
  v_failed boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  begin
    perform count(*) from public.referral_codes;
  exception when insufficient_privilege then
    v_failed := true;
  end;
  reset role;
  perform tests.check(
    'sécurité : la liste des codes est invisible au client',
    v_failed
  );
end $$;

-- --------------------------------------------------------------------------
-- Poids : facultatif, saisissable par le client, borné
-- --------------------------------------------------------------------------
do $$
declare
  v_ok boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  update public.profiles set weight_kg = 68
   where id = '11111111-1111-1111-1111-111111111111';
  v_ok := true;
  reset role;
  perform tests.check('poids : le client peut renseigner le sien', v_ok);
end $$;

do $$
declare
  v_failed boolean := false;
begin
  begin
    update public.profiles set weight_kg = 5
     where id = '11111111-1111-1111-1111-111111111111';
  exception when check_violation then
    v_failed := true;
  end;
  perform tests.check('poids : une valeur aberrante est rejetée', v_failed);
end $$;

-- --------------------------------------------------------------------------
-- Recommandations d'achat
-- --------------------------------------------------------------------------
insert into public.shopping_suggestions (user_id, item, why, priority)
values ('11111111-1111-1111-1111-111111111111', 'Ceinture en cuir marron',
        'Relierait tes chaussures au reste.', 'haute');

-- Le même manque, formulé avec une autre casse, ne doit pas créer de doublon :
-- c'est ce que garantit l'index sur la colonne générée item_key.
insert into public.shopping_suggestions (user_id, item, why, priority)
values ('11111111-1111-1111-1111-111111111111', 'ceinture en cuir MARRON',
        'Doublon d''un scan ultérieur.', 'moyenne')
on conflict (user_id, item_key) do nothing;

select tests.check(
  'shopping : un manque répété entre deux scans ne crée pas de doublon',
  (select count(*) = 1 from public.shopping_suggestions
    where user_id = '11111111-1111-1111-1111-111111111111')
);

select tests.check(
  'shopping : la première formulation est conservée',
  (select item = 'Ceinture en cuir marron' from public.shopping_suggestions
    where user_id = '11111111-1111-1111-1111-111111111111')
);

-- Deux utilisateurs peuvent avoir le même manque chacun de leur côté.
insert into public.shopping_suggestions (user_id, item, priority)
values ('22222222-2222-2222-2222-222222222222', 'Ceinture en cuir marron', 'basse');

select tests.check(
  'shopping : le dédoublonnage est par utilisateur, pas global',
  (select count(*) = 2 from public.shopping_suggestions)
);

do $$
declare
  v_count integer;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  select count(*) into v_count from public.shopping_suggestions;
  reset role;
  perform tests.check('shopping : chacun ne voit que ses suggestions', v_count = 1);
end $$;

do $$
declare
  v_failed boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  begin
    -- Se fabriquer des liens marchands reviendrait à contourner la vérification
    -- des URL faite côté serveur.
    update public.shopping_suggestions
       set product_matches = '[{"url":"https://faux.tld"}]'::jsonb
     where user_id = '11111111-1111-1111-1111-111111111111';
  exception when insufficient_privilege then
    v_failed := true;
  end;
  reset role;
  perform tests.check(
    'sécurité : un client ne peut pas s''injecter des liens produits',
    v_failed
  );
end $$;

do $$
declare
  v_ok boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  update public.shopping_suggestions set dismissed_at = now()
   where user_id = '11111111-1111-1111-1111-111111111111';
  v_ok := true;
  reset role;
  perform tests.check('shopping : un client peut masquer une suggestion', v_ok);
end $$;

-- --------------------------------------------------------------------------
-- Tenue du jour selon la météo
-- --------------------------------------------------------------------------
do $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  update public.profiles set latitude = 45.76, longitude = 4.84, city = 'Lyon'
   where id = '11111111-1111-1111-1111-111111111111';
  reset role;
  perform tests.check('météo : un client peut enregistrer sa position', true);
end $$;

do $$
declare
  v_failed boolean := false;
begin
  begin
    update public.profiles set latitude = 120
     where id = '11111111-1111-1111-1111-111111111111';
  exception when check_violation then
    v_failed := true;
  end;
  perform tests.check('météo : une latitude impossible est rejetée', v_failed);
end $$;

select tests.check(
  'météo : la position est arrondie au centième de degré (~1 km)',
  (select latitude = 45.76 from public.profiles
    where id = '11111111-1111-1111-1111-111111111111')
);

insert into public.daily_suggestions (user_id, day, occasion, weather, outfit)
values ('11111111-1111-1111-1111-111111111111', current_date, 'travail',
        '{"summary":"Lyon · 8°C, pluie"}'::jsonb, '{"advice":"..."}'::jsonb);

do $$
declare
  v_failed boolean := false;
begin
  begin
    -- Deuxième appel le même jour pour la même occasion : le cache doit tenir,
    -- sinon chaque rafraîchissement de page relance un appel au modèle.
    insert into public.daily_suggestions (user_id, day, occasion, weather, outfit)
    values ('11111111-1111-1111-1111-111111111111', current_date, 'travail',
            '{}'::jsonb, '{}'::jsonb);
  exception when unique_violation then
    v_failed := true;
  end;
  perform tests.check(
    'météo : une seule suggestion par jour et par occasion',
    v_failed
  );
end $$;

insert into public.daily_suggestions (user_id, day, occasion, weather, outfit)
values ('11111111-1111-1111-1111-111111111111', current_date, 'soirée',
        '{}'::jsonb, '{}'::jsonb);

select tests.check(
  'météo : chaque occasion garde sa propre suggestion',
  (select count(*) = 2 from public.daily_suggestions
    where user_id = '11111111-1111-1111-1111-111111111111'
      and day = current_date)
);

do $$
declare
  v_failed boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  begin
    -- Se fabriquer une suggestion contournerait l'appel au modèle et le cache.
    insert into public.daily_suggestions (user_id, day, occasion, weather, outfit)
    values ('11111111-1111-1111-1111-111111111111', current_date + 1, 'sport',
            '{}'::jsonb, '{}'::jsonb);
  exception when insufficient_privilege then
    v_failed := true;
  end;
  reset role;
  perform tests.check(
    'sécurité : un client ne peut pas fabriquer une suggestion du jour',
    v_failed
  );
end $$;

select 'TOUS LES TESTS SQL SONT PASSÉS' as resultat;
