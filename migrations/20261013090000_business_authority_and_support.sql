-- Additive, uncommissioned foundation. No business, membership or provider is
-- seeded or reassigned. Review hosted baseline/grants and restore before use.
CREATE TABLE IF NOT EXISTS reserve_businesses (
 id text PRIMARY KEY, slug text NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
 display_name text NOT NULL CHECK(length(trim(display_name)) BETWEEN 1 AND 100),
 state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','inactive','active','archived')),
 booking_status text NOT NULL DEFAULT 'closed' CHECK(booking_status IN ('closed','commissioning')),
 subscription_status text NOT NULL DEFAULT 'unconfigured' CHECK(subscription_status IN ('unconfigured','trial_prepared','suspended')),
 support_status text NOT NULL DEFAULT 'unreviewed' CHECK(support_status IN ('unreviewed','ready','attention')),
 revision integer NOT NULL DEFAULT 1, created_by text NOT NULL REFERENCES reserve_users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reserve_business_memberships (
 business_id text NOT NULL REFERENCES reserve_businesses(id),
 user_id text NOT NULL REFERENCES reserve_users(id),
 role text NOT NULL CHECK(role IN ('business_owner','manager','staff')),
 verified_at timestamptz NOT NULL, verified_by text NOT NULL REFERENCES reserve_users(id),
 revoked_at timestamptz, revision integer NOT NULL DEFAULT 1,
 PRIMARY KEY(business_id,user_id)
);
CREATE INDEX IF NOT EXISTS reserve_business_member_lookup ON reserve_business_memberships(user_id,business_id) WHERE revoked_at IS NULL;
CREATE TABLE IF NOT EXISTS reserve_business_providers (
 business_id text NOT NULL REFERENCES reserve_businesses(id),
 provider_id text NOT NULL UNIQUE REFERENCES reserve_providers(id),
 PRIMARY KEY(business_id,provider_id)
);
CREATE TABLE IF NOT EXISTS reserve_business_locations (
 business_id text NOT NULL REFERENCES reserve_businesses(id),
 location_id text NOT NULL REFERENCES reserve_locations(id),
 PRIMARY KEY(business_id,location_id)
);
CREATE TABLE IF NOT EXISTS reserve_business_provider_locations (
 business_id text NOT NULL, provider_id text NOT NULL, location_id text NOT NULL,
 PRIMARY KEY(business_id,provider_id,location_id),
 FOREIGN KEY(business_id,provider_id) REFERENCES reserve_business_providers(business_id,provider_id),
 FOREIGN KEY(business_id,location_id) REFERENCES reserve_business_locations(business_id,location_id),
 FOREIGN KEY(provider_id,location_id) REFERENCES reserve_provider_locations(provider_id,location_id)
);
CREATE TABLE IF NOT EXISTS reserve_business_staff_assignments (
 business_id text NOT NULL, user_id text NOT NULL, provider_id text NOT NULL,
 PRIMARY KEY(business_id,user_id,provider_id),
 FOREIGN KEY(business_id,user_id) REFERENCES reserve_business_memberships(business_id,user_id),
 FOREIGN KEY(business_id,provider_id) REFERENCES reserve_business_providers(business_id,provider_id)
);
CREATE TABLE IF NOT EXISTS reserve_business_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 business_id text NOT NULL REFERENCES reserve_businesses(id), actor_id text NOT NULL REFERENCES reserve_users(id),
 action text NOT NULL CHECK(action IN ('draft_created','configuration_updated','membership_revoked','support_opened','support_resolved','square_associated')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reserve_support_cases (
 id text PRIMARY KEY, business_id text NOT NULL REFERENCES reserve_businesses(id),
 category text NOT NULL CHECK(category IN ('configuration','authentication','booking','communications','availability','billing')),
 severity text NOT NULL CHECK(severity IN ('routine','urgent')),
 state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','resolved')),
 created_by text NOT NULL REFERENCES reserve_users(id), resolved_by text REFERENCES reserve_users(id),
 created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz,
 revision integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS reserve_support_business_state ON reserve_support_cases(business_id,state,created_at);
ALTER TABLE reserve_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_business_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_business_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_business_provider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_business_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_business_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_support_cases ENABLE ROW LEVEL SECURITY;
-- Hosted applyReviewedMigrations/lockdownStudio revokes all anon/authenticated
-- grants. Do not run this file alone outside that reviewed migration process.
