-- Publica apenas o inventário disponível. Nunca devolve custo de compra,
-- fornecedor, lucro ou qualquer outro detalhe do backoffice.
CREATE OR REPLACE FUNCTION public.get_public_store_products()
RETURNS TABLE (
  id UUID,
  title TEXT,
  category TEXT,
  condition TEXT,
  warranty_months INTEGER,
  retail_price NUMERIC,
  image_url TEXT,
  description TEXT,
  stock_quantity BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.name AS title,
    p.category,
    'Verificado'::TEXT AS condition,
    0::INTEGER AS warranty_months,
    COALESCE((SELECT MAX(s.sale_price) FROM public.sales s WHERE s.product_id = p.id), 0)::NUMERIC AS retail_price,
    NULL::TEXT AS image_url,
    NULL::TEXT AS description,
    (COALESCE((SELECT SUM(pu.quantity) FROM public.purchases pu WHERE pu.product_id = p.id), 0) - COALESCE((
      SELECT SUM(s2.quantity) FROM public.sales s2 WHERE s2.product_id = p.id
    ), 0))::BIGINT AS stock_quantity
  FROM public.products p
  WHERE COALESCE((SELECT SUM(pu2.quantity) FROM public.purchases pu2 WHERE pu2.product_id = p.id), 0) - COALESCE((
    SELECT SUM(s3.quantity) FROM public.sales s3 WHERE s3.product_id = p.id
  ), 0) > 0
  ORDER BY p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_store_products() TO anon, authenticated;
