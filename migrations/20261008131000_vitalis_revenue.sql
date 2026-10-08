CREATE TABLE IF NOT EXISTS reserve_vitalis_forecasts (
 scenario text PRIMARY KEY CHECK(scenario IN ('conservative','base','strong')),
 assumptions jsonb NOT NULL CHECK(jsonb_typeof(assumptions)='object'),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_by text NOT NULL REFERENCES reserve_users(id), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reserve_vitalis_forecasts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reserve_vitalis_forecasts FROM PUBLIC;
