-- Custom SQL migration file, put your code below! --

-- Admin allowlist. Emails listed here are always provisioned and kept as admins
-- with full access (the existing admin RLS policies grant admins everything).
-- This (a) promotes any existing accounts now and (b) auto-grants admin to these
-- emails even if they sign up later. The table is locked down with RLS and no
-- policies, so only the service role and security-definer functions can read or
-- change it — not app users.
create table if not exists public.admin_emails (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.admin_emails enable row level security;

insert into public.admin_emails (email) values
  ('mwangi.kamau@gmail.com'),
  ('johnnmwangi00@gmail.com'),
  ('nguitui.kamau@gmail.com')
on conflict (email) do nothing;

-- Provision allowlisted signups as admin. Otherwise unchanged: role still comes
-- from signup metadata, clamped to buyer/manufacturer.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  desired text := coalesce(new.raw_user_meta_data->>'role', 'buyer');
begin
  if desired not in ('buyer', 'manufacturer') then
    desired := 'buyer';
  end if;

  if exists (
    select 1 from public.admin_emails a where a.email = lower(new.email)
  ) then
    desired := 'admin';
  end if;

  insert into public.profiles (id, role, full_name, locale, country)
  values (
    new.id,
    desired::public.user_role,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    coalesce(nullif(new.raw_user_meta_data->>'locale', ''), 'en'),
    nullif(new.raw_user_meta_data->>'country', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Promote any existing accounts on the allowlist to admin right now.
update public.profiles p
set role = 'admin'
from auth.users u
where u.id = p.id
  and lower(u.email) in (select email from public.admin_emails)
  and p.role is distinct from 'admin';
