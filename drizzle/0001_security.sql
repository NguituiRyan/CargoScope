-- ════════════════════════════════════════════════════════════════════════
-- CargoScope — security layer (RLS, helper functions, guards, search)
-- Hand-authored. Applied AFTER 0000_init.sql (structural DDL).
--
-- Runs against a Supabase Postgres where the `auth` schema, auth.uid(),
-- and the anon/authenticated/service_role roles already exist.
-- service_role has BYPASSRLS, so trusted server code is unaffected by the
-- policies below.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─────────────────────────── updated_at trigger fn ───────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────── access-control helpers ───────────────────────────
-- All SECURITY DEFINER + STABLE: they read tables while bypassing RLS, which
-- both avoids policy recursion and lets policies reason about related rows.
-- search_path is pinned; auth.uid() is schema-qualified so it still resolves.

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public, pg_catalog as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_manufacturer()
returns boolean language sql stable security definer
set search_path = public, pg_catalog as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'manufacturer'
  );
$$;

create or replace function public.is_my_buyer(_buyer_id uuid)
returns boolean language sql stable security definer
set search_path = public, pg_catalog as $$
  select exists (
    select 1 from buyers b
    where b.id = _buyer_id and b.owner_profile_id = auth.uid()
  );
$$;

create or replace function public.is_my_manufacturer(_manufacturer_id uuid)
returns boolean language sql stable security definer
set search_path = public, pg_catalog as $$
  select exists (
    select 1 from manufacturers m
    where m.id = _manufacturer_id and m.owner_profile_id = auth.uid()
  );
$$;

-- A manufacturer is publicly visible once published AND at least
-- identity-verified (pending/rejected stay hidden from the catalog).
create or replace function public.manufacturer_is_public(_manufacturer_id uuid)
returns boolean language sql stable security definer
set search_path = public, pg_catalog as $$
  select exists (
    select 1 from manufacturers m
    where m.id = _manufacturer_id
      and m.is_published = true
      and m.verification_status in ('identity', 'verified', 'premium')
  );
$$;

create or replace function public.owns_product(_product_id uuid)
returns boolean language sql stable security definer
set search_path = public, pg_catalog as $$
  select exists (
    select 1 from products p
    join manufacturers m on m.id = p.manufacturer_id
    where p.id = _product_id and m.owner_profile_id = auth.uid()
  );
$$;

create or replace function public.product_is_readable(_product_id uuid)
returns boolean language sql stable security definer
set search_path = public, pg_catalog as $$
  select exists (
    select 1 from products p
    where p.id = _product_id
      and (
        (p.status = 'active' and public.manufacturer_is_public(p.manufacturer_id))
        or public.owns_product(p.id)
        or public.is_admin()
      )
  );
$$;

create or replace function public.owns_rfq(_rfq_id uuid)
returns boolean language sql stable security definer
set search_path = public, pg_catalog as $$
  select exists (
    select 1 from rfqs r
    join buyers b on b.id = r.buyer_id
    where r.id = _rfq_id and b.owner_profile_id = auth.uid()
  );
$$;

create or replace function public.can_access_conversation(_conversation_id uuid)
returns boolean language sql stable security definer
set search_path = public, pg_catalog as $$
  select exists (
    select 1 from conversations c
    where c.id = _conversation_id
      and (
        public.is_my_buyer(c.buyer_id)
        or public.is_my_manufacturer(c.manufacturer_id)
        or public.is_admin()
      )
  );
$$;

create or replace function public.can_access_order(_order_id uuid)
returns boolean language sql stable security definer
set search_path = public, pg_catalog as $$
  select exists (
    select 1 from orders o
    where o.id = _order_id
      and (
        public.is_my_buyer(o.buyer_id)
        or public.is_my_manufacturer(o.manufacturer_id)
        or public.is_admin()
      )
  );
$$;

grant execute on function
  public.is_admin(),
  public.is_manufacturer(),
  public.is_my_buyer(uuid),
  public.is_my_manufacturer(uuid),
  public.manufacturer_is_public(uuid),
  public.owns_product(uuid),
  public.product_is_readable(uuid),
  public.owns_rfq(uuid),
  public.can_access_conversation(uuid),
  public.can_access_order(uuid)
to anon, authenticated;

-- ─────────────────────────── privilege guards ───────────────────────────
-- auth.uid() is NULL for service_role / direct owner connections, so these
-- guards only fire for end-user (JWT) sessions and never block trusted
-- server-side writes.

-- Buyers/manufacturers cannot escalate their own role; only admins may.
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer
set search_path = public, pg_catalog as $$
begin
  if auth.uid() is not null
     and not public.is_admin()
     and new.role is distinct from old.role then
    raise exception 'Only admins can change a profile role';
  end if;
  return new;
end;
$$;

-- The verification badge and subscription tier are admin-granted trust
-- signals — a manufacturer must not be able to set them on themselves.
create or replace function public.guard_manufacturer_admin_fields()
returns trigger language plpgsql security definer
set search_path = public, pg_catalog as $$
begin
  if auth.uid() is not null
     and not public.is_admin()
     and (
       new.verification_status is distinct from old.verification_status
       or new.subscription_tier is distinct from old.subscription_tier
     ) then
    raise exception 'Only admins can change verification_status or subscription_tier';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

drop trigger if exists guard_manufacturer_admin_fields on public.manufacturers;
create trigger guard_manufacturer_admin_fields
  before update on public.manufacturers
  for each row execute function public.guard_manufacturer_admin_fields();

-- ─────────────────────────── updated_at triggers (all tables) ───────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','manufacturers','buyers','verifications','categories','products',
    'product_price_tiers','product_media','rfqs','quotes','orders','order_items',
    'conversations','messages','escrow_transactions','group_buys','group_buy_parts',
    'shipments','reviews','subscriptions','landed_cost_estimates','notifications','disputes'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();',
      t
    );
  end loop;
end;
$$;

-- ─────────────────────────── product full-text search ───────────────────────────
-- Generated tsvector + GIN index. Query from Supabase via `.textSearch`.
alter table public.products
  drop column if exists search_vector;

alter table public.products
  add column search_vector tsvector
  generated always as (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(hs_code, '')
    )
  ) stored;

create index if not exists products_search_idx
  on public.products using gin (search_vector);

-- ─────────────────────────── grants ───────────────────────────
grant usage on schema public to anon, authenticated;

-- authenticated may attempt all DML; RLS policies below decide row visibility.
grant select, insert, update, delete on all tables in schema public to authenticated;

-- anon (logged-out visitors) get read-only access to the public catalog.
grant select on
  public.categories,
  public.manufacturers,
  public.products,
  public.product_price_tiers,
  public.product_media,
  public.reviews,
  public.group_buys
to anon;

-- anon may also run (and read back) an anonymous landed-cost estimate.
grant select, insert on public.landed_cost_estimates to anon;

-- ─────────────────────────── enable RLS (all tables) ───────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','manufacturers','buyers','verifications','categories','products',
    'product_price_tiers','product_media','rfqs','quotes','orders','order_items',
    'conversations','messages','escrow_transactions','group_buys','group_buy_parts',
    'shipments','reviews','subscriptions','landed_cost_estimates','notifications','disputes'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════
-- POLICIES (per §10 role matrix)
-- ════════════════════════════════════════════════════════════════════════

-- ── profiles ─────────────────────────────────────────────────────────────
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- ── manufacturers ────────────────────────────────────────────────────────
drop policy if exists manufacturers_select on public.manufacturers;
create policy manufacturers_select on public.manufacturers
  for select to anon, authenticated
  using (
    public.manufacturer_is_public(id)
    or public.is_my_manufacturer(id)
    or public.is_admin()
  );

drop policy if exists manufacturers_insert on public.manufacturers;
create policy manufacturers_insert on public.manufacturers
  for insert to authenticated
  with check (owner_profile_id = auth.uid() or public.is_admin());

drop policy if exists manufacturers_update on public.manufacturers;
create policy manufacturers_update on public.manufacturers
  for update to authenticated
  using (owner_profile_id = auth.uid() or public.is_admin())
  with check (owner_profile_id = auth.uid() or public.is_admin());

drop policy if exists manufacturers_delete on public.manufacturers;
create policy manufacturers_delete on public.manufacturers
  for delete to authenticated
  using (owner_profile_id = auth.uid() or public.is_admin());

-- ── buyers (private) ───────────────────────────────────────────────────────
drop policy if exists buyers_select on public.buyers;
create policy buyers_select on public.buyers
  for select to authenticated
  using (owner_profile_id = auth.uid() or public.is_admin());

drop policy if exists buyers_insert on public.buyers;
create policy buyers_insert on public.buyers
  for insert to authenticated
  with check (owner_profile_id = auth.uid() or public.is_admin());

drop policy if exists buyers_update on public.buyers;
create policy buyers_update on public.buyers
  for update to authenticated
  using (owner_profile_id = auth.uid() or public.is_admin());

drop policy if exists buyers_delete on public.buyers;
create policy buyers_delete on public.buyers
  for delete to authenticated
  using (owner_profile_id = auth.uid() or public.is_admin());

-- ── verifications (admin approves) ─────────────────────────────────────────
drop policy if exists verifications_select on public.verifications;
create policy verifications_select on public.verifications
  for select to authenticated
  using (public.is_my_manufacturer(manufacturer_id) or public.is_admin());

drop policy if exists verifications_insert on public.verifications;
create policy verifications_insert on public.verifications
  for insert to authenticated
  with check (public.is_my_manufacturer(manufacturer_id) or public.is_admin());

drop policy if exists verifications_update on public.verifications;
create policy verifications_update on public.verifications
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists verifications_delete on public.verifications;
create policy verifications_delete on public.verifications
  for delete to authenticated
  using (public.is_admin());

-- ── categories (public read, admin write) ─────────────────────────────────
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select to anon, authenticated
  using (true);

drop policy if exists categories_insert on public.categories;
create policy categories_insert on public.categories
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists categories_update on public.categories;
create policy categories_update on public.categories
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists categories_delete on public.categories;
create policy categories_delete on public.categories
  for delete to authenticated
  using (public.is_admin());

-- ── products ───────────────────────────────────────────────────────────────
drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select to anon, authenticated
  using (
    (status = 'active' and public.manufacturer_is_public(manufacturer_id))
    or public.is_my_manufacturer(manufacturer_id)
    or public.is_admin()
  );

drop policy if exists products_insert on public.products;
create policy products_insert on public.products
  for insert to authenticated
  with check (public.is_my_manufacturer(manufacturer_id) or public.is_admin());

drop policy if exists products_update on public.products;
create policy products_update on public.products
  for update to authenticated
  using (public.is_my_manufacturer(manufacturer_id) or public.is_admin())
  with check (public.is_my_manufacturer(manufacturer_id) or public.is_admin());

drop policy if exists products_delete on public.products;
create policy products_delete on public.products
  for delete to authenticated
  using (public.is_my_manufacturer(manufacturer_id) or public.is_admin());

-- ── product_price_tiers ────────────────────────────────────────────────────
drop policy if exists price_tiers_select on public.product_price_tiers;
create policy price_tiers_select on public.product_price_tiers
  for select to anon, authenticated
  using (public.product_is_readable(product_id));

drop policy if exists price_tiers_insert on public.product_price_tiers;
create policy price_tiers_insert on public.product_price_tiers
  for insert to authenticated
  with check (public.owns_product(product_id) or public.is_admin());

drop policy if exists price_tiers_update on public.product_price_tiers;
create policy price_tiers_update on public.product_price_tiers
  for update to authenticated
  using (public.owns_product(product_id) or public.is_admin())
  with check (public.owns_product(product_id) or public.is_admin());

drop policy if exists price_tiers_delete on public.product_price_tiers;
create policy price_tiers_delete on public.product_price_tiers
  for delete to authenticated
  using (public.owns_product(product_id) or public.is_admin());

-- ── product_media ──────────────────────────────────────────────────────────
drop policy if exists product_media_select on public.product_media;
create policy product_media_select on public.product_media
  for select to anon, authenticated
  using (public.product_is_readable(product_id));

drop policy if exists product_media_insert on public.product_media;
create policy product_media_insert on public.product_media
  for insert to authenticated
  with check (public.owns_product(product_id) or public.is_admin());

drop policy if exists product_media_update on public.product_media;
create policy product_media_update on public.product_media
  for update to authenticated
  using (public.owns_product(product_id) or public.is_admin())
  with check (public.owns_product(product_id) or public.is_admin());

drop policy if exists product_media_delete on public.product_media;
create policy product_media_delete on public.product_media
  for delete to authenticated
  using (public.owns_product(product_id) or public.is_admin());

-- ── rfqs (buyer owns; manufacturers may read open ones to quote) ───────────
drop policy if exists rfqs_select on public.rfqs;
create policy rfqs_select on public.rfqs
  for select to authenticated
  using (
    public.is_my_buyer(buyer_id)
    or public.is_admin()
    or (status in ('open', 'quoting') and public.is_manufacturer())
  );

drop policy if exists rfqs_insert on public.rfqs;
create policy rfqs_insert on public.rfqs
  for insert to authenticated
  with check (public.is_my_buyer(buyer_id) or public.is_admin());

drop policy if exists rfqs_update on public.rfqs;
create policy rfqs_update on public.rfqs
  for update to authenticated
  using (public.is_my_buyer(buyer_id) or public.is_admin())
  with check (public.is_my_buyer(buyer_id) or public.is_admin());

drop policy if exists rfqs_delete on public.rfqs;
create policy rfqs_delete on public.rfqs
  for delete to authenticated
  using (public.is_my_buyer(buyer_id) or public.is_admin());

-- ── quotes (manufacturer submits; buyer of the RFQ may read/accept) ────────
drop policy if exists quotes_select on public.quotes;
create policy quotes_select on public.quotes
  for select to authenticated
  using (
    public.is_my_manufacturer(manufacturer_id)
    or public.owns_rfq(rfq_id)
    or public.is_admin()
  );

drop policy if exists quotes_insert on public.quotes;
create policy quotes_insert on public.quotes
  for insert to authenticated
  with check (public.is_my_manufacturer(manufacturer_id) or public.is_admin());

drop policy if exists quotes_update on public.quotes;
create policy quotes_update on public.quotes
  for update to authenticated
  using (
    public.is_my_manufacturer(manufacturer_id)
    or public.owns_rfq(rfq_id)
    or public.is_admin()
  )
  with check (
    public.is_my_manufacturer(manufacturer_id)
    or public.owns_rfq(rfq_id)
    or public.is_admin()
  );

drop policy if exists quotes_delete on public.quotes;
create policy quotes_delete on public.quotes
  for delete to authenticated
  using (public.is_my_manufacturer(manufacturer_id) or public.is_admin());

-- ── orders ─────────────────────────────────────────────────────────────────
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select to authenticated
  using (
    public.is_my_buyer(buyer_id)
    or public.is_my_manufacturer(manufacturer_id)
    or public.is_admin()
  );

drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders
  for insert to authenticated
  with check (public.is_my_buyer(buyer_id) or public.is_admin());

drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders
  for update to authenticated
  using (
    public.is_my_buyer(buyer_id)
    or public.is_my_manufacturer(manufacturer_id)
    or public.is_admin()
  )
  with check (
    public.is_my_buyer(buyer_id)
    or public.is_my_manufacturer(manufacturer_id)
    or public.is_admin()
  );

drop policy if exists orders_delete on public.orders;
create policy orders_delete on public.orders
  for delete to authenticated
  using (public.is_admin());

-- ── order_items ────────────────────────────────────────────────────────────
drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select to authenticated
  using (public.can_access_order(order_id));

drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items
  for insert to authenticated
  with check (public.can_access_order(order_id));

drop policy if exists order_items_update on public.order_items;
create policy order_items_update on public.order_items
  for update to authenticated
  using (public.can_access_order(order_id))
  with check (public.can_access_order(order_id));

drop policy if exists order_items_delete on public.order_items;
create policy order_items_delete on public.order_items
  for delete to authenticated
  using (public.can_access_order(order_id));

-- ── conversations ──────────────────────────────────────────────────────────
drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations
  for select to authenticated
  using (
    public.is_my_buyer(buyer_id)
    or public.is_my_manufacturer(manufacturer_id)
    or public.is_admin()
  );

drop policy if exists conversations_insert on public.conversations;
create policy conversations_insert on public.conversations
  for insert to authenticated
  with check (
    public.is_my_buyer(buyer_id)
    or public.is_my_manufacturer(manufacturer_id)
    or public.is_admin()
  );

drop policy if exists conversations_update on public.conversations;
create policy conversations_update on public.conversations
  for update to authenticated
  using (
    public.is_my_buyer(buyer_id)
    or public.is_my_manufacturer(manufacturer_id)
    or public.is_admin()
  );

drop policy if exists conversations_delete on public.conversations;
create policy conversations_delete on public.conversations
  for delete to authenticated
  using (public.is_admin());

-- ── messages ───────────────────────────────────────────────────────────────
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated
  using (public.can_access_conversation(conversation_id));

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    public.can_access_conversation(conversation_id)
    and (sender_profile_id = auth.uid() or public.is_admin())
  );

drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages
  for update to authenticated
  using (public.can_access_conversation(conversation_id))
  with check (public.can_access_conversation(conversation_id));

drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages
  for delete to authenticated
  using (sender_profile_id = auth.uid() or public.is_admin());

-- ── escrow_transactions (read by order parties; admin/server writes) ───────
drop policy if exists escrow_select on public.escrow_transactions;
create policy escrow_select on public.escrow_transactions
  for select to authenticated
  using (public.can_access_order(order_id));

drop policy if exists escrow_insert on public.escrow_transactions;
create policy escrow_insert on public.escrow_transactions
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists escrow_update on public.escrow_transactions;
create policy escrow_update on public.escrow_transactions
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists escrow_delete on public.escrow_transactions;
create policy escrow_delete on public.escrow_transactions
  for delete to authenticated
  using (public.is_admin());

-- ── group_buys (public campaigns; manufacturer owner/admin write) ──────────
drop policy if exists group_buys_select on public.group_buys;
create policy group_buys_select on public.group_buys
  for select to anon, authenticated
  using (
    public.manufacturer_is_public(manufacturer_id)
    or public.is_my_manufacturer(manufacturer_id)
    or public.is_admin()
  );

drop policy if exists group_buys_insert on public.group_buys;
create policy group_buys_insert on public.group_buys
  for insert to authenticated
  with check (public.is_my_manufacturer(manufacturer_id) or public.is_admin());

drop policy if exists group_buys_update on public.group_buys;
create policy group_buys_update on public.group_buys
  for update to authenticated
  using (public.is_my_manufacturer(manufacturer_id) or public.is_admin())
  with check (public.is_my_manufacturer(manufacturer_id) or public.is_admin());

drop policy if exists group_buys_delete on public.group_buys;
create policy group_buys_delete on public.group_buys
  for delete to authenticated
  using (public.is_my_manufacturer(manufacturer_id) or public.is_admin());

-- ── group_buy_parts ────────────────────────────────────────────────────────
drop policy if exists group_buy_parts_select on public.group_buy_parts;
create policy group_buy_parts_select on public.group_buy_parts
  for select to authenticated
  using (
    public.is_my_buyer(buyer_id)
    or public.is_admin()
    or exists (
      select 1 from group_buys g
      where g.id = group_buy_id and public.is_my_manufacturer(g.manufacturer_id)
    )
  );

drop policy if exists group_buy_parts_insert on public.group_buy_parts;
create policy group_buy_parts_insert on public.group_buy_parts
  for insert to authenticated
  with check (public.is_my_buyer(buyer_id) or public.is_admin());

drop policy if exists group_buy_parts_update on public.group_buy_parts;
create policy group_buy_parts_update on public.group_buy_parts
  for update to authenticated
  using (public.is_my_buyer(buyer_id) or public.is_admin())
  with check (public.is_my_buyer(buyer_id) or public.is_admin());

drop policy if exists group_buy_parts_delete on public.group_buy_parts;
create policy group_buy_parts_delete on public.group_buy_parts
  for delete to authenticated
  using (public.is_my_buyer(buyer_id) or public.is_admin());

-- ── shipments (read by order parties; admin/server writes) ─────────────────
drop policy if exists shipments_select on public.shipments;
create policy shipments_select on public.shipments
  for select to authenticated
  using (public.can_access_order(order_id));

drop policy if exists shipments_insert on public.shipments;
create policy shipments_insert on public.shipments
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists shipments_update on public.shipments;
create policy shipments_update on public.shipments
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists shipments_delete on public.shipments;
create policy shipments_delete on public.shipments
  for delete to authenticated
  using (public.is_admin());

-- ── reviews (public read; buyer authors) ───────────────────────────────────
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews
  for select to anon, authenticated
  using (true);

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews
  for insert to authenticated
  with check (public.is_my_buyer(buyer_id) or public.is_admin());

drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews
  for update to authenticated
  using (public.is_my_buyer(buyer_id) or public.is_admin())
  with check (public.is_my_buyer(buyer_id) or public.is_admin());

drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews
  for delete to authenticated
  using (public.is_my_buyer(buyer_id) or public.is_admin());

-- ── subscriptions (manufacturer reads own; admin/webhook writes) ───────────
drop policy if exists subscriptions_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions
  for select to authenticated
  using (public.is_my_manufacturer(manufacturer_id) or public.is_admin());

drop policy if exists subscriptions_insert on public.subscriptions;
create policy subscriptions_insert on public.subscriptions
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists subscriptions_update on public.subscriptions;
create policy subscriptions_update on public.subscriptions
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists subscriptions_delete on public.subscriptions;
create policy subscriptions_delete on public.subscriptions
  for delete to authenticated
  using (public.is_admin());

-- ── landed_cost_estimates (own or anonymous) ───────────────────────────────
drop policy if exists landed_cost_select on public.landed_cost_estimates;
create policy landed_cost_select on public.landed_cost_estimates
  for select to anon, authenticated
  using (profile_id = auth.uid() or profile_id is null or public.is_admin());

drop policy if exists landed_cost_insert on public.landed_cost_estimates;
create policy landed_cost_insert on public.landed_cost_estimates
  for insert to anon, authenticated
  with check (profile_id = auth.uid() or profile_id is null or public.is_admin());

drop policy if exists landed_cost_update on public.landed_cost_estimates;
create policy landed_cost_update on public.landed_cost_estimates
  for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

drop policy if exists landed_cost_delete on public.landed_cost_estimates;
create policy landed_cost_delete on public.landed_cost_estimates
  for delete to authenticated
  using (profile_id = auth.uid() or public.is_admin());

-- ── notifications (own only) ────────────────────────────────────────────────
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert to authenticated
  with check (profile_id = auth.uid() or public.is_admin());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete to authenticated
  using (profile_id = auth.uid() or public.is_admin());

-- ── disputes (parties open; admin resolves) ─────────────────────────────────
drop policy if exists disputes_select on public.disputes;
create policy disputes_select on public.disputes
  for select to authenticated
  using (public.can_access_order(order_id));

drop policy if exists disputes_insert on public.disputes;
create policy disputes_insert on public.disputes
  for insert to authenticated
  with check (
    public.can_access_order(order_id)
    and (opened_by = auth.uid() or opened_by is null)
  );

drop policy if exists disputes_update on public.disputes;
create policy disputes_update on public.disputes
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists disputes_delete on public.disputes;
create policy disputes_delete on public.disputes
  for delete to authenticated
  using (public.is_admin());
