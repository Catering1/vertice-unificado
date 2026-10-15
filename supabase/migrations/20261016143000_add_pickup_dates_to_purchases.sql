alter table public.purchases
  add column if not exists pickup_available_date date,
  add column if not exists pickup_deadline date;

