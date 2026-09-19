-- Informação comercial recolhida ao registar uma compra. Estes campos são seguros
-- para exposição na montra pública; o custo e o fornecedor continuam privados.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS retail_price NUMERIC NOT NULL DEFAULT 0 CHECK (retail_price >= 0),
  ADD COLUMN IF NOT EXISTS condition TEXT NOT NULL DEFAULT 'Verificado',
  ADD COLUMN IF NOT EXISTS warranty_months INTEGER NOT NULL DEFAULT 0 CHECK (warranty_months BETWEEN 0 AND 120),
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS specifications TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

DROP FUNCTION IF EXISTS public.get_public_store_products();

CREATE FUNCTION public.get_public_store_products()
RETURNS TABLE (
  id UUID,
  title TEXT,
  category TEXT,
  condition TEXT,
  warranty_months INTEGER,
  retail_price NUMERIC,
  image_url TEXT,
  description TEXT,
  specifications TEXT,
  photo_urls TEXT[],
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
    p.condition,
    p.warranty_months,
    p.retail_price,
    NULLIF(p.photo_urls[1], '') AS image_url,
    p.description,
    p.specifications,
    p.photo_urls,
    (COALESCE((SELECT SUM(pu.quantity) FROM public.purchases pu WHERE pu.product_id = p.id), 0) - COALESCE((
      SELECT SUM(s2.quantity) FROM public.sales s2 WHERE s2.product_id = p.id
    ), 0))::BIGINT AS stock_quantity
  FROM public.products p
  WHERE COALESCE((SELECT SUM(pu2.quantity) FROM public.purchases pu2 WHERE pu2.product_id = p.id), 0) - COALESCE((
    SELECT SUM(s3.quantity) FROM public.sales s3 WHERE s3.product_id = p.id
  ), 0) > 0
  ORDER BY p.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_public_store_products() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_store_products() TO anon, authenticated;
