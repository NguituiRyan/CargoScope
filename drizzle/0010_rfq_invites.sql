-- Custom SQL migration file, put your code below! --

-- RFQ supplier invites. When an RFQ has rows here, it is "invite-only": the
-- app shows/accepts it for invited suppliers only (gated in the RFQ reads and
-- the quote action). With no rows, the RFQ is broadcast to all verified
-- suppliers, the existing behaviour.
create table if not exists public.rfq_invites (
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  manufacturer_id uuid not null references public.manufacturers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (rfq_id, manufacturer_id)
);

create index if not exists rfq_invites_manufacturer_idx
  on public.rfq_invites(manufacturer_id);

alter table public.rfq_invites enable row level security;

-- The RFQ owner manages invites; an invited manufacturer can see their own row.
drop policy if exists rfq_invites_select on public.rfq_invites;
create policy rfq_invites_select on public.rfq_invites
  for select to authenticated
  using (
    public.owns_rfq(rfq_id)
    or public.is_my_manufacturer(manufacturer_id)
    or public.is_admin()
  );

drop policy if exists rfq_invites_insert on public.rfq_invites;
create policy rfq_invites_insert on public.rfq_invites
  for insert to authenticated
  with check (public.owns_rfq(rfq_id) or public.is_admin());

drop policy if exists rfq_invites_delete on public.rfq_invites;
create policy rfq_invites_delete on public.rfq_invites
  for delete to authenticated
  using (public.owns_rfq(rfq_id) or public.is_admin());
