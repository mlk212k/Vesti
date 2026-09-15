-- Vesti — les habitudes, demandées à l'inscription
--
-- Cinq jauges posées pendant l'onboarding. Elles ont deux rôles, et le second
-- est celui qui compte vraiment :
--
--  1. Alimenter le produit. `clothing_budget_eur` en particulier : le plan
--     Styliste recommande aujourd'hui des pièces sans rien savoir du budget de
--     la personne, donc propose un manteau à 300 € à quelqu'un qui en dépense
--     40 par mois.
--
--  2. Faire CALCULER à la personne le coût de son problème. Une jauge « tu
--     mets combien de temps le matin » ne sert pas à nous renseigner : elle
--     sert à ce que « 20 minutes » devienne « 121 heures par an » sous ses
--     yeux. C'est l'écran de fin qui fait ce travail, pas la colonne.
--
-- ⚠️ CE SONT DES ESTIMATIONS, PAS DES MESURES. Personne n'a chronométré ses
-- matins. Tout écran qui restitue ces chiffres doit le dire — « d'après toi »
-- — et jamais les présenter comme un relevé. Le commentaire est ici parce que
-- la tentation de les afficher comme des faits viendra du côté marketing.
--
-- Toutes les colonnes sont NULLABLES : l'onboarding se saute, et un profil
-- ancien n'a rien répondu. Aucun écran ne doit supposer qu'elles sont remplies.

alter table public.profiles
  -- Minutes passées à choisir sa tenue le matin. 45 est un plafond
  -- volontairement bas : au-delà, la jauge cesse d'être crédible et la personne
  -- se dit qu'on parle de quelqu'un d'autre.
  add column morning_minutes integer
    check (morning_minutes between 0 and 45),

  -- Changements de tenue par semaine, parce que la première ne va pas.
  add column outfit_changes_per_week integer
    check (outfit_changes_per_week between 0 and 7),

  -- Dépense vestimentaire mensuelle, en euros.
  --
  -- ⚠️ La seule de ces cinq colonnes qui pilote une décision du produit : elle
  -- borne les recommandations d'achat du plan Styliste. Une valeur fausse ne
  -- fait donc pas qu'un joli chiffre faux, elle fait de mauvais conseils.
  add column clothing_budget_eur integer
    check (clothing_budget_eur between 0 and 300),

  -- Sur 10 vêtements achetés, combien sont réellement portés.
  -- Croisée avec le budget, c'est elle qui produit le chiffre qui frappe :
  -- « 576 € de vêtements jamais sortis du placard ».
  add column worn_out_of_ten integer
    check (worn_out_of_ten between 0 and 10),

  -- Confiance ressentie dans ses tenues, de 1 à 10.
  -- Point de départ : c'est ce qu'on pourra lui remontrer à côté de sa courbe
  -- de scores trois mois plus tard.
  add column style_confidence integer
    check (style_confidence between 1 and 10);

comment on column public.profiles.clothing_budget_eur is
  'Budget mensuel déclaré, en euros. Borne les recommandations d''achat du plan Styliste. Estimation de l''utilisateur, jamais une mesure.';
comment on column public.profiles.morning_minutes is
  'Minutes déclarées pour choisir une tenue. Sert au récapitulatif d''onboarding, pas à une décision produit.';
comment on column public.profiles.worn_out_of_ten is
  'Vêtements réellement portés sur 10 achetés, déclaré. Croisé au budget pour chiffrer le gaspillage.';

-- ---------------------------------------------------------------------------
-- Écriture : par le propriétaire du profil, et lui seul.
--
-- Ces colonnes rejoignent celles que le client peut écrire — contrairement à
-- `plan`, `referral_code` ou `is_partner`, qui décident d'un accès ou d'un
-- versement et restent hors de sa portée. Se tromper de côté ici ouvrirait à
-- quelqu'un la possibilité de se déclarer partenaire ; se tromper dans l'autre
-- sens empêcherait simplement de répondre au questionnaire.
-- ---------------------------------------------------------------------------
grant update (
  morning_minutes,
  outfit_changes_per_week,
  clothing_budget_eur,
  worn_out_of_ten,
  style_confidence
) on public.profiles to authenticated;
