-- Public stock must consume sales from their own purchase, not hide an entire product.
CREATE OR REPLACE FUNCTION public.get_public_store_products()
RETURNS TABLE (
  id uuid, title text, category text, condition text, warranty_months integer,
  retail_price numeric, image_url text, description text, specifications text,
  photo_urls text[], stock_quantity bigint, availability_status text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $function$
  WITH sold AS (
    SELECT purchase_id, sum(quantity)::bigint AS quantity
    FROM public.sales GROUP BY purchase_id
  ), remaining AS (
    SELECT p.product_id, p.order_status,
      greatest(p.quantity - coalesce(s.quantity, 0), 0)::bigint AS quantity
    FROM public.purchases p
    LEFT JOIN sold s ON s.purchase_id = p.id
    WHERE p.refund_received_at IS NULL
      AND p.order_status IN ('not_tracked', 'received_verified', 'ordered', 'shipped', 'electronic_verification', 'delivered')
  ), totals AS (
    SELECT product_id,
      coalesce(sum(quantity) FILTER (WHERE order_status IN ('not_tracked', 'received_verified')), 0)::bigint AS received,
      coalesce(sum(quantity) FILTER (WHERE order_status IN ('ordered', 'shipped', 'electronic_verification', 'delivered')), 0)::bigint AS incoming
    FROM remaining GROUP BY product_id
  )
  SELECT p.id, p.name, p.category, p.condition, p.warranty_months, p.retail_price,
    nullif(p.photo_urls[1], ''), p.description, p.specifications, p.photo_urls,
    t.received + t.incoming,
    CASE WHEN t.received > 0 THEN 'available' ELSE 'coming_soon' END
  FROM public.products p JOIN totals t ON t.product_id = p.id
  WHERE p.inventory_use = 'business' AND lower(trim(p.category)) <> 'livros'
    AND t.received + t.incoming > 0
  ORDER BY CASE WHEN t.received > 0 THEN 0 ELSE 1 END, p.created_at DESC;
$function$;

-- This is an intentional public projection; private order/cost fields remain behind RLS.
REVOKE ALL ON FUNCTION public.get_public_store_products() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_store_products() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_sale_purchase()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $function$
DECLARE
  selected_purchase public.purchases%ROWTYPE;
  already_sold integer;
  requires_receipt boolean;
BEGIN
  IF NEW.purchase_id IS NULL THEN
    RAISE EXCEPTION 'Selecione a compra específica deste artigo.';
  END IF;
  SELECT * INTO selected_purchase FROM public.purchases
  WHERE id = NEW.purchase_id AND user_id = NEW.user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'A compra selecionada não existe para este utilizador.';
  END IF;
  IF selected_purchase.product_id <> NEW.product_id THEN
    RAISE EXCEPTION 'A venda tem de usar o artigo da compra selecionada.';
  END IF;
  requires_receipt := TG_OP = 'INSERT';
  IF TG_OP = 'UPDATE' THEN
    requires_receipt := OLD.purchase_id IS DISTINCT FROM NEW.purchase_id OR NEW.quantity > OLD.quantity;
  END IF;
  IF requires_receipt AND (
    selected_purchase.order_status NOT IN ('not_tracked', 'received_verified')
    OR selected_purchase.refund_received_at IS NOT NULL
    OR NOT EXISTS (SELECT 1 FROM public.products WHERE id = NEW.product_id AND inventory_use = 'business')
  ) THEN
    RAISE EXCEPTION 'Confirme a receção do artigo antes de registar a venda.';
  END IF;
  SELECT coalesce(sum(quantity), 0)::integer INTO already_sold
  FROM public.sales WHERE purchase_id = NEW.purchase_id AND id IS DISTINCT FROM NEW.id;
  IF already_sold + NEW.quantity > selected_purchase.quantity THEN
    RAISE EXCEPTION 'A compra selecionada não tem unidades suficientes.';
  END IF;
  RETURN NEW;
END;
$function$;
