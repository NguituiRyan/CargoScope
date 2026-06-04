-- Custom SQL migration file, put your code below! --

-- ─────────────────────────── verification documents bucket ───────────────────────────
-- Private bucket for business licences / identity docs. Never public.
-- Path convention: <manufacturer_id>/<group>/<filename> so the first path
-- segment identifies the owning manufacturer for RLS.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-docs',
  'verification-docs',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- A manufacturer may upload/read/remove only objects under their own folder;
-- admins may read any verification document (to review them).
drop policy if exists "verification docs insert own" on storage.objects;
create policy "verification docs insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'verification-docs'
    and public.is_my_manufacturer((nullif((storage.foldername(name))[1], ''))::uuid)
  );

drop policy if exists "verification docs read own or admin" on storage.objects;
create policy "verification docs read own or admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and (
      public.is_my_manufacturer((nullif((storage.foldername(name))[1], ''))::uuid)
      or public.is_admin()
    )
  );

drop policy if exists "verification docs delete own" on storage.objects;
create policy "verification docs delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'verification-docs'
    and public.is_my_manufacturer((nullif((storage.foldername(name))[1], ''))::uuid)
  );

-- ─────────────────────────── manufacturer INSERT guard ───────────────────────────
-- guard_manufacturer_admin_fields only fires on UPDATE, so without this a
-- self-service manufacturer could INSERT a row already marked premium/published.
-- Force trust-signal fields to safe defaults for any non-admin insert.
create or replace function public.guard_manufacturer_insert()
returns trigger language plpgsql security definer
set search_path = public, pg_catalog as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.verification_status := 'pending';
    new.subscription_tier := 'none';
    new.is_published := false;
    new.member_since := null;
    new.response_rate := null;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_manufacturer_insert on public.manufacturers;
create trigger guard_manufacturer_insert
  before insert on public.manufacturers
  for each row execute function public.guard_manufacturer_insert();
