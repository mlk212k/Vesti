-- Vesti — additionner le coût des recherches à celui du verdict
--
-- ⚠️ Ce qui a rendu cette migration nécessaire : `analyses.cost_micros` ne
-- mesurait QUE l'appel du verdict. Les recherches produits — jusqu'à trois par
-- analyse sur le plan Styliste, chacune ramenant des pages web entières dans
-- le contexte ET facturée à l'acte — n'étaient comptées nulle part.
--
-- Résultat : la colonne annonçait 0,034 $ pour une analyse qui en coûtait plus
-- de dix fois autant. Toutes les marges calculées à partir de ce chiffre
-- étaient fausses, et fausses dans le sens rassurant.
--
-- 🔍 Une mesure partielle est plus dangereuse qu'une absence de mesure : on
-- lui fait confiance. « Non mesuré » se remarque ; « mesuré à un dixième » se
-- cite dans un tableau de marge.
--
-- L'addition se fait en SQL plutôt qu'en lisant-modifiant-écrivant depuis le
-- serveur : les recherches partent en parallèle, et deux écritures simultanées
-- perdraient l'une des deux.

create or replace function public.add_analysis_cost(p_analysis uuid, p_micros integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.analyses
     set cost_micros = cost_micros + greatest(p_micros, 0)
   where id = p_analysis;
$$;

comment on function public.add_analysis_cost(uuid, integer) is
  'Ajoute un coût à une analyse déjà enregistrée (recherches produits). Incrémental : sûr face aux appels concurrents.';

-- Appelée par le serveur avec la clé de service, qui ignore ces droits.
-- Personne d'autre n'a à pouvoir gonfler le coût d'une analyse.
revoke execute on function public.add_analysis_cost(uuid, integer)
  from public, anon, authenticated;
