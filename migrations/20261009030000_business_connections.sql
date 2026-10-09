-- Server-only consent grants. OAuth identity alone grants no business authority.
CREATE TABLE IF NOT EXISTS reserve_business_grants (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES reserve_users(id),
 oauth_client_id text NOT NULL, link_hash text NOT NULL UNIQUE,
 provider_id text NOT NULL REFERENCES reserve_providers(id),
 expires_at timestamptz NOT NULL, revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(length(link_hash)=64)
);
ALTER TABLE reserve_business_grants ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS reserve_business_grants_actor ON reserve_business_grants(user_id,oauth_client_id);
CREATE TABLE IF NOT EXISTS reserve_business_audit (
 id text PRIMARY KEY, grant_id text NOT NULL REFERENCES reserve_business_grants(id),
 action text NOT NULL CHECK(action IN ('consented','schedule_read','revoked')),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reserve_business_audit ENABLE ROW LEVEL SECURITY;
