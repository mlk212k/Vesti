-- ---------------------------------------------------------------------------
-- 09 — Le plafond de garde-robe du plan Découverte.
--
-- Ce qui est vérifié ici est une BARRIÈRE COMMERCIALE : au-delà de la limite,
-- le plan gratuit ne garde plus de pièces, et c'est ce refus qui vend le plan
-- payant. Une barrière qui ne tient pas ne se voit pas — elle se traduit par un
-- produit offert, silencieusement, à tout le monde.
--
-- `dressing_items` est écrite par le client ADMIN, qui contourne RLS : aucune
-- politique ne peut donc protéger ce plafond. C'est un déclencheur qui le tient,
-- et c'est lui qu'on éprouve.
-- ---------------------------------------------------------------------------

begin;

\set ON_ERROR_STOP on

-- Deux comptes jetables : un gratuit, un payant.
insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'plafond-gratuit@test.invalid', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'plafond-pro@test.invalid',     'authenticated', 'authenticated');

update public.profiles set plan = 'free' where id = 'aaaaaaaa-0000-4000-8000-000000000001';
update public.profiles set plan = 'pro'  where id = 'aaaaaaaa-0000-4000-8000-000000000002';

-- ---------------------------------------------------------------------------
-- 1. La limite annoncée par le SQL doit être celle du TypeScript.
--
-- ⚠️ `wardrobeLimit()` la calcule (3 analyses × 4 pièces) ; ici elle est écrite,
-- parce qu'une fonction SQL ne peut pas lire lib/plans.ts. Ce test est le seul
-- lien entre les deux : sans lui, changer l'offre côté TypeScript laisserait la
-- base plafonner à l'ancienne valeur, sans que rien ne le signale.
-- ---------------------------------------------------------------------------
do $$
begin
  if public.plan_wardrobe_limit('free') is distinct from 12 then
    raise exception 'plan_wardrobe_limit(free) = % — attendu 12, soit 3 analyses × 4 pièces. Si l''offre a changé, mettre à jour lib/plans.ts ET cette fonction.',
      public.plan_wardrobe_limit('free');
  end if;

  if public.plan_wardrobe_limit('pro') is not null
     or public.plan_wardrobe_limit('styliste') is not null then
    raise exception 'les plans payants doivent être sans limite';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Le plan gratuit remplit sa garde-robe jusqu'à la limite, et pas au-delà.
-- ---------------------------------------------------------------------------
do $$
declare
  v_user uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  v_n integer;
  v_refuse boolean := false;
begin
  for i in 1..12 loop
    insert into public.dressing_items (user_id, category, label)
    values (v_user, 'haut', 'piece ' || i);
  end loop;

  select count(*) into v_n from public.dressing_items where user_id = v_user;
  if v_n <> 12 then
    raise exception 'le plan gratuit devrait garder 12 pièces, il en a %', v_n;
  end if;

  begin
    insert into public.dressing_items (user_id, category, label)
    values (v_user, 'haut', 'la treizième');
  exception when others then
    v_refuse := true;
  end;

  if not v_refuse then
    raise exception 'LA BARRIÈRE NE TIENT PAS : la 13e pièce est passée';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Un plan payant n'est jamais plafonné.
--
-- Le cas qui casserait le produit dans l'autre sens : une limite appliquée à
-- quelqu'un qui paie pour ne pas en avoir.
-- ---------------------------------------------------------------------------
do $$
declare
  v_user uuid := 'aaaaaaaa-0000-4000-8000-000000000002';
  v_n integer;
begin
  for i in 1..20 loop
    insert into public.dressing_items (user_id, category, label)
    values (v_user, 'haut', 'piece ' || i);
  end loop;

  select count(*) into v_n from public.dressing_items where user_id = v_user;
  if v_n <> 20 then
    raise exception 'le plan pro devrait être sans limite, il s''est arrêté à %', v_n;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Un plan OFFERT lève la limite, comme un plan payé.
--
-- ⚠️ Le piège que ce fichier existe pour attraper. La colonne `plan` appartient
-- à Stripe et reste sur « free » pendant tout un plan offert : un déclencheur
-- qui la lirait seule plafonnerait la garde-robe de quelqu'un à qui l'on vient
-- d'offrir six mois de Styliste. Neuf endroits du code ont déjà fait cette
-- erreur.
-- ---------------------------------------------------------------------------
do $$
declare
  v_user uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  v_n integer;
begin
  -- Le même compte que le test 2, déjà plein à 12, reçoit un cadeau.
  update public.profiles
     set gift_plan = 'styliste',
         gift_plan_until = now() + interval '6 months'
   where id = v_user;

  insert into public.dressing_items (user_id, category, label)
  values (v_user, 'haut', 'après le cadeau');

  select count(*) into v_n from public.dressing_items where user_id = v_user;
  if v_n <> 13 then
    raise exception 'un plan offert doit lever la limite ; la garde-robe est restée à %', v_n;
  end if;
end $$;

rollback;
