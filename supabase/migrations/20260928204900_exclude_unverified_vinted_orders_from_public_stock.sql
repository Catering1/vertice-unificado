create or replace function public.get_public_store_products()
returns table(
  id uuid,
  title text,
  category text,
  condition text,
  warranty_months integer,
  retail_price numeric,
  image_url text,
  description text,
  specifications text,
  photo_urls text[],
  stock_quantity bigint
)
language sql
security definer
set search_path = 'public'
as $function$
  select p.id,p.name,p.category,p.condition,p.warranty_months,p.retail_price,
         nullif(p.photo_urls[1],''),
         p.description,p.specifications,p.photo_urls,
         (coalesce(pu.qty,0)-coalesce(sa.qty,0))::bigint
  from public.products p
  left join (
    select product_id,sum(quantity) qty
    from public.purchases
    where order_status in ('not_tracked','received_verified')
    group by product_id
  ) pu on pu.product_id=p.id
  left join (select product_id,sum(quantity) qty from public.sales group by product_id) sa on sa.product_id=p.id
  where p.store_visible and p.inventory_use='business'
    and coalesce(pu.qty,0)-coalesce(sa.qty,0)>0
  order by p.created_at desc;
$function$;
