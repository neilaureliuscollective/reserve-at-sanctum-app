CREATE TABLE IF NOT EXISTS reserve_vitalis_journeys (
 user_id text PRIMARY KEY REFERENCES reserve_users(id),
 active boolean NOT NULL DEFAULT true,
 direction text CHECK(direction IN ('sleep','movement','meal-planning')),
 minutes integer CHECK(minutes IN (5,10,20)), target integer CHECK(target BETWEEN 1 AND 7),
 days jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(days)='array' AND jsonb_array_length(days)<=90),
 started_on date, notice_version text NOT NULL, consented_at timestamptz,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(NOT active OR (direction IS NOT NULL AND minutes IS NOT NULL AND target IS NOT NULL AND started_on IS NOT NULL AND consented_at IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS reserve_vitalis_launch_reviews (
 gate text PRIMARY KEY CHECK(gate IN ('offer','partner','clinical','processor','privacy','products','operations','pilot','sandbox')),
 reviewed boolean NOT NULL DEFAULT false, reference text NOT NULL DEFAULT '' CHECK(length(reference)<=500),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0), updated_by text NOT NULL REFERENCES reserve_users(id), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(NOT reviewed OR length(reference)>0)
);
ALTER TABLE reserve_vitalis_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_vitalis_launch_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reserve_vitalis_journeys,reserve_vitalis_launch_reviews FROM PUBLIC;
