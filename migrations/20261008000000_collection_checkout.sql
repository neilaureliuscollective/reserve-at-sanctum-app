CREATE TABLE IF NOT EXISTS reserve_checkout_intents (
 id text PRIMARY KEY,
 user_id text NOT NULL REFERENCES reserve_users(id) ON DELETE CASCADE,
 attempt_key text NOT NULL,
 merchant_domain text NOT NULL,
 variant_id text NOT NULL,
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 5),
 status text NOT NULL CHECK(status IN ('preparing','ready','failed','uncertain')),
 checkout_url text,
 estimated_total jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,attempt_key)
);
CREATE TABLE IF NOT EXISTS reserve_commerce_rate (
 user_id text PRIMARY KEY REFERENCES reserve_users(id) ON DELETE CASCADE,
 bucket bigint NOT NULL,
 requests integer NOT NULL
);
ALTER TABLE reserve_checkout_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_commerce_rate ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reserve_checkout_intents,reserve_commerce_rate FROM PUBLIC;
