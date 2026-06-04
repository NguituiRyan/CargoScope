-- Custom SQL migration file, put your code below! --

-- ─────────────────────────── product media bucket ───────────────────────────
-- PUBLIC bucket — product photos/videos must be readable by anyone browsing
-- the catalogue. Writes and deletes are still restricted to the owning
-- manufacturer. Path convention: <manufacturer_id>/<product_id>/<filename>
-- so the first path segment identifies the owning manufacturer for RLS.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media',
  'product-media',
  true,
  52428800, -- 50 MB ceiling (the app enforces 10 MB images / 50 MB video)
  array[
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/webm'
  ]
)
on conflict (id) do nothing;

-- Anyone may read product media (public catalogue).
drop policy if exists "product media read" on storage.objects;
create policy "product media read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-media');

-- A manufacturer may upload only under their own folder; admins may upload too.
drop policy if exists "product media insert own" on storage.objects;
create policy "product media insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-media'
    and (
      public.is_my_manufacturer((nullif((storage.foldername(name))[1], ''))::uuid)
      or public.is_admin()
    )
  );

drop policy if exists "product media update own" on storage.objects;
create policy "product media update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-media'
    and (
      public.is_my_manufacturer((nullif((storage.foldername(name))[1], ''))::uuid)
      or public.is_admin()
    )
  );

drop policy if exists "product media delete own" on storage.objects;
create policy "product media delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-media'
    and (
      public.is_my_manufacturer((nullif((storage.foldername(name))[1], ''))::uuid)
      or public.is_admin()
    )
  );
