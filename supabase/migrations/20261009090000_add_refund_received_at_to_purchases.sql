alter table public.purchases
  add column if not exists refund_received_at timestamptz;

comment on column public.purchases.refund_received_at is
  'Private confirmation timestamp indicating the refund was received; confirmed refunds are excluded from dashboard metrics.';
