-- A montra deriva o estado Ativo dos mesmos registos que o dashboard.
-- store_visible deixa de ser uma segunda decisão manual para produtos de revenda.
create or replace function public.get_public_store_products()
returns table (
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
      sum(quantity) filter (where order_status in ('not_tracked', 'received_verified'))::bigint as ready_qty,
      sum(quantity) filter (where order_status in ('ordered', 'shipped', 'electronic_verification', 'delivered'))::bigint as incoming_qty
    from public.purchases
    group by product_id
  ),
  sale_totals as (
    select product_id, sum(quantity)::bigint as sold_qty
    from public.sales
    group by product_id
  )
  select
    p.id, p.name, p.category, p.condition, p.warranty_months, p.retail_price,
    nullif(p.photo_urls[1], ''), p.description, p.specifications, p.photo_urls,
    case when coalesce(pt.ready_qty, 0) > 0 then pt.ready_qty else pt.incoming_qty end,
    case when coalesce(pt.ready_qty, 0) > 0 then 'available' else 'coming_soon' end
  from public.products p
  join purchase_totals pt on pt.product_id = p.id
  left join sale_totals st on st.product_id = p.id
  where p.inventory_use = 'business'
    and lower(p.category) <> 'livros'
    and coalesce(st.sold_qty, 0) = 0
    and (coalesce(pt.ready_qty, 0) > 0 or coalesce(pt.incoming_qty, 0) > 0)
  order by case when coalesce(pt.ready_qty, 0) > 0 then 0 else 1 end, p.created_at desc;
$function$;

revoke all on function public.get_public_store_products() from public;
grant execute on function public.get_public_store_products() to anon, authenticated;
