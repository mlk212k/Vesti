-- Vesti — abaisser les plafonds fair use
--
-- Pro passe de 150 à 50 analyses par mois, Styliste de 300 à 100.
--
-- 💰 Le calcul qui commande ces nombres. Une analyse coûte environ 0,06 $,
-- mesuré sur de vraies analyses et non estimé. Aux anciens plafonds, un abonné
-- qui allait au bout coûtait ~9 $ sur un plan à 8,99 € et ~18 $ sur un plan à
-- 17,99 € : la marge était nulle avant même les frais Stripe, et négative sur
-- Styliste où s'ajoutent les recherches de produits.
--
-- 50 analyses par mois, c'est plus d'une tenue et demie par jour, tous les
-- jours. Le plafond reste donc invisible pour un usage normal — ce qui est tout
-- l'intérêt : c'est un garde-fou anti-abus, pas un argument commercial. Ce qu'il
-- empêche, c'est qu'un seul utilisateur intensif efface la marge de plusieurs
-- autres.
--
-- ⚠️ Ces nombres existent en double : ici, et dans `lib/plans.ts` qui les
-- affiche. Le SQL décide, le TypeScript ne fait que raconter. Un test
-- (supabase/tests/01_quota_and_rls.sql) échoue si les deux divergent.

create or replace function public.plan_analysis_limit(p_plan text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_plan
    when 'free'     then 3
    when 'pro'      then 50
    when 'styliste' then 100
    else 0
  end;
$$;
