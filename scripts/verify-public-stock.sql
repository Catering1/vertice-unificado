BEGIN;
DO $test$
DECLARE
  owner_id uuid;
  product_id uuid := gen_random_uuid();
  received_id uuid := gen_random_uuid();
  incoming_id uuid := gen_random_uuid();
  sale_id uuid := gen_random_uuid();
  listing record;
BEGIN
  SELECT user_id INTO owner_id FROM public.products LIMIT 1;
  INSERT INTO public.products (id,user_id,name,category,purchase_price,supplier,inventory_use,retail_price)
  VALUES (product_id,owner_id,'AUDIT ROLLBACK ONLY','Eletrónica',100,'','business',150);
  INSERT INTO public.purchases (id,user_id,product_id,quantity,price,date,order_status)
  VALUES (received_id,owner_id,product_id,3,100,'2026-10-09','received_verified'),
         (incoming_id,owner_id,product_id,1,100,'2026-10-09','shipped');
  SELECT * INTO listing FROM public.get_public_store_products() p WHERE p.id=product_id;
  IF listing.stock_quantity IS DISTINCT FROM 4::bigint OR listing.availability_status <> 'available' THEN
    RAISE EXCEPTION 'Initial received plus incoming inventory mismatch';
  END IF;
  INSERT INTO public.sales (id,user_id,product_id,purchase_id,quantity,sale_price,profit,date)
  VALUES (sale_id,owner_id,product_id,received_id,1,150,50,'2026-10-09');
  SELECT * INTO listing FROM public.get_public_store_products() p WHERE p.id=product_id;
  IF listing.stock_quantity IS DISTINCT FROM 3::bigint THEN RAISE EXCEPTION 'Partial sale hides remaining stock'; END IF;
  UPDATE public.sales SET sale_price=160,profit=60 WHERE id=sale_id;
  BEGIN
    INSERT INTO public.sales (user_id,product_id,purchase_id,quantity,sale_price,profit,date)
    VALUES (owner_id,product_id,received_id,3,150,150,'2026-10-09');
    RAISE EXCEPTION 'Overselling was allowed';
  EXCEPTION WHEN OTHERS THEN
    IF position('unidades suficientes' in SQLERRM)=0 THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO public.sales (user_id,product_id,purchase_id,quantity,sale_price,profit,date)
    VALUES (owner_id,product_id,incoming_id,1,150,50,'2026-10-09');
    RAISE EXCEPTION 'Incoming sale was allowed';
  EXCEPTION WHEN OTHERS THEN
    IF position('receção' in SQLERRM)=0 THEN RAISE; END IF;
  END;
  INSERT INTO public.sales (user_id,product_id,purchase_id,quantity,sale_price,profit,date)
  VALUES (owner_id,product_id,received_id,2,150,100,'2026-10-09');
  SELECT * INTO listing FROM public.get_public_store_products() p WHERE p.id=product_id;
  IF listing.stock_quantity IS DISTINCT FROM 1::bigint OR listing.availability_status <> 'coming_soon' THEN
    RAISE EXCEPTION 'Sold receipt consumed incoming unit';
  END IF;
  UPDATE public.products SET inventory_use='personal' WHERE id=product_id;
  IF EXISTS(SELECT 1 FROM public.get_public_store_products() p WHERE p.id=product_id) THEN RAISE EXCEPTION 'Personal inventory public'; END IF;
  UPDATE public.products SET inventory_use='business',category='Livros' WHERE id=product_id;
  IF EXISTS(SELECT 1 FROM public.get_public_store_products() p WHERE p.id=product_id) THEN RAISE EXCEPTION 'Books public'; END IF;
  UPDATE public.products SET category='Eletrónica' WHERE id=product_id;
  UPDATE public.purchases SET order_status='cancelled' WHERE id=incoming_id;
  IF EXISTS(SELECT 1 FROM public.get_public_store_products() p WHERE p.id=product_id) THEN RAISE EXCEPTION 'Cancelled incoming public'; END IF;
  UPDATE public.purchases SET order_status='received_verified' WHERE id=incoming_id;
  SELECT * INTO listing FROM public.get_public_store_products() p WHERE p.id=product_id;
  IF listing.availability_status <> 'available' THEN RAISE EXCEPTION 'Confirmed receipt still incoming'; END IF;
  UPDATE public.purchases SET refund_received_at=now() WHERE id=incoming_id;
  IF EXISTS(SELECT 1 FROM public.get_public_store_products() p WHERE p.id=product_id) THEN RAISE EXCEPTION 'Refund receipt public'; END IF;
END;
$test$;
ROLLBACK;
