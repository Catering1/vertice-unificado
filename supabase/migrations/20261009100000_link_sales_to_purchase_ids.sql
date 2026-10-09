-- A sale consumes a specific purchase row, preserving per-unit inventory identity.
ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_id_user_id_key UNIQUE (id, user_id);

ALTER TABLE public.sales
  ADD COLUMN purchase_id uuid;

-- Existing sales are linked only when there is exactly one purchase row for the
-- product and the sold quantity fits that purchase. Ambiguous records stay null.
WITH purchase_totals AS (
  SELECT product_id, count(*) AS row_count, min(id::text)::uuid AS purchase_id, sum(quantity) AS quantity
  FROM public.purchases
  GROUP BY product_id
), sales_totals AS (
  SELECT product_id, sum(quantity) AS quantity
  FROM public.sales
  GROUP BY product_id
)
UPDATE public.sales AS sale
SET purchase_id = purchase_totals.purchase_id
FROM purchase_totals
JOIN sales_totals USING (product_id)
WHERE sale.product_id = purchase_totals.product_id
  AND purchase_totals.row_count = 1
  AND sales_totals.quantity <= purchase_totals.quantity;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_purchase_id_user_id_fkey
  FOREIGN KEY (purchase_id, user_id)
  REFERENCES public.purchases (id, user_id)
  ON DELETE RESTRICT;

CREATE INDEX sales_purchase_id_idx ON public.sales (purchase_id) WHERE purchase_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_sale_purchase()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  selected_purchase public.purchases%ROWTYPE;
  already_sold integer;
BEGIN
  IF NEW.purchase_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO selected_purchase
  FROM public.purchases
  WHERE id = NEW.purchase_id AND user_id = NEW.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'A compra selecionada não existe para este utilizador.';
  END IF;
  IF selected_purchase.product_id <> NEW.product_id THEN
    RAISE EXCEPTION 'A venda tem de usar o artigo da compra selecionada.';
  END IF;

  SELECT COALESCE(sum(quantity), 0)::integer INTO already_sold
  FROM public.sales
  WHERE purchase_id = NEW.purchase_id
    AND id IS DISTINCT FROM NEW.id;

  IF already_sold + NEW.quantity > selected_purchase.quantity THEN
    RAISE EXCEPTION 'A compra selecionada não tem unidades suficientes.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sales_validate_purchase
BEFORE INSERT OR UPDATE OF purchase_id, product_id, quantity, user_id
ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.validate_sale_purchase();

COMMENT ON COLUMN public.sales.purchase_id IS
  'Purchase row whose specific units were consumed by this sale.';
