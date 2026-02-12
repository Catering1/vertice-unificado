
-- Fix RESTRICTIVE policies: drop and recreate as PERMISSIVE (default)

DROP POLICY "Users manage own products" ON products;
CREATE POLICY "Users manage own products" ON products
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users manage own purchases" ON purchases;
CREATE POLICY "Users manage own purchases" ON purchases
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users manage own sales" ON sales;
CREATE POLICY "Users manage own sales" ON sales
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users manage own categories" ON categories;
CREATE POLICY "Users manage own categories" ON categories
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add database constraints for input validation
ALTER TABLE products
  ADD CONSTRAINT check_purchase_price_non_negative CHECK (purchase_price >= 0),
  ADD CONSTRAINT check_name_length CHECK (length(name) <= 200),
  ADD CONSTRAINT check_supplier_length CHECK (length(supplier) <= 200);

ALTER TABLE purchases
  ADD CONSTRAINT check_quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT check_price_non_negative CHECK (price >= 0);

ALTER TABLE sales
  ADD CONSTRAINT check_sale_quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT check_sale_price_non_negative CHECK (sale_price >= 0);

ALTER TABLE categories
  ADD CONSTRAINT check_category_name_length CHECK (length(name) <= 100);
