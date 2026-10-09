ALTER TABLE reserve_business_grants ADD COLUMN IF NOT EXISTS website_access boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS reserve_business_websites (
 id text PRIMARY KEY,provider_id text NOT NULL UNIQUE REFERENCES reserve_provider_brands(provider_id),
 path text NOT NULL UNIQUE CHECK(path='/fix-it-shop'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reserve_business_websites ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS reserve_website_proposals (
 id text PRIMARY KEY,website_id text NOT NULL REFERENCES reserve_business_websites(id),
 grant_id text NOT NULL REFERENCES reserve_business_grants(id),created_by text NOT NULL REFERENCES reserve_users(id),
 base_revision integer NOT NULL,content jsonb NOT NULL,service_changes jsonb NOT NULL,
 fingerprint text NOT NULL, baseline jsonb NOT NULL,
 state text NOT NULL DEFAULT 'review' CHECK(state IN ('review','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),reviewed_by text REFERENCES reserve_users(id),reviewed_at timestamptz
);
ALTER TABLE reserve_website_proposals ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS reserve_website_proposals_queue ON reserve_website_proposals(website_id,state,created_at);
