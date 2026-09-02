-- Vesti — le prénom
--
-- Demandé dès l'onboarding, avant la morphologie : c'est la question la moins
-- intrusive du formulaire, et commencer par elle rend la suite plus facile à
-- accepter. Il sert à s'adresser à la personne — un verdict qui commence par
-- « Ta tenue » plutôt que « Cette tenue » se lit comme un conseil, pas comme
-- un rapport.
--
-- Facultatif : quelqu'un qui passe l'étape doit pouvoir utiliser l'app.

alter table public.profiles
  add column first_name text check (
    first_name is null or (length(btrim(first_name)) between 1 and 40)
  );

-- ⚠️ Le droit d'écriture doit être accordé EXPLICITEMENT.
--
-- Les permissions d'update sur `profiles` ne sont pas données à la table entière
-- avec des exceptions : c'est une liste blanche, colonne par colonne. Une
-- nouvelle colonne est donc fermée par défaut — bon réglage, mais qui veut dire
-- qu'ajouter un champ d'onboarding sans cette ligne donne un formulaire qui
-- s'affiche, se remplit, et échoue à l'enregistrement. C'est arrivé.
--
-- Contrairement au plan, au quota ou au solde de Style, le prénom appartient à
-- la personne : elle le renseigne et le corrige elle-même.
grant update (first_name) on public.profiles to authenticated;
