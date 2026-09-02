-- Vesti — mesurer le coût réel, et fermer le dernier scénario perdant
--
-- Deux choses, liées par le même but : ne jamais servir un client à perte.

-- ---------------------------------------------------------------------------
-- 1. Le coût de chaque analyse, en micro-dollars
--
-- Les tokens étaient déjà enregistrés, mais il fallait ressortir les tarifs à
-- la main pour en tirer un coût. Le stocker le rend interrogeable : marge par
-- client, par plan, par mois, sans refaire un calcul de tête à chaque question.
--
-- En micro-dollars entiers (millionièmes) : une analyse coûte quelques
-- centimes, arrondir au centime effacerait la différence entre deux réglages
-- qu'on cherche justement à comparer.
-- ---------------------------------------------------------------------------
alter table public.analyses
  add column cost_micros integer not null default 0
    check (cost_micros >= 0);

comment on column public.analyses.cost_micros is
  'Coût du modèle en micro-dollars. 0 = non mesuré (réponse d''API incomplète), pas gratuit.';

-- ---------------------------------------------------------------------------
-- 2. Plafonds fair use : Pro 50 → 40, Styliste 100 → 60
--
-- 💰 Le calcul du pire cas, sur un client amené par un influenceur à 30 % :
--
--   Pro       8,99 € − 2,70 (commission) − 0,38 (Stripe) = 5,91 € restants.
--             40 analyses × ~0,06 $ ≈ 2,40 → il reste ~3,50 €.
--
--   Styliste 17,99 € − 5,40 (commission) − 0,52 (Stripe) = 12,07 € restants.
--             60 analyses × ~0,10 $ ≈ 6,00 → il reste ~6,00 €.
--
-- Aux anciens plafonds, un abonné Styliste qui allait au bout coûtait environ
-- 10 € pour 12,07 € restants : la marge tenait à 2 €, sur une estimation. Le
-- même client atteignant 100 analyses AVEC les recherches de produits pouvait
-- passer en négatif. C'est ce scénario-là qui est fermé.
--
-- 40 analyses par mois, c'est plus d'une tenue par jour tous les jours : le
-- plafond reste invisible pour un usage normal.
--
-- ⚠️ Miroir de `lib/plans.ts`. Un test SQL échoue si les deux divergent.
-- ---------------------------------------------------------------------------
create or replace function public.plan_analysis_limit(p_plan text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_plan
    when 'free'     then 3
    when 'pro'      then 40
    when 'styliste' then 60
    else 0
  end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Rattraper l'historique
--
-- Les analyses déjà faites ont leurs tokens : leur coût est calculable, il
-- serait dommage de démarrer la mesure à zéro alors que la réponse existe
-- déjà. Le `cost_micros = 0` en condition rend le rattrapage rejouable sans
-- écraser une valeur déjà écrite par l'application.
--
-- 📏 Ce que ça a donné sur les 11 premières analyses : 0,059 $ en moyenne,
-- 0,0715 $ au pire. C'est la mesure qui remplace l'estimation « ~0,06 $ » sur
-- laquelle les plafonds ci-dessus ont été calculés — elle la confirme.
-- ---------------------------------------------------------------------------
update public.analyses
set cost_micros = round(input_tokens * 5 + output_tokens * 25)
where model = 'claude-opus-5'
  and input_tokens is not null
  and output_tokens is not null
  and cost_micros = 0;
