-- 0001_init.sql: Initial D1 schema for Storefront

-- 1. Products catalog
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,                       -- slug (e.g. 'orbit-ide', 'murmur')
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description_md TEXT,
  kind TEXT NOT NULL CHECK(kind IN ('one_time', 'subscription')),
  price_paise INTEGER NOT NULL,              -- all money in paise
  period TEXT CHECK(period IN ('month', 'year', NULL)),
  razorpay_plan_id TEXT,
  max_devices INTEGER NOT NULL DEFAULT 2,
  offline_grace_days INTEGER NOT NULL DEFAULT 30,
  refund_window_days INTEGER NOT NULL DEFAULT 14,
  license_kid TEXT NOT NULL DEFAULT 'default',
  landing_url TEXT,
  allowed_origins TEXT,
  updates_months INTEGER DEFAULT 12,
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  repo_url TEXT,
  download_url TEXT,
  image_url TEXT,
  created_at INTEGER NOT NULL
);

-- 2. Customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,                       -- cust_...
  email TEXT UNIQUE NOT NULL,                -- lowercase
  name TEXT,
  phone TEXT,
  state TEXT,
  gstin TEXT,
  created_at INTEGER NOT NULL
);

-- 3. Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,                       -- ord_...
  razorpay_order_id TEXT UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  amount_paise INTEGER NOT NULL,
  discount_paise INTEGER NOT NULL DEFAULT 0,
  coupon_code TEXT,
  status TEXT NOT NULL CHECK(status IN ('created', 'paid', 'failed', 'expired')),
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);

-- 4. Payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,                       -- pay_... (razorpay_payment_id)
  order_id TEXT REFERENCES orders(id),
  subscription_id TEXT REFERENCES subscriptions(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  amount_paise INTEGER NOT NULL,
  fee_paise INTEGER DEFAULT 0,
  fee_tax_paise INTEGER DEFAULT 0,
  method TEXT,                               -- upi, card, netbanking, wallet, emi
  status TEXT NOT NULL CHECK(status IN ('captured', 'failed', 'refunded', 'partially_refunded', 'disputed')),
  refunded_paise INTEGER DEFAULT 0,
  international INTEGER NOT NULL DEFAULT 0,  -- 0 or 1
  created_at INTEGER NOT NULL
);

-- 5. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,                       -- sub_... (razorpay_subscription_id)
  customer_id TEXT NOT NULL REFERENCES customers(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'paused')),
  current_start INTEGER,
  current_end INTEGER,
  paid_count INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER,
  ended_at INTEGER,
  updated_at INTEGER NOT NULL
);

-- 6. Licenses
CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,                       -- lic_...
  customer_id TEXT NOT NULL REFERENCES customers(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  source_type TEXT NOT NULL CHECK(source_type IN ('order', 'subscription', 'manual')),
  source_id TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'pro',          -- pro, teams, all
  seats INTEGER NOT NULL DEFAULT 1,
  issued_at INTEGER NOT NULL,
  expires_at INTEGER,                        -- NULL for lifetime one-time licenses
  updates_until INTEGER,                     -- build date cutoff for updates
  status TEXT NOT NULL CHECK(status IN ('active', 'revoked')),
  revoked_reason TEXT,
  key TEXT NOT NULL
);

-- 7. Webhook Events (Idempotency log)
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,                       -- x-razorpay-event-id
  type TEXT NOT NULL,
  payload TEXT NOT NULL,                     -- raw JSON
  received_at INTEGER NOT NULL,
  processed_at INTEGER,
  error TEXT
);

-- 8. Coupons
CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  percent_off INTEGER,
  amount_off_paise INTEGER,
  product_id TEXT REFERENCES products(id),   -- NULL = all products
  max_uses INTEGER DEFAULT 0,                -- 0 = unlimited
  used INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER,
  active INTEGER NOT NULL DEFAULT 1
);

-- 9. Invoices (v0.2 ready)
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,               -- e.g. INV/26-27/0001
  payment_id TEXT NOT NULL REFERENCES payments(id),
  customer_snapshot TEXT NOT NULL,           -- JSON
  taxable_paise INTEGER NOT NULL,
  cgst_paise INTEGER NOT NULL DEFAULT 0,
  sgst_paise INTEGER NOT NULL DEFAULT 0,
  igst_paise INTEGER NOT NULL DEFAULT 0,
  total_paise INTEGER NOT NULL,
  place_of_supply TEXT,
  sac TEXT,
  pdf_r2_key TEXT,
  issued_at INTEGER NOT NULL
);

-- 10. Admin Audit Log
CREATE TABLE IF NOT EXISTS admin_audit (
  id TEXT PRIMARY KEY,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  details TEXT,                              -- JSON
  at INTEGER NOT NULL
);

-- Indexes for high-performance dashboard queries and lookups
CREATE INDEX IF NOT EXISTS idx_payments_product_created ON payments(product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_product_status ON subscriptions(product_id, status);
CREATE INDEX IF NOT EXISTS idx_licenses_customer ON licenses(customer_id);
CREATE INDEX IF NOT EXISTS idx_licenses_product ON licenses(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at);
