-- Brand configuration is independent of scheduling authority and private client data.
CREATE TABLE IF NOT EXISTS reserve_provider_brands (
 provider_id text PRIMARY KEY REFERENCES reserve_providers(id),
 slug text NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$'),
 draft jsonb NOT NULL, published jsonb,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 published_revision integer, updated_by text NOT NULL REFERENCES reserve_users(id),
 published_by text REFERENCES reserve_users(id),
 updated_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz,
 CHECK(published IS NULL OR published_revision IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS reserve_provider_brand_assets (
 id text PRIMARY KEY, provider_id text NOT NULL REFERENCES reserve_providers(id),
 image bytea NOT NULL, icon180 bytea NOT NULL, icon192 bytea NOT NULL, icon512 bytea NOT NULL,
 created_by text NOT NULL REFERENCES reserve_users(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider_id,id), CHECK(octet_length(image)<=500000)
);
CREATE INDEX IF NOT EXISTS reserve_brand_asset_scope ON reserve_provider_brand_assets(provider_id,created_at);
CREATE TABLE IF NOT EXISTS reserve_provider_brand_events (
 id text PRIMARY KEY, provider_id text NOT NULL REFERENCES reserve_providers(id),
 actor_id text NOT NULL REFERENCES reserve_users(id), action text NOT NULL,
 revision integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reserve_provider_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_provider_brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_provider_brand_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reserve_provider_brands,reserve_provider_brand_assets,reserve_provider_brand_events FROM PUBLIC;
