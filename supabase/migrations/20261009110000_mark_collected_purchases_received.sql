-- A collected order is confirmed as received unless it is already in a return/refund state.
UPDATE public.purchases
SET order_status = 'received_verified',
    order_status_updated_at = now()
WHERE collection_date IS NOT NULL
  AND order_status NOT IN ('return_in_progress', 'refund_partial', 'refunded', 'cancelled');
