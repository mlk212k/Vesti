-- ---------------------------------------------------------------------------
-- Tests des règles métier et de la RLS.
--
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/00_stub_supabase.sql
--   psql -v ON_ERROR_STOP=1 -f supabase/migrations/000*.sql   (dans l'ordre)
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/01_regles.sql
--
-- Chaque test se fait en se FAISANT PASSER pour un utilisateur (rôle
-- `authenticated` + revendication `sub` du JWT), exactement comme PostgREST
-- le fait en production. Sans ça on testerait en superutilisateur, pour qui
-- la RLS n'existe pas — autrement dit on ne testerait rien.
--
-- Une assertion qui tombe lève une exception et arrête le script.
-- ---------------------------------------------------------------------------

\set ON_ERROR_STOP on
\timing off

-- Outils de test ------------------------------------------------------------

create schema if not exists tests;

create or replace function tests.connecte(p_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims', json_build_object('sub', p_user)::text, true
  );
end;
$$;

create or replace function tests.deconnecte()
returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

create or replace function tests.egal(
  p_obtenu anyelement, p_attendu anyelement, p_message text
)
returns void language plpgsql as $$
begin
  if p_obtenu is distinct from p_attendu then
    raise exception 'ÉCHEC — % : obtenu %, attendu %',
      p_message, p_obtenu, p_attendu;
  end if;
  raise notice 'ok  %  (%)', p_message, p_obtenu;
end;
$$;

-- Vérifie qu'une instruction échoue bien, et avec le bon motif.
create or replace function tests.refuse(p_sql text, p_motif text, p_message text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_motif in sqlerrm) = 0 then
      raise exception 'ÉCHEC — % : refusé, mais pour « % » au lieu de « % »',
        p_message, sqlerrm, p_motif;
    end if;
    raise notice 'ok  %  (refusé : %)', p_message, p_motif;
    return;
  end;
  raise exception 'ÉCHEC — % : l''opération a été ACCEPTÉE alors qu''elle devait être refusée',
    p_message;
end;
$$;

-- Les tests s'exécutent en se faisant passer pour `authenticated` : ce rôle
-- doit pouvoir appeler les outils ci-dessus pour reprendre son identité de
-- superutilisateur ensuite.
grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

-- Comptes de test -----------------------------------------------------------

do $$
declare
  v_chef uuid;
  v_malik uuid;
  v_alex uuid;
  v_thomas uuid;
begin
  insert into auth.users (email) values ('chef@test.fr') returning id into v_chef;
  insert into auth.users (email) values ('malik@test.fr') returning id into v_malik;
  insert into auth.users (email) values ('alex@test.fr') returning id into v_alex;
  insert into auth.users (email) values ('thomas@test.fr') returning id into v_thomas;

  -- Le trigger a créé les profils en `member` ; on pose les rôles comme le
  -- fait l'admin depuis l'app.
  update public.profiles set full_name = 'Le Chef', role = 'admin' where id = v_chef;
  update public.profiles set full_name = 'Malik', role = 'manager' where id = v_malik;
  update public.profiles set full_name = 'Alex' where id = v_alex;
  update public.profiles set full_name = 'Thomas' where id = v_thomas;

  create temporary table acteurs as
  select v_chef as chef, v_malik as malik, v_alex as alex, v_thomas as thomas;
end;
$$;

-- 1. Création de profil automatique -----------------------------------------

do $$
begin
  perform tests.egal(
    (select count(*)::int from public.profiles), 4,
    'un profil est créé pour chaque compte'
  );
  perform tests.egal(
    (select count(*)::int from public.conversation_members
     where conversation_id = '00000000-0000-0000-0000-000000000001'),
    4,
    'tout le monde rejoint la conversation d''équipe'
  );
end;
$$;

-- 2. Stock : entrée et attribution ------------------------------------------

do $$
declare a record;
begin
  select * into a from acteurs;

  perform tests.connecte(a.chef);
  perform public.restock_cards(500, 'Commande initiale', 800);
  perform public.allocate_cards(a.alex, 10, 'Dotation');
  perform public.allocate_cards(a.thomas, 10, null);
  perform tests.deconnecte();

  perform tests.egal(
    (select in_warehouse from public.v_stock_summary), 480,
    'le dépôt descend de 500 à 480 après deux attributions de 10'
  );
  perform tests.egal(
    (select held from public.v_member_cards where member_id = a.alex), 10,
    'Alex a 10 cartes en main'
  );
end;
$$;

-- 3. Un membre ne peut pas s'attribuer de cartes ----------------------------

do $$
declare a record;
begin
  select * into a from acteurs;
  perform tests.connecte(a.alex);

  perform tests.refuse(
    format('select public.allocate_cards(%L, 50, null)', a.alex),
    'FORBIDDEN',
    'un commercial ne peut pas s''attribuer des cartes'
  );
  perform tests.refuse(
    'select public.restock_cards(1000, null, null)',
    'FORBIDDEN',
    'un commercial ne peut pas réapprovisionner le dépôt'
  );

  perform tests.deconnecte();
end;
$$;

-- 4. Le manager peut attribuer, mais pas réapprovisionner --------------------

do $$
declare a record;
begin
  select * into a from acteurs;
  perform tests.connecte(a.malik);

  perform public.allocate_cards(a.alex, 5, 'Renfort de Malik');
  perform tests.refuse(
    'select public.restock_cards(100, null, null)',
    'FORBIDDEN',
    'le manager ne réapprovisionne pas le dépôt (admin seul)'
  );

  perform tests.deconnecte();
  perform tests.egal(
    (select held from public.v_member_cards where member_id = a.alex), 15,
    'Alex a 15 cartes après le renfort du manager'
  );
end;
$$;

-- 5. Une vente sans journée ouverte est refusée ------------------------------

do $$
declare a record;
begin
  select * into a from acteurs;
  perform tests.connecte(a.alex);

  perform tests.refuse(
    'select public.record_sale(1, 5000, null, null, null, null)',
    'NO_OPEN_DAY',
    'pas de vente sans journée commencée'
  );

  perform tests.deconnecte();
end;
$$;

-- 6. L'exemple du cahier des charges : 8 cartes vendues sur 10 --------------
--    CA 400 €, commission 40 €, net 360 €.

do $$
declare
  a record;
  v_jour uuid;
begin
  select * into a from acteurs;
  perform tests.connecte(a.alex);

  v_jour := public.start_work_day();

  for i in 1..8 loop
    perform public.record_sale(1, 5000, null, null, null, null);
  end loop;

  perform tests.deconnecte();

  perform tests.egal(
    (select cards_sold from public.v_work_day_stats where id = v_jour), 8,
    '8 cartes vendues'
  );
  perform tests.egal(
    (select goal_cards from public.v_work_day_stats where id = v_jour), 10,
    'objectif figé à 10 (valeur par défaut des paramètres)'
  );
  perform tests.egal(
    (select revenue_cents from public.v_work_day_stats where id = v_jour), 40000,
    'CA = 400,00 €'
  );
  perform tests.egal(
    (select commission_cents from public.v_work_day_stats where id = v_jour), 4000,
    'commission chef = 40,00 € (10 %)'
  );
  perform tests.egal(
    (select net_cents from public.v_work_day_stats where id = v_jour), 36000,
    'net commercial = 360,00 €'
  );
  perform tests.egal(
    (select goal_reached from public.v_work_day_stats where id = v_jour), false,
    'objectif NON atteint à 8/10'
  );
  perform tests.egal(
    (select cards_missing from public.v_work_day_stats where id = v_jour), 2,
    '2 cartes restantes pour l''objectif'
  );
  perform tests.egal(
    (select held from public.v_member_cards where member_id = a.alex), 7,
    'les 8 ventes ont bien décrémenté le stock en main (15 - 8)'
  );
end;
$$;

-- 7. On ne vend pas des cartes qu'on n'a pas ---------------------------------

do $$
declare a record;
begin
  select * into a from acteurs;
  perform tests.connecte(a.alex);

  perform tests.refuse(
    'select public.record_sale(999, 5000, null, null, null, null)',
    'NOT_ENOUGH_CARDS',
    'vendre plus de cartes qu''on n''en détient est refusé'
  );

  perform tests.deconnecte();
end;
$$;

-- 8. Le montant ne peut pas être falsifié ------------------------------------
--    `sales` n'a aucune policy d'écriture : l'insertion directe est refusée,
--    et les colonnes de montant sont générées par Postgres.

do $$
declare
  a record;
  v_lignes integer;
begin
  select * into a from acteurs;
  perform tests.connecte(a.alex);

  perform tests.refuse(
    format(
      'insert into public.sales (member_id, work_day_id, quantity, unit_price_cents, commission_rate_bp, created_by) '
      || 'select %L, id, 1, 100000, 0, %L from public.work_days where member_id = %L limit 1',
      a.alex, a.alex, a.alex
    ),
    'row-level security',
    'un commercial ne peut pas insérer une vente à la main'
  );

  -- Sans policy d'UPDATE, la RLS ne lève pas d'erreur : elle rend les lignes
  -- invisibles à la modification. Le bon test n'est donc pas « ça échoue »
  -- mais « ça ne change rien » — c'est exactement ce qu'on veut vérifier.
  update public.sales set quantity = 100;
  get diagnostics v_lignes = row_count;
  perform tests.egal(v_lignes, 0,
    'un UPDATE direct sur les ventes ne touche aucune ligne');

  delete from public.sales;
  get diagnostics v_lignes = row_count;
  perform tests.egal(v_lignes, 0,
    'un DELETE direct sur les ventes ne touche aucune ligne');

  perform tests.deconnecte();

  perform tests.egal(
    (select max(quantity)::int from public.sales), 1,
    'aucune vente n''a été gonflée à 100 cartes'
  );
  perform tests.egal(
    (select count(*)::int from public.sales), 8,
    'aucune vente n''a été supprimée'
  );
end;
$$;

-- 9. Cloisonnement : un membre ne voit que ses propres données ---------------

do $$
declare
  a record;
  v_jour uuid;
begin
  select * into a from acteurs;

  -- Thomas travaille aussi, pour qu'il y ait quelque chose à ne pas voir.
  perform tests.connecte(a.thomas);
  v_jour := public.start_work_day();
  perform public.record_sale(2, 5000, null, null, null, null);
  perform tests.deconnecte();

  perform tests.connecte(a.alex);
  perform tests.egal(
    (select count(*)::int from public.sales), 8,
    'Alex ne voit que ses 8 ventes, pas celle de Thomas'
  );
  perform tests.egal(
    (select count(*)::int from public.work_days), 1,
    'Alex ne voit que sa propre journée'
  );
  perform tests.egal(
    (select count(*)::int from public.sales where member_id = a.thomas), 0,
    'filtrer explicitement sur l''id de Thomas ne donne rien non plus'
  );
  perform tests.deconnecte();

  perform tests.connecte(a.malik);
  perform tests.egal(
    (select count(*)::int from public.sales), 9,
    'le manager voit les ventes de toute l''équipe'
  );
  perform tests.deconnecte();

  perform tests.connecte(a.chef);
  perform tests.egal(
    (select count(*)::int from public.work_days), 2,
    'l''admin voit toutes les journées'
  );
  perform tests.deconnecte();
end;
$$;

-- 10. Un membre ne peut pas se promouvoir ------------------------------------

do $$
declare a record;
begin
  select * into a from acteurs;
  perform tests.connecte(a.alex);

  perform tests.refuse(
    format('update public.profiles set role = ''admin'' where id = %L', a.alex),
    'FORBIDDEN_FIELD',
    'un commercial ne peut pas se nommer admin'
  );
  perform tests.refuse(
    format('update public.profiles set daily_goal_override = 1 where id = %L', a.alex),
    'FORBIDDEN_FIELD',
    'un commercial ne peut pas baisser son propre objectif'
  );

  -- En revanche il change bien son nom et son téléphone.
  update public.profiles set full_name = 'Alex M.', phone = '0600000000'
  where id = a.alex;

  perform tests.deconnecte();
  perform tests.egal(
    (select full_name from public.profiles where id = a.alex), 'Alex M.',
    'un commercial modifie son propre nom'
  );
end;
$$;

-- 11. Paramètres : lecture pour tous, écriture pour l'admin ------------------

do $$
declare
  a record;
  v_lignes integer;
begin
  select * into a from acteurs;

  perform tests.connecte(a.alex);
  perform tests.egal(
    (select commission_rate_bp from public.app_settings), 1000,
    'le commercial voit le taux de commission qui lui est appliqué'
  );

  -- Même mécanique que pour les ventes : la ligne existe en lecture, mais
  -- elle est hors de portée en écriture. Zéro ligne modifiée.
  update public.app_settings set commission_rate_bp = 0 where id = 1;
  get diagnostics v_lignes = row_count;
  perform tests.egal(v_lignes, 0,
    'un commercial ne peut pas changer le taux de commission');
  perform tests.deconnecte();

  perform tests.connecte(a.malik);
  update public.app_settings set commission_rate_bp = 0 where id = 1;
  get diagnostics v_lignes = row_count;
  perform tests.egal(v_lignes, 0, 'le manager non plus');
  perform tests.deconnecte();

  perform tests.egal(
    (select commission_rate_bp from public.app_settings), 1000,
    'le taux est resté à 10 % après ces deux tentatives'
  );
end;
$$;

-- 12. Le taux est figé à la vente --------------------------------------------

do $$
declare
  a record;
  v_vente uuid;
begin
  select * into a from acteurs;

  perform tests.connecte(a.chef);
  update public.app_settings set commission_rate_bp = 2000 where id = 1;
  perform tests.deconnecte();

  perform tests.connecte(a.alex);
  v_vente := public.record_sale(1, 5000, null, null, null, null);
  perform tests.deconnecte();

  perform tests.egal(
    (select commission_cents from public.sales where id = v_vente), 1000,
    'la nouvelle vente applique le nouveau taux (20 % de 50 € = 10 €)'
  );
  perform tests.egal(
    (select sum(commission_cents)::int from public.sales
     where member_id = a.alex and commission_rate_bp = 1000), 4000,
    'les ventes d''avant gardent leur taux de 10 %'
  );

  -- On remet 10 % pour la suite.
  perform tests.connecte(a.chef);
  update public.app_settings set commission_rate_bp = 1000 where id = 1;
  perform tests.deconnecte();
end;
$$;

-- 13. Fin et validation de journée -------------------------------------------

do $$
declare
  a record;
  v_jour uuid;
begin
  select * into a from acteurs;

  perform tests.connecte(a.alex);
  v_jour := public.end_work_day('Secteur difficile');
  perform tests.deconnecte();

  perform tests.egal(
    (select status::text from public.work_days where id = v_jour), 'ended',
    'la journée passe en « terminée »'
  );

  -- Un membre ne valide pas sa propre journée.
  perform tests.connecte(a.alex);
  perform tests.refuse(
    format('select public.validate_work_day(%L, 0)', v_jour),
    'FORBIDDEN',
    'un commercial ne valide pas sa propre journée'
  );
  perform tests.deconnecte();

  -- Le manager valide, avec une retenue décidée par lui.
  perform tests.connecte(a.malik);
  perform public.validate_work_day(v_jour, 2000);
  perform tests.deconnecte();

  perform tests.egal(
    (select status::text from public.work_days where id = v_jour), 'validated',
    'le manager valide la journée'
  );
  perform tests.egal(
    (select penalty_cents from public.work_days where id = v_jour), 2000,
    'la retenue saisie est enregistrée (20 €)'
  );
  perform tests.egal(
    (select net_after_penalty_cents from public.v_work_day_stats where id = v_jour),
    (select net_cents - 2000 from public.v_work_day_stats where id = v_jour),
    'le net après retenue est cohérent'
  );

  -- Une journée validée ne se rouvre pas.
  perform tests.connecte(a.alex);
  perform tests.refuse(
    'select public.start_work_day()',
    'DAY_ALREADY_VALIDATED',
    'une journée validée ne peut pas être rouverte'
  );
  perform tests.deconnecte();
end;
$$;

-- 14. Correction d'une vente : trace et stock --------------------------------

do $$
declare
  a record;
  v_vente uuid;
  v_avant integer;
begin
  select * into a from acteurs;

  perform tests.connecte(a.thomas);
  select id into v_vente from public.sales where member_id = a.thomas limit 1;
  select held into v_avant from public.v_member_cards where member_id = a.thomas;

  perform public.update_sale(v_vente, 4, 5000, null, 'Le gérant en a repris 2');
  perform tests.deconnecte();

  perform tests.egal(
    (select quantity from public.sales where id = v_vente), 4,
    'la vente passe de 2 à 4 cartes'
  );
  perform tests.egal(
    (select amount_cents from public.sales where id = v_vente), 20000,
    'le montant est recalculé par la base (4 × 50 €)'
  );
  perform tests.egal(
    (select held from public.v_member_cards where member_id = a.thomas), v_avant - 2,
    'le stock en main suit la correction'
  );
  perform tests.egal(
    (select count(*)::int from public.audit_logs where action = 'sale.updated'), 1,
    'la correction laisse une ligne d''audit'
  );
end;
$$;

-- 15. Audit : admin seulement ------------------------------------------------

do $$
declare a record;
begin
  select * into a from acteurs;

  perform tests.connecte(a.alex);
  perform tests.egal(
    (select count(*)::int from public.audit_logs), 0,
    'un commercial ne lit aucune ligne d''audit'
  );
  perform tests.deconnecte();

  perform tests.connecte(a.malik);
  perform tests.egal(
    (select count(*)::int from public.audit_logs), 0,
    'le manager non plus'
  );
  perform tests.deconnecte();

  perform tests.connecte(a.chef);
  if (select count(*) from public.audit_logs) < 10 then
    raise exception 'ÉCHEC — l''admin devrait voir un journal d''audit fourni';
  end if;
  raise notice 'ok  l''admin lit le journal d''audit  (% lignes)',
    (select count(*) from public.audit_logs);
  perform tests.deconnecte();
end;
$$;

-- 16. Chat : cloisonnement des conversations privées -------------------------

do $$
declare
  a record;
  v_conv uuid;
begin
  select * into a from acteurs;

  perform tests.connecte(a.malik);
  v_conv := public.get_or_create_direct_conversation(a.thomas);
  insert into public.messages (conversation_id, author_id, body)
  values (v_conv, a.malik, 'On fait le point demain ?');
  perform tests.deconnecte();

  perform tests.connecte(a.alex);
  perform tests.egal(
    (select count(*)::int from public.messages where conversation_id = v_conv), 0,
    'Alex ne lit pas la conversation privée de Malik et Thomas'
  );
  perform tests.refuse(
    format(
      'insert into public.messages (conversation_id, author_id, body) values (%L, %L, ''coucou'')',
      v_conv, a.alex
    ),
    'row-level security',
    'Alex ne peut pas écrire dans une conversation dont il n''est pas membre'
  );
  perform tests.deconnecte();

  perform tests.connecte(a.thomas);
  perform tests.egal(
    (select count(*)::int from public.messages where conversation_id = v_conv), 1,
    'Thomas lit bien le message qui lui est adressé'
  );
  perform tests.egal(
    (select unread from public.v_my_conversations where id = v_conv), 1,
    'le message apparaît comme non lu chez Thomas'
  );
  perform tests.deconnecte();

  -- Idempotence : réouvrir la conversation privée ne la duplique pas.
  perform tests.connecte(a.malik);
  perform tests.egal(
    public.get_or_create_direct_conversation(a.thomas), v_conv,
    'ouvrir deux fois une conversation privée donne la même'
  );
  perform tests.deconnecte();
end;
$$;

-- 17. Notifications ----------------------------------------------------------

do $$
declare a record;
begin
  select * into a from acteurs;

  perform tests.connecte(a.alex);
  if (select count(*) from public.notifications) = 0 then
    raise exception 'ÉCHEC — Alex devrait être notifié de ses attributions de cartes';
  end if;
  perform tests.egal(
    (select count(*)::int from public.notifications where user_id <> a.alex), 0,
    'on ne voit que ses propres notifications'
  );
  raise notice 'ok  Alex a % notification(s)',
    (select count(*) from public.notifications);
  perform tests.deconnecte();
end;
$$;

-- 18. Cohérence comptable du stock -------------------------------------------

do $$
declare s record;
begin
  select * into s from public.v_stock_summary;

  -- Tout ce qui est entré (achats + recomptages) est soit au dépôt, soit en
  -- main, soit vendu, soit perdu. Si cette égalité casse, le grand livre ment.
  perform tests.egal(
    s.in_warehouse + s.held_by_members + s.sold + s.lost,
    s.restocked + s.warehouse_adjustments,
    'dépôt + en main + vendues + perdues = achats + recomptages'
  );
end;
$$;

-- 19. Journée unique par personne et par date --------------------------------

do $$
declare a record;
begin
  select * into a from acteurs;

  perform tests.connecte(a.thomas);
  -- Thomas a déjà une journée ouverte : la redemander renvoie la même.
  perform tests.egal(
    public.start_work_day(),
    (select id from public.work_days where member_id = a.thomas),
    'recommencer une journée déjà ouverte renvoie la même'
  );
  perform tests.deconnecte();
end;
$$;

-- 20. Commissions : montant calculé, jamais saisi ----------------------------

do $$
declare
  a record;
  v_payout uuid;
  v_attendu integer;
begin
  select * into a from acteurs;

  select coalesce(sum(s.commission_cents), 0)::int into v_attendu
  from public.sales s
  join public.work_days d on d.id = s.work_day_id
  where s.member_id = a.alex;

  perform tests.connecte(a.malik);
  perform tests.refuse(
    format('select public.create_commission_payout(%L, ''2000-01-01'', ''2100-01-01'', null)', a.alex),
    'FORBIDDEN',
    'le manager ne fige pas les commissions (admin seul)'
  );
  perform tests.deconnecte();

  perform tests.connecte(a.chef);
  v_payout := public.create_commission_payout(a.alex, '2000-01-01', '2100-01-01', null);
  perform tests.deconnecte();

  perform tests.egal(
    (select amount_cents from public.commission_payouts where id = v_payout),
    v_attendu,
    'le règlement reprend exactement la somme des commissions des ventes'
  );
end;
$$;

-- 21. Planning : chacun ses créneaux, l'encadrement pour tout le monde ------

do $$
declare
  a record;
  v_lignes integer;
begin
  select * into a from acteurs;

  perform tests.connecte(a.alex);
  insert into public.availabilities (member_id, weekday, slot)
  values (a.alex, 6, 'am'), (a.alex, 6, 'pm');
  perform tests.egal(
    (select count(*)::int from public.availabilities where member_id = a.alex), 2,
    'un commercial pose ses propres créneaux'
  );

  -- Poser les créneaux d'un collègue n'est pas refusé par une erreur : la
  -- policy rend simplement la ligne inécrivable.
  perform tests.refuse(
    format('insert into public.availabilities (member_id, weekday, slot) values (%L, 1, ''am'')', a.thomas),
    'row-level security',
    'un commercial ne pose pas les créneaux d''un collègue'
  );
  perform tests.deconnecte();

  perform tests.connecte(a.chef);
  insert into public.availabilities (member_id, weekday, slot)
  values (a.thomas, 3, 'pm');
  perform tests.egal(
    (select count(*)::int from public.availabilities where member_id = a.thomas), 1,
    'le chef pose les créneaux de son équipe'
  );
  perform tests.deconnecte();

  perform tests.connecte(a.malik);
  perform tests.egal(
    (select count(*)::int from public.availabilities), 3,
    'le planning est visible par toute l''équipe'
  );
  perform tests.deconnecte();
end;
$$;

-- 22. Relances ---------------------------------------------------------------

do $$
declare a record;
begin
  select * into a from acteurs;

  perform tests.connecte(a.alex);
  perform tests.refuse(
    format('select public.send_nudge(%L, ''bouge'')', a.thomas),
    'FORBIDDEN',
    'un commercial ne relance personne'
  );
  perform tests.deconnecte();

  perform tests.connecte(a.malik);
  perform public.send_nudge(a.thomas, 'Ouvre ta journée stp');

  -- Le garde-fou anti-harcèlement : pas deux relances dans l'heure.
  perform tests.refuse(
    format('select public.send_nudge(%L, ''encore'')', a.thomas),
    'NUDGE_TOO_SOON',
    'deux relances dans l''heure sont refusées'
  );
  perform tests.deconnecte();

  perform tests.connecte(a.thomas);
  perform tests.egal(
    (select count(*)::int from public.notifications where kind = 'nudge'), 1,
    'la relance arrive en notification chez le commercial'
  );
  perform tests.deconnecte();

  perform tests.connecte(a.alex);
  perform tests.egal(
    (select count(*)::int from public.nudges), 0,
    'un commercial ne voit pas les relances des autres'
  );
  perform tests.deconnecte();
end;
$$;

-- 23. Réactions : cloisonnées comme les messages ------------------------------

do $$
declare
  a record;
  v_msg uuid;
begin
  select * into a from acteurs;

  -- Un message de l'équipe, que tout le monde peut voir.
  perform tests.connecte(a.malik);
  insert into public.messages (conversation_id, author_id, body)
  values ('00000000-0000-0000-0000-000000000001', a.malik, 'On y va')
  returning id into v_msg;
  perform tests.deconnecte();

  perform tests.connecte(a.alex);
  insert into public.message_reactions (message_id, user_id, emoji)
  values (v_msg, a.alex, '🔥');
  perform tests.egal(
    (select count(*)::int from public.message_reactions where message_id = v_msg), 1,
    'on réagit à un message de sa conversation'
  );
  perform tests.refuse(
    format('insert into public.message_reactions (message_id, user_id, emoji) values (%L, %L, ''👍'')',
           v_msg, a.thomas),
    'row-level security',
    'on ne réagit pas au nom de quelqu''un d''autre'
  );
  perform tests.deconnecte();
end;
$$;

-- Résumé ---------------------------------------------------------------------

do $$
begin
  raise notice '';
  raise notice '================================================';
  raise notice ' Tous les tests sont passés.';
  raise notice '================================================';
end;
$$;
