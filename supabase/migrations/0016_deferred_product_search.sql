-- Vesti — sortir la recherche de produits du chemin critique
--
-- ⚠️ Le défaut corrigé : la recherche de produits bloquait le verdict.
--
-- Sur le plan Styliste, l'analyse enchaînait jusqu'à trois recherches web
-- (chacune un appel au modèle, chacune suivie d'une lecture de page pour en
-- tirer la photo du produit) AVANT de répondre quoi que ce soit. Le verdict
-- était prêt depuis longtemps ; le client regardait tourner un écran d'attente
-- pendant qu'on cherchait des liens qu'il n'avait pas encore demandés.
--
-- Deux conséquences, et la seconde est la pire :
--   1. l'abonné qui paie le plus cher attendait le plus longtemps ;
--   2. la requête restait ouverte deux fois plus longtemps, donc avait deux
--      fois plus d'occasions de tomber sur un réseau mobile — et une requête
--      tombée, c'est un verdict perdu.
--
-- Désormais le verdict part dès qu'il est prêt, et les liens sont cherchés
-- dans un second appel. Pour que ce second appel n'ait besoin de RIEN venant
-- du navigateur, il faut que le serveur retrouve seul de quoi chercher : d'où
-- cette colonne.

-- Mots-clés d'achat produits par le modèle à l'analyse ("jean droit brut taille
-- haute"). Ils étaient calculés puis jetés ; sans eux, une recherche différée
-- devrait se rabattre sur le libellé seul, et perdrait en précision — ou pire,
-- devrait faire confiance à une requête envoyée par le navigateur.
alter table public.dressing_items
  add column search_terms text[] not null default '{}';

comment on column public.dressing_items.search_terms is
  'Mots-clés d''achat issus de l''analyse. Servent à la recherche produits différée, côté serveur uniquement.';

-- 🔒 Aucun GRANT ici, volontairement, et ce n'est pas un oubli.
--
-- `authenticated` ne possède que SELECT sur cette table : ni INSERT ni UPDATE.
-- Toutes les écritures passent déjà par le client admin, côté serveur. La
-- nouvelle colonne hérite donc de cet état fermé sans qu'on ait rien à faire.
--
-- C'est exactement ce qu'il faut pour celle-ci : `search_terms` décide du
-- contenu d'une recherche web facturée à l'usage. La rendre écrivable
-- laisserait n'importe qui piloter — et payer avec notre compte — des
-- recherches arbitraires. Vérifié avant d'écrire cette migration : ajouter un
-- GRANT « pour être sûr » aurait ouvert un droit qui n'existait pas.
