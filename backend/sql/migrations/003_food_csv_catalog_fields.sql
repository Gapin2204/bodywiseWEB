USE bodywise_app;

ALTER TABLE food_catalog
  ADD COLUMN category VARCHAR(80) NULL AFTER brand,
  ADD COLUMN fiber_g_per_100g DECIMAL(7,2) NOT NULL DEFAULT 0 AFTER fat_g_per_100g,
  ADD CONSTRAINT chk_food_fiber CHECK (fiber_g_per_100g BETWEEN 0 AND 100);

ALTER TABLE food_logs
  ADD COLUMN fiber_g DECIMAL(8,2) NOT NULL DEFAULT 0 AFTER fat_g;
