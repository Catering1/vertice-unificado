-- Dados públicos da loja. Esta tabela nunca expõe preço de compra, fornecedor ou lucro.
CREATE TABLE public.store_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) <= 200),
  category TEXT NOT NULL DEFAULT 'Outros' CHECK (char_length(category) <= 100),
  condition TEXT NOT NULL DEFAULT 'Bom' CHECK (char_length(condition) <= 100),
  warranty_months INTEGER NOT NULL DEFAULT 0 CHECK (warranty_months >= 0 AND warranty_months <= 60),
  retail_price NUMERIC NOT NULL CHECK (retail_price >= 0),
  description TEXT,
  image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_listings ENABLE ROW LEVEL SECURITY;

-- Apenas artigos assinalados como publicados podem ser consultados sem sessão.
CREATE POLICY "Public reads published store listings"
  ON public.store_listings FOR SELECT
  USING (published = true OR auth.uid() = user_id);

CREATE POLICY "Owners manage their store listings"
  ON public.store_listings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX store_listings_published_created_at_idx
  ON public.store_listings (published, created_at DESC);
