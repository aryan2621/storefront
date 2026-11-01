CREATE TABLE IF NOT EXISTS activations (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL REFERENCES licenses(id),
  device_id TEXT NOT NULL,
  device_name TEXT,
  activated_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  deactivated_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_activations_license_device_active
ON activations(license_id, device_id)
WHERE deactivated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_activations_license
ON activations(license_id, deactivated_at);
