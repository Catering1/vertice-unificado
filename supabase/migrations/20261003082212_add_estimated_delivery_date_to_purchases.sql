alter table public.purchases
  add column if not exists estimated_delivery_date date;
