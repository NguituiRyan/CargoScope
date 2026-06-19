-- Custom SQL migration file, put your code below! --

-- Open listing: a supplier is publicly visible once PUBLISHED — verification is
-- now a trust BADGE, not a gate. Only 'rejected' (admin takedown) stays hidden,
-- so admins can still remove substandard storefronts after the fact. This is
-- the security-definer function behind the public product/manufacturer RLS, so
-- changing it here updates visibility everywhere consistently.
create or replace function public.manufacturer_is_public(_manufacturer_id uuid)
returns boolean language sql stable security definer
set search_path = public, pg_catalog as $$
  select exists (
    select 1 from manufacturers m
    where m.id = _manufacturer_id
      and m.is_published = true
      and m.verification_status <> 'rejected'
  );
$$;

-- Publish existing suppliers who already have active products (e.g. test
-- accounts) so they go live immediately under the new rule. New suppliers are
-- auto-published when they save their company profile.
update public.manufacturers m
set is_published = true
where m.is_published = false
  and m.verification_status <> 'rejected'
  and exists (
    select 1 from products p
    where p.manufacturer_id = m.id and p.status = 'active'
  );
