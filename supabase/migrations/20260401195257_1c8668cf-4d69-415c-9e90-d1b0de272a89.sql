
-- Drop old tables that are no longer needed
DROP TABLE IF EXISTS synced_orders;
DROP TABLE IF EXISTS synced_delivery_prices;

-- Modify synced_products: drop old columns, add new ones
ALTER TABLE synced_products DROP COLUMN IF EXISTS alias_name;
ALTER TABLE synced_products DROP COLUMN IF EXISTS qty;
ALTER TABLE synced_products ADD COLUMN IF NOT EXISTS delivery_discount numeric NOT NULL DEFAULT 0;
ALTER TABLE synced_products ADD COLUMN IF NOT EXISTS total_created integer NOT NULL DEFAULT 0;
ALTER TABLE synced_products ADD COLUMN IF NOT EXISTS total_confirmed integer NOT NULL DEFAULT 0;
ALTER TABLE synced_products ADD COLUMN IF NOT EXISTS total_delivered integer NOT NULL DEFAULT 0;
ALTER TABLE synced_products ADD COLUMN IF NOT EXISTS total_returned integer NOT NULL DEFAULT 0;

-- Drop old unique constraint and create new one with user_id
ALTER TABLE synced_products DROP CONSTRAINT IF EXISTS synced_products_user_id_name_key;
ALTER TABLE synced_products ADD CONSTRAINT synced_products_user_id_name_key UNIQUE (user_id, name);

-- Create synced_daily_stats table
CREATE TABLE IF NOT EXISTS synced_daily_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_name text NOT NULL,
  stat_date date NOT NULL,
  created integer NOT NULL DEFAULT 0,
  confirmed integer NOT NULL DEFAULT 0,
  delivered integer NOT NULL DEFAULT 0,
  returned integer NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_name, stat_date)
);

ALTER TABLE synced_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own synced_daily_stats" ON synced_daily_stats
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
