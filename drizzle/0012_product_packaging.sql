-- Custom SQL migration file, put your code below! --

-- Supplier-declared packaging per unit, used for buyer shipping estimates
-- (consolidated air is charged per kg, sea per CBM). Buyers no longer enter
-- these; missing values fall back to standard courier-packaging estimates.
alter table public.products
  add column if not exists unit_weight_kg numeric(10,3),
  add column if not exists unit_volume_cbm numeric(10,4);
