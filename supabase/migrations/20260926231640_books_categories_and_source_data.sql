BEGIN;
ALTER TABLE public.products
  ALTER COLUMN purchase_price DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS inventory_use text NOT NULL DEFAULT 'business' CHECK (inventory_use IN ('business','personal')),
  ADD COLUMN IF NOT EXISTS store_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS source_ref text,
  ADD COLUMN IF NOT EXISTS source_data jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS products_user_source_ref ON public.products(user_id,source_ref);
ALTER TABLE public.purchases ALTER COLUMN price DROP NOT NULL, ALTER COLUMN date DROP NOT NULL, ADD COLUMN IF NOT EXISTS source_ref text;
ALTER TABLE public.sales ALTER COLUMN profit DROP NOT NULL, ALTER COLUMN date DROP NOT NULL, ADD COLUMN IF NOT EXISTS source_ref text;
CREATE UNIQUE INDEX IF NOT EXISTS purchases_user_source_ref ON public.purchases(user_id,source_ref);
CREATE UNIQUE INDEX IF NOT EXISTS sales_user_source_ref ON public.sales(user_id,source_ref);

CREATE TABLE IF NOT EXISTS public.expenses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 category text NOT NULL,
 description text NOT NULL,
 amount numeric NOT NULL CHECK(amount >= 0),
 date date,
 source_ref text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,source_ref)
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='expenses' AND policyname='Owner manages expenses') THEN
    CREATE POLICY "Owner manages expenses" ON public.expenses FOR ALL TO authenticated
      USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
  END IF;
END $$;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.expenses TO authenticated;
REVOKE ALL ON public.expenses FROM anon;

-- Preserve the existing public contract, while keeping personal/private imports out.
CREATE OR REPLACE FUNCTION public.get_public_store_products()
RETURNS TABLE(id uuid,title text,category text,condition text,warranty_months integer,
 retail_price numeric,image_url text,description text,specifications text,photo_urls text[],stock_quantity bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
 SELECT p.id,p.name,p.category,p.condition,p.warranty_months,p.retail_price,
 NULLIF(p.photo_urls[1],''),p.description,p.specifications,p.photo_urls,
 (COALESCE(pu.qty,0)-COALESCE(sa.qty,0))::bigint
 FROM public.products p
 LEFT JOIN (SELECT product_id,SUM(quantity) qty FROM public.purchases GROUP BY product_id) pu ON pu.product_id=p.id
 LEFT JOIN (SELECT product_id,SUM(quantity) qty FROM public.sales GROUP BY product_id) sa ON sa.product_id=p.id
 WHERE p.store_visible AND p.inventory_use='business' AND COALESCE(pu.qty,0)-COALESCE(sa.qty,0)>0
 ORDER BY p.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_public_store_products() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_store_products() TO anon,authenticated;
COMMIT;
