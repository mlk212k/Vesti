\set ON_ERROR_STOP on
set search_path = public;

-- ---------------------------------------------------------------------------
-- Qui a le droit d'écrire quoi sur `profiles`
--
-- Les droits d'update ne sont pas donnés à la table entière avec des
-- exceptions : c'est une liste blanche, colonne par colonne. Une colonne
-- ajoutée sans `grant` est donc fermée — ce qui est le bon réglage, mais qui
-- produit un formulaire qui s'affiche, se remplit et échoue à l'enregistrement.
-- C'est arrivé avec `first_name`, et rien ne l'a signalé avant un utilisateur.
--
-- Ce test fixe les deux moitiés de la règle : ce que la personne possède, elle
-- l'écrit ; ce qui touche à l'argent ou aux récompenses, jamais.
-- ---------------------------------------------------------------------------
do $$
declare
  c text;
  -- Ce que la personne renseigne elle-même sur son propre profil.
  v_siennes constant text[] := array[
    'first_name', 'gender', 'height_cm', 'weight_kg', 'morphology',
    'style_prefs', 'onboarded_at', 'latitude', 'longitude', 'city'
  ];
  -- Ce qui est écrit par Stripe, par le quota ou par le parrainage.
  v_interdites constant text[] := array[
    'plan', 'analyses_used', 'period_start', 'stripe_customer_id',
    'referral_code', 'referred_at',
    'style_balance', 'own_code', 'referred_by', 'referred_by_at',
    'referral_rewarded_at', 'gift_plan', 'gift_plan_until'
  ];
begin
  foreach c in array v_siennes loop
    if not has_column_privilege('authenticated', 'public.profiles', c, 'UPDATE') then
      raise exception 'FAIL  le client ne peut pas écrire sa propre colonne « % » — grant manquant', c;
    end if;
  end loop;
  raise notice 'PASS  le client peut écrire les % colonnes qui lui appartiennent', array_length(v_siennes, 1);

  foreach c in array v_interdites loop
    if has_column_privilege('authenticated', 'public.profiles', c, 'UPDATE') then
      raise exception 'FAIL  le client peut écrire « % », qui ne lui appartient pas', c;
    end if;
  end loop;
  raise notice 'PASS  les % colonnes sensibles restent hors de portée du client', array_length(v_interdites, 1);

  -- Une colonne oubliée dans les deux listes ci-dessus passerait inaperçue :
  -- on vérifie qu'elles couvrent bien tout `profiles`.
  select string_agg(column_name, ', ') into c
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name <> 'id'
    and column_name <> 'email'
    and column_name <> 'created_at'
    and not (column_name = any(v_siennes))
    and not (column_name = any(v_interdites));

  if c is not null then
    raise exception 'FAIL  colonne(s) non classée(s) : % — ajoute-la aux siennes ou aux interdites', c;
  end if;
  raise notice 'PASS  toutes les colonnes de profiles sont classées';

  raise notice 'TOUS LES TESTS DE PERMISSION SONT PASSÉS';
end $$;
