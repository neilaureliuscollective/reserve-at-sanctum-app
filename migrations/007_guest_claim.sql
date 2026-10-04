CREATE TABLE reserve_customer_claims (
 token_hash text PRIMARY KEY,customer_id text NOT NULL REFERENCES reserve_customers(id),email text NOT NULL,
 created_by text NOT NULL REFERENCES reserve_users(id),expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',used_at timestamptz
);
ALTER TABLE reserve_customer_claims ENABLE ROW LEVEL SECURITY;
