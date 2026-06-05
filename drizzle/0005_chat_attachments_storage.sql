-- Custom SQL migration file, put your code below! --

-- ─────────────────────────── chat attachments bucket ───────────────────────────
-- PRIVATE bucket for buyer↔manufacturer message attachments (images + PDFs).
-- Never public: files are reached only through short-lived signed URLs minted
-- for conversation participants. Path convention:
--   <conversation_id>/<filename>
-- so the first path segment identifies the conversation, and access reuses the
-- same can_access_conversation() guard that protects the messages table.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  10485760, -- 10 MB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf'
  ]
)
on conflict (id) do nothing;

-- A participant (buyer, manufacturer, or admin) may upload only under a
-- conversation folder they can access.
drop policy if exists "chat attachments insert participant" on storage.objects;
create policy "chat attachments insert participant" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and public.can_access_conversation((nullif((storage.foldername(name))[1], ''))::uuid)
  );

-- Participants may read attachments in their own conversations (signed URLs).
drop policy if exists "chat attachments read participant" on storage.objects;
create policy "chat attachments read participant" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and public.can_access_conversation((nullif((storage.foldername(name))[1], ''))::uuid)
  );

-- Participants may remove attachments in their own conversations.
drop policy if exists "chat attachments delete participant" on storage.objects;
create policy "chat attachments delete participant" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'chat-attachments'
    and public.can_access_conversation((nullif((storage.foldername(name))[1], ''))::uuid)
  );
