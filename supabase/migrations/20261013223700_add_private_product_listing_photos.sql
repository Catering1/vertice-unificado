-- Fotos de inspeção usadas apenas para anúncios OLX; o bucket não é público.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-listing-photos',
  'product-listing-photos',
  false,
  26214400,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "product_listing_photos_select_owner" ON storage.objects;
CREATE POLICY "product_listing_photos_select_owner"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'product-listing-photos'
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id::text = (storage.foldername(name))[1]
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
    WHERE p.id::text = (storage.foldername(name))[1]
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
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.user_id = (SELECT auth.uid())
  )
);
