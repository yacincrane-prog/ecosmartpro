
-- Create product_periods table
CREATE TABLE public.product_periods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  purchase_price numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  received_orders integer NOT NULL DEFAULT 0,
  confirmed_orders integer NOT NULL DEFAULT 0,
  delivered_orders integer NOT NULL DEFAULT 0,
  ad_spend_usd numeric NOT NULL DEFAULT 0,
  delivery_discount numeric NOT NULL DEFAULT 0,
  packaging_cost numeric NOT NULL DEFAULT 0,
  date_from date NOT NULL DEFAULT CURRENT_DATE,
  date_to date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_periods ENABLE ROW LEVEL SECURITY;

-- RLS policies via product ownership
CREATE POLICY "Users can view their own product periods"
  ON public.product_periods FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.products WHERE products.id = product_periods.product_id AND products.user_id = auth.uid()));

CREATE POLICY "Users can create their own product periods"
  ON public.product_periods FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.products WHERE products.id = product_periods.product_id AND products.user_id = auth.uid()));

CREATE POLICY "Users can update their own product periods"
  ON public.product_periods FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.products WHERE products.id = product_periods.product_id AND products.user_id = auth.uid()));

CREATE POLICY "Users can delete their own product periods"
  ON public.product_periods FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.products WHERE products.id = product_periods.product_id AND products.user_id = auth.uid()));

-- Migrate existing data from products to product_periods
INSERT INTO public.product_periods (product_id, purchase_price, selling_price, received_orders, confirmed_orders, delivered_orders, ad_spend_usd, delivery_discount, packaging_cost, date_from, date_to, created_at)
SELECT id, purchase_price, selling_price, received_orders, confirmed_orders, delivered_orders, ad_spend_usd, delivery_discount, packaging_cost, date_from, date_to, created_at
FROM public.products;

-- Drop period-specific columns from products table
ALTER TABLE public.products
  DROP COLUMN purchase_price,
  DROP COLUMN selling_price,
  DROP COLUMN received_orders,
  DROP COLUMN confirmed_orders,
  DROP COLUMN delivered_orders,
  DROP COLUMN ad_spend_usd,
  DROP COLUMN delivery_discount,
  DROP COLUMN packaging_cost,
  DROP COLUMN date_from,
  DROP COLUMN date_to;

-- Add updated_at trigger for product_periods
CREATE TRIGGER update_product_periods_updated_at
  BEFORE UPDATE ON public.product_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
