-- Custom SQL migration file, put your code below! --

-- Grants shopbuddy@gmail.com full admin access (blog/CMS included) through the
-- existing allowlist from 0015: the handle_new_user trigger already promotes
-- allowlisted emails on signup, so this only adds the email and promotes the
-- account if it already exists.
insert into public.admin_emails (email) values
  ('shopbuddy@gmail.com')
on conflict (email) do nothing;

-- Promote any existing accounts on the allowlist to admin right now.
update public.profiles p
set role = 'admin'
from auth.users u
where u.id = p.id
  and lower(u.email) in (select email from public.admin_emails)
  and p.role is distinct from 'admin';
