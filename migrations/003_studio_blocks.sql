CREATE TABLE IF NOT EXISTS reserve_blocks (
 id text PRIMARY KEY,
 provider_id text NOT NULL REFERENCES reserve_providers(id),
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 created_by text NOT NULL REFERENCES reserve_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_at > starts_at)
);
ALTER TABLE reserve_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_occupancy ADD COLUMN IF NOT EXISTS block_id text REFERENCES reserve_blocks(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS reserve_blocks_provider_time ON reserve_blocks(provider_id, starts_at);
