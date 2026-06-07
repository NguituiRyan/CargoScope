-- Custom SQL migration file, put your code below! --

-- Private supplier contact details (WeChat, WhatsApp, phone, email, website).
-- Visible ONLY to the owning manufacturer and admins — NEVER to buyers — so
-- buyers can't take the relationship off-platform. Enforced by RLS: there is no
-- policy granting anon/other-authenticated access, so those reads are denied.
create table if not exists public.manufacturer_contacts (
  manufacturer_id uuid primary key references public.manufacturers(id) on delete cascade,
  wechat text,
  whatsapp text,
  phone text,
  contact_email text,
  website text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
--> statement-breakpoint
alter table public.manufacturer_contacts enable row level security;
--> statement-breakpoint
drop policy if exists "manufacturer_contacts select own" on public.manufacturer_contacts;
create policy "manufacturer_contacts select own" on public.manufacturer_contacts
  for select to authenticated
  using (public.is_my_manufacturer(manufacturer_id) or public.is_admin());
--> statement-breakpoint
drop policy if exists "manufacturer_contacts insert own" on public.manufacturer_contacts;
create policy "manufacturer_contacts insert own" on public.manufacturer_contacts
  for insert to authenticated
  with check (public.is_my_manufacturer(manufacturer_id) or public.is_admin());
--> statement-breakpoint
drop policy if exists "manufacturer_contacts update own" on public.manufacturer_contacts;
create policy "manufacturer_contacts update own" on public.manufacturer_contacts
  for update to authenticated
  using (public.is_my_manufacturer(manufacturer_id) or public.is_admin())
  with check (public.is_my_manufacturer(manufacturer_id) or public.is_admin());
--> statement-breakpoint
drop trigger if exists manufacturer_contacts_updated_at on public.manufacturer_contacts;
--> statement-breakpoint
create trigger manufacturer_contacts_updated_at before update on public.manufacturer_contacts
  for each row execute function public.set_updated_at();
