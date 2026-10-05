ALTER TABLE reserve_workspace_items ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'shared' CHECK(visibility IN ('shared','founder','provider'));
ALTER TABLE reserve_workspace_items ADD COLUMN IF NOT EXISTS provider_id text REFERENCES reserve_providers(id);
ALTER TABLE reserve_workspace_items ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
ALTER TABLE reserve_workspace_items ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE reserve_workspace_items ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE reserve_workspace_items ADD COLUMN IF NOT EXISTS handoff_to text REFERENCES reserve_users(id);
ALTER TABLE reserve_workspace_items ADD COLUMN IF NOT EXISTS handoff_state text NOT NULL DEFAULT 'none' CHECK(handoff_state IN ('none','proposed','acknowledged','done'));
ALTER TABLE reserve_workspace_items ADD COLUMN IF NOT EXISTS handoff_by text REFERENCES reserve_users(id);
CREATE TABLE IF NOT EXISTS reserve_command_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id text NOT NULL REFERENCES reserve_users(id),
 resource_id text NOT NULL, action text NOT NULL, revision integer,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reserve_business_facts (
 id text PRIMARY KEY, lane text NOT NULL CHECK(lane IN ('reserve','fix-it','gent')),
 title text NOT NULL CHECK(char_length(title) BETWEEN 1 AND 120),
 body text NOT NULL CHECK(char_length(body) BETWEEN 1 AND 2000),
 source text NOT NULL CHECK(char_length(source) <= 500),
 confirmed_by text NOT NULL REFERENCES reserve_users(id),
 confirmed_at timestamptz NOT NULL DEFAULT now(), review_at timestamptz,
 revision integer NOT NULL DEFAULT 1, active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS reserve_ai_conversations (
 id text PRIMARY KEY, creator_id text NOT NULL REFERENCES reserve_users(id),
 scope text NOT NULL CHECK(scope IN ('founder','provider','shared')),
 provider_id text REFERENCES reserve_providers(id),
 title text NOT NULL CHECK(char_length(title) BETWEEN 1 AND 90),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reserve_ai_members (
 conversation_id text NOT NULL REFERENCES reserve_ai_conversations(id) ON DELETE CASCADE,
 user_id text NOT NULL REFERENCES reserve_users(id),
 provider_id text REFERENCES reserve_providers(id),
 active boolean NOT NULL DEFAULT true,
 PRIMARY KEY(conversation_id,user_id)
);
CREATE TABLE IF NOT EXISTS reserve_ai_turns (
 id text PRIMARY KEY, conversation_id text NOT NULL REFERENCES reserve_ai_conversations(id) ON DELETE CASCADE,
 actor_id text NOT NULL REFERENCES reserve_users(id), request_key text NOT NULL,
 prompt text NOT NULL CHECK(char_length(prompt) BETWEEN 1 AND 3000),
 answer text NOT NULL DEFAULT '', status text NOT NULL CHECK(status IN ('pending','ready','failed','interrupted')),
 error_code text, evidence jsonb NOT NULL DEFAULT '[]', usage jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
 UNIQUE(actor_id,request_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS reserve_ai_one_pending ON reserve_ai_turns(conversation_id) WHERE status='pending';
CREATE INDEX IF NOT EXISTS reserve_ai_history ON reserve_ai_turns(conversation_id,created_at DESC);
CREATE INDEX IF NOT EXISTS reserve_ai_attempts ON reserve_ai_turns(actor_id,created_at DESC);
CREATE INDEX IF NOT EXISTS reserve_work_scope ON reserve_workspace_items(visibility,provider_id,updated_at DESC);
ALTER TABLE reserve_command_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_business_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_ai_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_ai_turns ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS reserve_ai_budget_lock (id text PRIMARY KEY);
INSERT INTO reserve_ai_budget_lock(id) VALUES('business') ON CONFLICT DO NOTHING;
ALTER TABLE reserve_ai_budget_lock ENABLE ROW LEVEL SECURITY;
