
CREATE TABLE public.synced_product_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  ad_spend numeric NOT NULL DEFAULT 0,
  packaging_cost numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_name)
);

ALTER TABLE public.synced_product_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own synced_product_inputs"
  ON public.synced_product_inputs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
