-- Custom SQL migration file, put your code below! --

-- ─────────────────────────── RFQ attachments bucket ───────────────────────────
-- PRIVATE bucket for buyer RFQ attachments (images + documents). Reached only
-- through short-lived signed URLs. Path convention: <rfq_id>/<filename>, so the
-- first path segment identifies the RFQ and access mirrors the rfqs table RLS.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rfq-attachments',
  'rfq-attachments',
  false,
  10485760, -- 10 MB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv'
  ]
)
on conflict (id) do nothing;

-- The RFQ owner (buyer) may upload only under their own RFQ folder.
drop policy if exists "rfq attachments insert owner" on storage.objects;
create policy "rfq attachments insert owner" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'rfq-attachments'
    and public.owns_rfq((nullif((storage.foldername(name))[1], ''))::uuid)
  );

-- The owner, or any manufacturer while the RFQ is open/quoting, may read
-- attachments (signed URLs) — mirroring the rfqs_select policy.
drop policy if exists "rfq attachments read" on storage.objects;
create policy "rfq attachments read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'rfq-attachments'
    and (
      public.owns_rfq((nullif((storage.foldername(name))[1], ''))::uuid)
      or (
        public.is_manufacturer()
        and exists (
          select 1 from public.rfqs r
          where r.id = (nullif((storage.foldername(name))[1], ''))::uuid
            and r.status in ('open', 'quoting')
        )
      )
    )
  );

-- The owner may remove their RFQ attachments.
drop policy if exists "rfq attachments delete owner" on storage.objects;
create policy "rfq attachments delete owner" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'rfq-attachments'
    and public.owns_rfq((nullif((storage.foldername(name))[1], ''))::uuid)
  );
