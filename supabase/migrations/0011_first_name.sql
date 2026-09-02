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

-- Pas de `revoke` : contrairement au plan, au quota ou au solde de Style, le
-- prénom appartient à la personne. Elle le renseigne et le corrige elle-même,
-- via la policy d'update déjà en place sur son propre profil.
