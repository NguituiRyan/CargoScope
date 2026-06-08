-- Custom SQL migration file, put your code below! --

-- Forensic audit trail for critical actions (vetting decisions, manufacturer
-- status changes, quote acceptances, and — later — payments). Admin-readable
-- only; written server-side with the service role, so there is NO insert policy
-- and users cannot forge entries.
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
--> statement-breakpoint
alter table public.audit_log enable row level security;
--> statement-breakpoint
drop policy if exists "audit_log admin read" on public.audit_log;
--> statement-breakpoint
create policy "audit_log admin read" on public.audit_log
  for select to authenticated
  using (public.is_admin());
--> statement-breakpoint
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
