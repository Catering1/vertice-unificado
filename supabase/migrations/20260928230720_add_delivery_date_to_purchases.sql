alter table public.purchases
  add column if not exists delivery_date date;
