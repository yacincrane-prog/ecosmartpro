ALTER TABLE synced_daily_stats ADD COLUMN cancelled integer NOT NULL DEFAULT 0;
ALTER TABLE synced_products ADD COLUMN total_cancelled integer NOT NULL DEFAULT 0;