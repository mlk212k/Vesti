-- ---------------------------------------------------------------------------
-- Stockage des preuves (photo de vente, devanture d'un commerce).
--
-- Bucket privé : les photos ne sont jamais servies par une URL publique
-- devinable. L'app génère une URL signée à durée limitée au moment d'afficher
-- l'image (voir lib/storage.ts).
--
-- Convention de chemin : `<user_id>/<uuid>.<ext>`. Le premier segment du
-- chemin EST le propriétaire, ce qui rend la policy triviale à écrire et
-- impossible à contourner — on ne peut pas écrire dans le dossier d'un autre.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'proofs',
  'proofs',
  false,
  5242880, -- 5 Mo
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

create policy "proofs_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "proofs_select_own_or_staff"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_staff()
    )
  );

create policy "proofs_delete_own_or_admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );
