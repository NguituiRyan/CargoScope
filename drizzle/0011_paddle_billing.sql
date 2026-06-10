-- Custom SQL migration file, put your code below! --

-- Paddle subscription linkage on manufacturers. The webhook flips
-- subscription_tier from the subscribed price; these columns let it find the
-- right manufacturer and power the billing portal. They are never exposed in
-- public selects, and only the service-role webhook writes them.
alter table public.manufacturers
  add column if not exists paddle_customer_id text,
  add column if not exists paddle_subscription_id text,
  add column if not exists subscription_status text;

create index if not exists manufacturers_paddle_sub_idx
  on public.manufacturers(paddle_subscription_id);
