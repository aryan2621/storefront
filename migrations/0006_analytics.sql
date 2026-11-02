-- Signed-in users (from Clerk) with the country they visit from. Country is stored only while analytics consent is on.
CREATE TABLE IF NOT EXISTS app_users (
  clerk_user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  country TEXT,
  analytics_consent INTEGER NOT NULL DEFAULT 0,
  consent_at INTEGER,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);

-- Page views from visitors who accepted analytics. No IP address and no query string is stored.
CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  country TEXT,
  path TEXT NOT NULL,
  clerk_user_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_page_views_ts ON page_views(ts);
