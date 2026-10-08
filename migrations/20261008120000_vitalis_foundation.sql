CREATE TABLE IF NOT EXISTS reserve_vitalis_settings (
 id text PRIMARY KEY CHECK(id='vitalis'), visible boolean NOT NULL DEFAULT true,
 registration_open boolean NOT NULL DEFAULT true, revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO reserve_vitalis_settings(id) VALUES('vitalis') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS reserve_vitalis_interests (
 user_id text PRIMARY KEY REFERENCES reserve_users(id) ON DELETE CASCADE,
 status text NOT NULL CHECK(status IN ('active','withdrawn')),
 interests jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(interests)='array' AND jsonb_array_length(interests)<=4),
 region text NOT NULL DEFAULT '', outreach boolean NOT NULL DEFAULT false,
 notice_version text NOT NULL, revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reserve_vitalis_consent_events (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES reserve_users(id) ON DELETE CASCADE,
 purpose text NOT NULL CHECK(purpose IN ('collection','launch-email')),
 decision text NOT NULL CHECK(decision IN ('grant','withdraw')),
 notice_version text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reserve_vitalis_consent_user ON reserve_vitalis_consent_events(user_id,created_at);
CREATE TABLE IF NOT EXISTS reserve_vitalis_partners (
 id text PRIMARY KEY, name text NOT NULL, categories jsonb NOT NULL DEFAULT '[]',
 regions jsonb NOT NULL DEFAULT '[]', status text NOT NULL CHECK(status IN ('draft','in-review','verified','paused','archived')),
 kind text NOT NULL CHECK(kind IN ('clinical','nonclinical')), destination text NOT NULL DEFAULT '',
 destination_reviewed boolean NOT NULL DEFAULT false, reviewed_at timestamptz,
 revision integer NOT NULL DEFAULT 1, updated_by text NOT NULL REFERENCES reserve_users(id), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reserve_vitalis_rate (
 user_id text NOT NULL REFERENCES reserve_users(id) ON DELETE CASCADE,
 purpose text NOT NULL CHECK(purpose IN ('mutation','event')),
 bucket bigint NOT NULL, requests integer NOT NULL, PRIMARY KEY(user_id,purpose)
);
CREATE TABLE IF NOT EXISTS reserve_vitalis_funnel (
 day date NOT NULL DEFAULT CURRENT_DATE, event text NOT NULL CHECK(event IN ('vitalis_view','join_started','join_completed','join_failed','withdraw_completed')),
 count integer NOT NULL DEFAULT 0, PRIMARY KEY(day,event)
);
ALTER TABLE reserve_vitalis_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_vitalis_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_vitalis_consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_vitalis_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_vitalis_rate ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_vitalis_funnel ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reserve_vitalis_settings,reserve_vitalis_interests,reserve_vitalis_consent_events,reserve_vitalis_partners,reserve_vitalis_rate,reserve_vitalis_funnel FROM PUBLIC;
