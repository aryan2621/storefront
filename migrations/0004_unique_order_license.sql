-- One license per paid order: a duplicate webhook racing the first one must fail instead of issuing a second key.
CREATE UNIQUE INDEX IF NOT EXISTS idx_licenses_order_source
ON licenses(source_id)
WHERE source_type = 'order';
