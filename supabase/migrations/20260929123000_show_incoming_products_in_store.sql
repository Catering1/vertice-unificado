drop function if exists public.get_public_store_products();

create function public.get_public_store_products()
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
  stock_quantity bigint,
  availability_status text
)
language sql
security definer
set search_path = public
as $function$
  with purchase_totals as (
    select
      product_id,
      sum(quantity) filter (where order_status in ('not_tracked','received_verified'))::bigint as ready_qty,
      sum(quantity) filter (where order_status in ('ordered','shipped','electronic_verification','delivered'))::bigint as incoming_qty
    from public.purchases
    group by product_id
  ),
  sale_totals as (
    select product_id,sum(quantity)::bigint as sold_qty
    from public.sales
    group by product_id
  ),
  inventory as (
    select
      p.*,
      greatest(coalesce(pt.ready_qty,0)-coalesce(st.sold_qty,0),0)::bigint as available_qty,
      coalesce(pt.incoming_qty,0)::bigint as incoming_qty
    from public.products p
    left join purchase_totals pt on pt.product_id=p.id
    left join sale_totals st on st.product_id=p.id
  )
  select
    i.id,i.name,i.category,i.condition,i.warranty_months,i.retail_price,
    nullif(i.photo_urls[1],''),i.description,i.specifications,i.photo_urls,
    case when i.available_qty>0 then i.available_qty else i.incoming_qty end,
    case when i.available_qty>0 then 'available' else 'coming_soon' end
  from inventory i
  where i.store_visible
    and i.inventory_use='business'
    and lower(i.category)<>'livros'
    and (i.available_qty>0 or i.incoming_qty>0)
  order by case when i.available_qty>0 then 0 else 1 end,i.created_at desc;
$function$;

grant execute on function public.get_public_store_products() to anon, authenticated;

with stock as (
  select
    p.id,
    greatest(
      coalesce(sum(pu.quantity) filter (where pu.order_status in ('not_tracked','received_verified')),0)
      - coalesce((select sum(s.quantity) from public.sales s where s.product_id=p.id),0),
      0
    ) as available,
    coalesce(sum(pu.quantity) filter (where pu.order_status in ('ordered','shipped','electronic_verification','delivered')),0) as incoming
  from public.products p
  left join public.purchases pu on pu.product_id=p.id
  group by p.id
)
update public.products p
set store_visible = (
  p.inventory_use='business'
  and lower(p.category)<>'livros'
  and (stock.available>0 or stock.incoming>0)
)
from stock
where p.id=stock.id;
