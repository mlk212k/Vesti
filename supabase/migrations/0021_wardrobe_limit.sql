-- ---------------------------------------------------------------------------
-- 0021 — La garde-robe du plan Découverte a un plafond, tenu par Postgres.
--
-- Le plan gratuit ne gardait AUCUNE pièce : les habits détectés pendant une
-- analyse étaient jetés une fois le verdict rendu, et l'onglet Dressing n'était
-- qu'un mur de paiement. On ne vend pas une garde-robe à quelqu'un qui n'a
-- jamais vu la sienne. Elle se remplit donc maintenant pour tout le monde, mais
-- s'arrête à la limite du plan.
--
-- ⚠️ POURQUOI UN DÉCLENCHEUR ET PAS SEULEMENT UN `slice()` DANS L'API
--
-- `dressing_items` est écrite par le client ADMIN, qui contourne RLS par
-- construction : aucune politique ne peut donc protéger ce plafond. Or il y a
-- déjà deux chemins d'écriture (l'analyse de tenue, le scan de dressing), et
-- c'est exactement le genre de règle qu'un troisième chemin oublierait — sans
-- rien casser de visible, en offrant simplement le plan payant.
--
-- Ici, la règle est tenue par la table elle-même. Un chemin d'écriture qui
-- l'ignore échoue bruyamment au lieu de donner le produit.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- plan_wardrobe_limit : miroir de `wardrobeLimit()` en TypeScript.
--
-- `null` = sans limite. Le calcul reprend celui du TS — le nombre d'analyses du
-- plan × 4 pièces par tenue — pour que changer l'offre fasse suivre les deux
-- côtés. Les valeurs sont écrites ici plutôt que lues : une fonction SQL ne
-- peut pas importer lib/plans.ts, et un test vérifie qu'elles coïncident.
-- ---------------------------------------------------------------------------
create or replace function public.plan_wardrobe_limit(p_plan text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_plan
    when 'free' then 12   -- 3 analyses offertes × 4 pièces par tenue
    else null             -- pro, styliste : sans limite
  end;
$$;

-- ---------------------------------------------------------------------------
-- Le garde-fou lui-même.
--
-- `effective_plan()` et non la colonne `plan` : celle-ci appartient à Stripe et
-- reste sur « free » pendant un plan offert. La lire seule, ce serait plafonner
-- la garde-robe de quelqu'un à qui l'on vient d'offrir six mois de Styliste.
--
-- Le comptage se fait sous `for update` sur la ligne de profil : deux analyses
-- lancées en même temps compteraient sinon le même total et passeraient toutes
-- les deux au-dessus du plafond.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_wardrobe_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan  text;
  v_limit integer;
  v_count integer;
begin
  -- Verrou sur le profil : sérialise les insertions concurrentes du même
  -- utilisateur, sans bloquer celles des autres.
  select public.effective_plan(p.plan, p.gift_plan, p.gift_plan_until)
    into v_plan
    from public.profiles p
   where p.id = new.user_id
     for update;

  if v_plan is null then
    return new;  -- profil introuvable : ce n'est pas à ce déclencheur de trancher
  end if;

  v_limit := public.plan_wardrobe_limit(v_plan);

  if v_limit is null then
    return new;  -- plan sans limite
  end if;

  select count(*) into v_count
    from public.dressing_items d
   where d.user_id = new.user_id;

  if v_count >= v_limit then
    -- Code 'P0001' + message reconnaissable : l'API le distingue d'une vraie
    -- panne pour afficher le cadenas plutôt qu'une erreur.
    raise exception 'wardrobe_limit_reached'
      using errcode = 'P0001',
            hint = 'Le plan ne permet pas plus de pièces en garde-robe.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_wardrobe_limit on public.dressing_items;

create trigger enforce_wardrobe_limit
  before insert on public.dressing_items
  for each row
  execute function public.enforce_wardrobe_limit();

-- La fonction de plafond est lisible par l'app ; la fonction du déclencheur
-- n'est appelée que par Postgres et n'a besoin d'aucun droit public.
revoke all on function public.enforce_wardrobe_limit() from public, anon, authenticated;
grant execute on function public.plan_wardrobe_limit(text) to authenticated;
