alter table public.purchases
  add column if not exists order_status text not null default 'not_tracked',
  add column if not exists order_reference text,
  add column if not exists order_status_note text,
  add column if not exists order_status_updated_at timestamptz;

alter table public.purchases
  add constraint purchases_order_status_check
  check (order_status in (
    'not_tracked',
    'ordered',
    'shipped',
    'electronic_verification',
    'delivered',
    'received_verified',
    'return_in_progress',
    'refund_partial',
    'refunded',
    'cancelled'
  ));

alter table public.purchases
  add constraint purchases_order_reference_length_check
  check (order_reference is null or char_length(order_reference) <= 200);

alter table public.purchases
  add constraint purchases_order_status_note_length_check
  check (order_status_note is null or char_length(order_status_note) <= 1000);
