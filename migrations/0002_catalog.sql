-- Catalog staging table populated from the audited legacy products.json.
-- The source JSON and legacy storage remain untouched for rollback.
CREATE TABLE IF NOT EXISTS catalog_products (
  id TEXT PRIMARY KEY,
  section TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  season TEXT,
  image TEXT NOT NULL,
  price INTEGER NOT NULL,
  price_by_group_json TEXT NOT NULL,
  special_sizes_json TEXT NOT NULL,
  colors_json TEXT NOT NULL,
  sizes_json TEXT NOT NULL,
  visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS catalog_products_visible_idx
  ON catalog_products (visible, section, type, name);

CREATE INDEX IF NOT EXISTS catalog_products_name_idx
  ON catalog_products (name);
