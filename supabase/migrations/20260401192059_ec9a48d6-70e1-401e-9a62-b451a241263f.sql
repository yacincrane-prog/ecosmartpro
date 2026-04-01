
-- 1. api_tokens
CREATE TABLE public.api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  label text NOT NULL DEFAULT 'EcoSmart',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE UNIQUE INDEX idx_api_tokens_token ON public.api_tokens(token);
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tokens" ON public.api_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. synced_orders
CREATE TABLE public.synced_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_name text NOT NULL,
  product_variant text NOT NULL DEFAULT '',
  status text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  discount numeric NOT NULL DEFAULT 0,
  delivery_type text NOT NULL DEFAULT 'home',
  delivery_provider text NOT NULL DEFAULT '',
  wilaya text NOT NULL DEFAULT '',
  commune text NOT NULL DEFAULT '',
  order_created_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.synced_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own synced_orders" ON public.synced_orders FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. synced_products
CREATE TABLE public.synced_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  alias_name text NOT NULL DEFAULT '',
  sale_price numeric NOT NULL DEFAULT 0,
  purchase_price numeric NOT NULL DEFAULT 0,
  qty integer NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);
ALTER TABLE public.synced_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own synced_products" ON public.synced_products FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4. synced_delivery_prices
CREATE TABLE public.synced_delivery_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wilaya_name text NOT NULL,
  home_price numeric NOT NULL DEFAULT 0,
  office_price numeric NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, wilaya_name)
);
ALTER TABLE public.synced_delivery_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own synced_delivery_prices" ON public.synced_delivery_prices FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
