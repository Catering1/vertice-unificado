-- Qualify the Storage object name explicitly. Inside the product lookup,
-- an unqualified `name` resolves to products.name and rejects valid uploads.
DROP POLICY IF EXISTS "product_listing_photos_select_owner" ON storage.objects;
CREATE POLICY "product_listing_photos_select_owner"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'product-listing-photos'
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id::text = (storage.foldername(storage.objects.name))[1]
      AND p.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "product_listing_photos_insert_owner" ON storage.objects;
CREATE POLICY "product_listing_photos_insert_owner"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-listing-photos'
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id::text = (storage.foldername(storage.objects.name))[1]
      AND p.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "product_listing_photos_delete_owner" ON storage.objects;
CREATE POLICY "product_listing_photos_delete_owner"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'product-listing-photos'
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id::text = (storage.foldername(storage.objects.name))[1]
      AND p.user_id = (SELECT auth.uid())
  )
);
