-- Link a customer to their Clerk user id. Email stays the way a purchase finds its customer; the id is what an account sign-in trusts afterwards.
ALTER TABLE customers ADD COLUMN clerk_user_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_clerk_user
ON customers(clerk_user_id)
WHERE clerk_user_id IS NOT NULL;
