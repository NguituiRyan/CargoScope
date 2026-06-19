-- Custom SQL migration file, put your code below! --

-- Widen packaging-volume precision so tiny single-unit items can be stored
-- accurately. numeric(10,4) rounded anything below 0.0001 CBM away — a single
-- phone pouch is ~0.00008 CBM. numeric(12,6) keeps six decimals.
alter table public.products
  alter column unit_volume_cbm type numeric(12,6);
