CREATE TABLE IF NOT EXISTS reserve_member_routines (
 user_id text PRIMARY KEY REFERENCES reserve_users(id) ON DELETE CASCADE,
 priority text NOT NULL CHECK(priority IN ('presence','performance','wellness')),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 80),
 steps jsonb NOT NULL CHECK(jsonb_typeof(steps)='array' AND jsonb_array_length(steps)<=6),
 cleared boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reserve_concierge_rate (
 user_id text PRIMARY KEY REFERENCES reserve_users(id) ON DELETE CASCADE,
 bucket bigint NOT NULL,
 requests integer NOT NULL
);
CREATE TABLE IF NOT EXISTS reserve_concierge_budgets (
 subject text NOT NULL,
 period text NOT NULL,
 charged_cents integer NOT NULL DEFAULT 0 CHECK(charged_cents>=0),
 PRIMARY KEY(subject,period)
);
CREATE TABLE IF NOT EXISTS reserve_concierge_calls (
 id text PRIMARY KEY,
 user_id text NOT NULL REFERENCES reserve_users(id) ON DELETE CASCADE,
 period text NOT NULL,
 reserved_cents integer NOT NULL,
 charged_cents integer NOT NULL,
 status text NOT NULL CHECK(status IN ('reserved','complete','uncertain')),
 model text NOT NULL,
 input_tokens integer,
 output_tokens integer,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reserve_member_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_concierge_rate ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_concierge_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_concierge_calls ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reserve_member_routines,reserve_concierge_rate,reserve_concierge_budgets,reserve_concierge_calls FROM PUBLIC;
