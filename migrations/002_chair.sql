-- Reserve identity extension, one current client-owned check-in, no emotional history.
CREATE TABLE IF NOT EXISTS reserve_chair_profiles (
 user_id text PRIMARY KEY REFERENCES reserve_users(id) ON DELETE CASCADE,
 intent text NOT NULL, conversation text NOT NULL, goal text NOT NULL,
 maintenance text NOT NULL DEFAULT '', length text NOT NULL DEFAULT '',
 beard text NOT NULL DEFAULT '', detail text NOT NULL DEFAULT '' CHECK(length(detail)<=240),
 share_with_katie boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 1,
 consent_version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reserve_chair_context (
 user_id text PRIMARY KEY REFERENCES reserve_chair_profiles(user_id) ON DELETE CASCADE,
 life text NOT NULL, load text NOT NULL DEFAULT '',
 consented_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days'
);
CREATE TABLE IF NOT EXISTS reserve_chair_notes (
 user_id text PRIMARY KEY REFERENCES reserve_chair_profiles(user_id) ON DELETE CASCADE,
 provider_id text NOT NULL CHECK(provider_id='katie'),
 author_id text NOT NULL REFERENCES reserve_users(id),
 body text NOT NULL CHECK(length(body)<=600),
 revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reserve_chair_funnel (
 day date NOT NULL DEFAULT current_date, event text NOT NULL,
 total bigint NOT NULL DEFAULT 0, PRIMARY KEY(day,event)
);
ALTER TABLE reserve_chair_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_chair_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_chair_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_chair_funnel ENABLE ROW LEVEL SECURITY;
