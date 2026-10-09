-- Every sale must identify the purchase record whose units it consumed.
ALTER TABLE public.sales
  ALTER COLUMN purchase_id SET NOT NULL;
