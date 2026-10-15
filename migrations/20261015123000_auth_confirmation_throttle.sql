-- Server-only durable delivery budgets. No raw email/IP or authority grants.
CREATE TABLE IF NOT EXISTS reserve_auth_delivery_limits (
 key_hash text PRIMARY KEY,
 window_start timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 1
);
ALTER TABLE reserve_auth_delivery_limits ENABLE ROW LEVEL SECURITY;
