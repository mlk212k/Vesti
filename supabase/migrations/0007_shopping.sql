-- Vesti — recommandations d'achat (plan Styliste)
--
-- Les manques repérés lors d'un scan de dressing deviennent des lignes
-- durables. Deux raisons de les sortir du JSON de l'analyse :
--   1. un même manque revient d'un scan à l'autre — on veut le dédoublonner ;
--   2. la recherche de produits est facturée à l'usage, donc son résultat doit
--      être stocké et non refait à chaque affichage de la page.

create table public.shopping_suggestions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  analysis_id   uuid references public.analyses (id) on delete set null,

  item          text not null,
  -- Colonne générée plutôt qu'un index sur `lower(item)` : l'upsert de
  -- PostgREST ne sait cibler que des colonnes réelles, pas une expression.
  item_key      text generated always as (lower(item)) stored,
  why           text,
  priority      text not null default 'moyenne'
                check (priority in ('haute', 'moyenne', 'basse')),
  occasion      text,

  -- Produits réels issus de la recherche web. `searched_at` distingue « jamais
  -- cherché » (null) de « cherché sans résultat » (liste vide) : sans lui, on
  -- relancerait indéfiniment une recherche qui ne donne rien.
  product_matches jsonb not null default '[]'::jsonb,
  searched_at     timestamptz,

  dismissed_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index shopping_suggestions_user_idx
  on public.shopping_suggestions (user_id, created_at desc);

-- Clé de dédoublonnage : le même manque, formulé pareil, n'apparaît qu'une fois
-- par utilisateur, quel que soit le nombre de scans.
create unique index shopping_suggestions_unique_item
  on public.shopping_suggestions (user_id, item_key);

-- ---------------------------------------------------------------------------
-- RLS : lecture de ses propres suggestions. L'écriture passe par le serveur
-- (insertion après un scan, recherche produit), sauf le rejet d'une suggestion
-- que l'utilisateur doit pouvoir faire lui-même.
-- ---------------------------------------------------------------------------
alter table public.shopping_suggestions enable row level security;

create policy shopping_select_own on public.shopping_suggestions
  for select to authenticated
  using (auth.uid() = user_id);

create policy shopping_update_own on public.shopping_suggestions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke insert, delete on public.shopping_suggestions from anon, authenticated;
revoke update on public.shopping_suggestions from anon, authenticated;

-- Seule colonne que le client peut écrire : masquer une suggestion. Il ne doit
-- pas pouvoir se fabriquer des liens produits ni modifier ceux qui viennent de
-- la recherche vérifiée.
grant update (dismissed_at) on public.shopping_suggestions to authenticated;
