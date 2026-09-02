-- Vesti — stockage des photos + enrichissement de la garde-robe
--
-- Objectif : une photo de tenue alimente automatiquement la garde-robe, chaque
-- pièce (chaussures comprises) devenant une fiche avec sa propre vignette.

-- ---------------------------------------------------------------------------
-- Bucket privé. Les photos sont des images de personnes : jamais public, accès
-- uniquement par URL signée à durée courte.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'outfits',
  'outfits',
  false,
  10485760, -- 10 Mo : large pour une photo de téléphone, ferme la porte aux abus
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- Chaque utilisateur est cloisonné dans un dossier portant son id : le premier
-- segment du chemin doit être son uid.
create policy "outfits_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'outfits'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "outfits_select_own_folder" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'outfits'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "outfits_delete_own_folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'outfits'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Fiche produit d'une pièce
-- ---------------------------------------------------------------------------
alter table public.dressing_items
  -- Description observable, toujours renseignée
  add column material text,
  add column pattern text,
  add column fit text,

  -- Marque : uniquement si elle est réellement lisible sur la photo.
  -- `brand_confidence` interdit de présenter une supposition comme un fait.
  add column brand text,
  add column brand_confidence text
    check (brand_confidence in ('logo_visible', 'suppose', 'inconnue'))
    default 'inconnue',

  -- Vignette : au lieu d'une photo catalogue (qu'on n'a pas), on recadre la
  -- pièce dans la photo de l'utilisateur. Boîte en pourcentages de l'image
  -- d'origine, appliquée en CSS — aucun retraitement d'image serveur.
  add column source_image_path text,
  add column crop_box jsonb,

  -- Produits réels trouvés par recherche web. Présentés comme « pièces
  -- similaires », jamais comme la référence exacte de l'utilisateur.
  add column product_matches jsonb not null default '[]'::jsonb,

  -- Confiance globale de la détection (0-100)
  add column confidence integer check (confidence between 0 and 100);

comment on column public.dressing_items.brand_confidence is
  'logo_visible = marque lue sur la photo ; suppose = hypothèse à afficher comme telle ; inconnue = non identifiable.';
comment on column public.dressing_items.product_matches is
  'Résultats de recherche web vérifiés. Ne jamais y écrire une référence produit issue du seul modèle : elle serait inventée.';
