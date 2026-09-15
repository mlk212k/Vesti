-- Vesti — l'essai sans compte
--
-- ── Pourquoi cette table existe ────────────────────────────────────────────
--
-- Mesuré : 758 visiteurs sur la page d'accueil, 28 ont appuyé sur le bouton.
-- 3,7 %. Ceux qui passent vont au bout, donc la perte est AVANT l'inscription.
-- On demandait un compte pour découvrir ce que fait le produit.
--
-- Désormais on analyse d'abord, on demande le compte ensuite — « garde ton
-- verdict ». Le verdict est stocké ICI en attendant, puis recopié dans
-- `analyses` au moment de l'inscription.
--
-- ⚠️ POURQUOI IL EST STOCKÉ CÔTÉ SERVEUR ET PAS DANS LE NAVIGATEUR. Le rendre
-- au client et le laisser nous le renvoyer après l'inscription serait plus
-- simple, et permettrait à n'importe qui de se fabriquer un 100/100 signé de
-- notre main. Ce que le modèle a répondu ne repasse jamais par le client.
--
-- ⚠️ CETTE TABLE COÛTE DE L'ARGENT. Chaque ligne est un appel au modèle payé
-- sans contrepartie : ~0,039 $ le verdict, mesuré sur les analyses réelles.
-- Sans plafond, une seule personne vide le budget du mois en une nuit avec une
-- boucle. Les trois limites plus bas ne sont donc pas du confort.

create table public.anon_trials (
  -- Le jeton est l'identifiant : il vit dans un cookie du visiteur et sert
  -- aussi de dossier de stockage pour sa photo. Généré côté serveur, jamais
  -- accepté du client sans vérification.
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- ⚠️ EMPREINTE, PAS ADRESSE. Une IP est une donnée personnelle ; on n'a
  -- besoin que de savoir si deux essais viennent du même endroit, pas d'où.
  -- Le hachage est fait côté application avec un sel secret, donc irréversible
  -- même pour qui lirait cette table.
  ip_hash text,

  image_path text,

  -- Le verdict rendu. Nul tant que l'analyse n'a pas abouti : la ligne est
  -- créée AVANT l'appel au modèle, parce que c'est elle qui réserve la place
  -- sous les plafonds. Une ligne sans score est un essai commencé et perdu.
  score integer check (score between 0 and 100),
  occasion text,
  verdict jsonb,
  garments jsonb not null default '[]'::jsonb,
  cost_micros integer not null default 0,

  -- Rattachement au compte créé ensuite. Une fois posé, l'essai est consommé
  -- et ne peut plus être réclamé — c'est ce qui empêche de rejouer le même
  -- verdict sur dix comptes.
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz
);

comment on table public.anon_trials is
  'Essais gratuits sans compte. Chaque ligne est un appel au modèle payé sans contrepartie — voir les plafonds dans reserve_anon_trial().';
comment on column public.anon_trials.ip_hash is
  'Empreinte salée de l''adresse IP, calculée par l''application. Jamais l''adresse elle-même.';

create index anon_trials_created_idx on public.anon_trials (created_at desc);
create index anon_trials_ip_idx on public.anon_trials (ip_hash, created_at desc);

-- ---------------------------------------------------------------------------
-- Accès : personne, sauf le serveur.
--
-- RLS activé SANS aucune policy. Ce n'est pas un oubli : c'est le réglage qui
-- ferme la table à l'API publique. Seules les routes serveur, qui passent par
-- la clé de service, y écrivent. Même choix que `stripe_events` et `ai_spend`.
-- ---------------------------------------------------------------------------
alter table public.anon_trials enable row level security;

-- ---------------------------------------------------------------------------
-- Les plafonds.
--
-- ⚠️ Ils sont EN SQL et non dans l'application, pour une raison précise : deux
-- requêtes qui arrivent en même temps liraient toutes les deux « il reste de
-- la place » avant que l'une ait écrit. Le compte et l'insertion doivent se
-- faire dans la même transaction, sinon le plafond fuit exactement au moment
-- où il sert — sous une attaque, qui est par nature parallèle.
-- ---------------------------------------------------------------------------
create or replace function public.reserve_anon_trial(
  p_ip_hash text,
  p_max_per_day integer,
  p_max_per_ip_per_day integer
)
returns table (trial_id uuid, refusal text)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_today integer;
  v_ip integer;
  v_id uuid;
begin
  -- Verrou d'advisory sur la table : sérialise les réservations concurrentes.
  -- Sans lui, dix requêtes simultanées comptent 0 essai chacune et passent
  -- toutes les dix.
  perform pg_advisory_xact_lock(hashtext('anon_trials_reserve'));

  select count(*) into v_today
  from public.anon_trials
  where created_at >= date_trunc('day', now());

  if v_today >= p_max_per_day then
    return query select null::uuid, 'daily_cap'::text;
    return;
  end if;

  -- Un `ip_hash` nul (adresse illisible) ne doit pas ouvrir une porte sans
  -- limite : on le traite comme une adresse à part entière, partagée par tous
  -- ceux qu'on n'a pas su distinguer.
  select count(*) into v_ip
  from public.anon_trials
  where coalesce(ip_hash, '') = coalesce(p_ip_hash, '')
    and created_at >= now() - interval '24 hours';

  if v_ip >= p_max_per_ip_per_day then
    return query select null::uuid, 'ip_cap'::text;
    return;
  end if;

  insert into public.anon_trials (ip_hash) values (p_ip_hash)
  returning id into v_id;

  return query select v_id, null::text;
end;
$$;

-- ⚠️ Révoquée pour tout le monde. Cette fonction crée des lignes qui coûtent de
-- l'argent : elle n'est appelable que par la clé de service, depuis nos routes.
revoke all on function public.reserve_anon_trial(text, integer, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Le rattachement : l'essai devient l'analyse du compte qui vient d'être créé.
--
-- ⚠️ ATOMIQUE, et c'est tout l'enjeu. Marquer l'essai puis créer l'analyse en
-- deux temps laisse une fenêtre où l'on peut réclamer deux fois — donc offrir
-- un verdict par compte créé, à partir d'un seul essai payé.
--
-- La fonction ne rend rien si l'essai est inconnu, déjà réclamé, ou sans
-- verdict (analyse interrompue). Réclamer deux fois est un cas normal, pas une
-- erreur : le client peut rejouer l'appel, et la seconde fois ne fait rien.
-- ---------------------------------------------------------------------------
create or replace function public.claim_anon_trial(p_trial uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_trial public.anon_trials;
  v_analysis uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  -- `for update` : deux onglets qui réclament en même temps se mettent en file,
  -- et le second voit `claimed_by` déjà posé.
  select * into v_trial
  from public.anon_trials
  where id = p_trial and claimed_by is null and score is not null
  for update;

  if not found then
    return null;
  end if;

  insert into public.analyses (
    user_id, kind, image_paths, verdict, score, occasion, cost_micros
  )
  values (
    auth.uid(), 'outfit', array[v_trial.image_path],
    v_trial.verdict, v_trial.score, v_trial.occasion, 0
  )
  returning id into v_analysis;

  update public.anon_trials
  set claimed_by = auth.uid(), claimed_at = now()
  where id = p_trial;

  return v_analysis;
end;
$$;

-- Appelable par un utilisateur connecté : c'est lui qui réclame son propre
-- essai. La fonction vérifie `auth.uid()` elle-même et ne peut rien écrire au
-- nom de quelqu'un d'autre.
revoke all on function public.claim_anon_trial(uuid) from public, anon;
grant execute on function public.claim_anon_trial(uuid) to authenticated;
