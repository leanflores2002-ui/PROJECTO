-- First D1 migration for the Cloudflare-native platform.
-- This intentionally creates only the stable settings primitive. Product,
-- order and inventory tables will be designed after the legacy data audit.
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
