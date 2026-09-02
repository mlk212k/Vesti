-- Vesti — Row Level Security
--
-- Principe : le client ne peut QUE lire ses propres lignes. Toute écriture
-- qui a une conséquence (plan, quota, analyses, abonnement) passe soit par le
-- service_role côté serveur, soit par une fonction SECURITY DEFINER contrôlée.

alter table public.profiles       enable row level security;
alter table public.analyses       enable row level security;
alter table public.dressing_items enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.stripe_events  enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (auth.uid() = id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ⚠️ Point de sécurité central : RLS filtre par LIGNE, jamais par COLONNE.
-- Avec la seule policy ci-dessus, n'importe quel utilisateur pourrait faire
--   update profiles set plan = 'styliste', analyses_used = 0 where id = <soi>
-- et s'offrir le plan payant + un quota infini depuis le navigateur.
-- On coupe donc l'UPDATE global et on ne rouvre que les colonnes d'onboarding.
revoke update on public.profiles from anon, authenticated;
grant update (gender, height_cm, morphology, style_prefs, onboarded_at)
  on public.profiles to authenticated;

-- Les colonnes plan / analyses_used / period_start / stripe_customer_id ne sont
-- donc écrivables que par le service_role (webhook Stripe) et par les fonctions
-- SECURITY DEFINER de 0003_quota_rpc.sql.

-- ---------------------------------------------------------------------------
-- analyses : lecture seule côté client, écriture par la route API (service_role)
-- ---------------------------------------------------------------------------
create policy analyses_select_own on public.analyses
  for select to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.analyses from anon, authenticated;

-- ---------------------------------------------------------------------------
-- dressing_items : idem
-- ---------------------------------------------------------------------------
create policy dressing_items_select_own on public.dressing_items
  for select to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.dressing_items from anon, authenticated;

-- ---------------------------------------------------------------------------
-- subscriptions : lecture seule (affichage du plan), écriture par le webhook
-- ---------------------------------------------------------------------------
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.subscriptions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- stripe_events : purement interne, aucune policy => invisible au client
-- ---------------------------------------------------------------------------
revoke all on public.stripe_events from anon, authenticated;
