-- A entrega Vinted torna a unidade visível como disponível para interesse,
-- mantendo separada a confirmação da receção física e a elegibilidade para venda.
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
      coalesce(sum(quantity) FILTER (WHERE order_status = 'delivered'), 0)::bigint AS delivered,
      coalesce(sum(quantity) FILTER (WHERE order_status IN ('ordered', 'shipped', 'electronic_verification', 'delivered')), 0)::bigint AS incoming
    FROM remaining GROUP BY product_id
  )
  SELECT p.id, p.name, p.category, p.condition, p.warranty_months, p.retail_price,
    nullif(p.photo_urls[1], ''), p.description, p.specifications, p.photo_urls,
    t.received + t.incoming,
    CASE
      WHEN t.received > 0 THEN 'available'
      WHEN t.delivered > 0 THEN 'delivered'
      ELSE 'coming_soon'
    END
  FROM public.products p JOIN totals t ON t.product_id = p.id
  WHERE p.inventory_use = 'business' AND lower(trim(p.category)) <> 'livros'
    AND t.received + t.incoming > 0
  ORDER BY CASE WHEN t.received + t.delivered > 0 THEN 0 ELSE 1 END, p.created_at DESC;
$function$;

REVOKE ALL ON FUNCTION public.get_public_store_products() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_store_products() TO anon, authenticated;
