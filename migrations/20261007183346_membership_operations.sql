-- Membership operations are complimentary and never establish payment status.
ALTER TABLE reserve_membership_plans ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
ALTER TABLE reserve_memberships ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
ALTER TABLE reserve_memberships ADD COLUMN IF NOT EXISTS access_basis text NOT NULL DEFAULT 'legacy' CHECK(access_basis IN ('legacy','complimentary'));
ALTER TABLE reserve_memberships ADD COLUMN IF NOT EXISTS plan_snapshot jsonb;
ALTER TABLE reserve_memberships ADD COLUMN IF NOT EXISTS granted_by text REFERENCES reserve_users(id);
CREATE TABLE IF NOT EXISTS reserve_membership_requests (
 id text PRIMARY KEY,
 user_id text NOT NULL UNIQUE REFERENCES reserve_users(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','closed','withdrawn','fulfilled')),
 interest text NOT NULL CHECK(interest IN ('membership','services','products')),
 revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reserve_membership_events (
 id text PRIMARY KEY,
 actor_id text NOT NULL REFERENCES reserve_users(id),
 subject_id text NOT NULL,
 event text NOT NULL,
 detail jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reserve_membership_request_queue ON reserve_membership_requests(status,updated_at);
CREATE INDEX IF NOT EXISTS reserve_membership_event_history ON reserve_membership_events(subject_id,created_at);
ALTER TABLE reserve_membership_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_membership_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reserve_membership_requests,reserve_membership_events FROM PUBLIC;
