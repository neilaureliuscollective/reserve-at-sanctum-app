ALTER TABLE reserve_providers ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
ALTER TABLE reserve_services ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS reserve_operation_proposals (
 id text PRIMARY KEY,
 provider_id text NOT NULL,
 service_id text,
 kind text NOT NULL CHECK(kind IN ('provider','service')),
 payload jsonb NOT NULL,
 baseline jsonb,
 target_revision integer NOT NULL CHECK(target_revision>=0),
 state text NOT NULL DEFAULT 'review' CHECK(state IN ('review','applied','dismissed')),
 created_by text NOT NULL REFERENCES reserve_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 applied_by text REFERENCES reserve_users(id),
 applied_at timestamptz
);
CREATE INDEX IF NOT EXISTS reserve_operation_review ON reserve_operation_proposals(provider_id,state,created_at DESC);
ALTER TABLE reserve_operation_proposals ENABLE ROW LEVEL SECURITY;
-- Hosted migrator revokes browser-role grants through lockdownStudio.
