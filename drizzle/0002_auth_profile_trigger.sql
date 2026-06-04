-- ════════════════════════════════════════════════════════════════════════
-- Auto-provision a public.profiles row whenever a Supabase auth user is created.
-- Role comes from signup metadata but is clamped to a self-selectable set —
-- 'admin' can never be granted this way (only via seed / a privileged admin).
-- Runs as SECURITY DEFINER so it can insert under RLS during GoTrue signup.
-- ════════════════════════════════════════════════════════════════════════

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
