ALTER TABLE reserve_users DROP CONSTRAINT IF EXISTS reserve_users_role_check;
ALTER TABLE reserve_users ADD CONSTRAINT reserve_users_role_check CHECK(role IN ('client','staff','operator','owner'));
ALTER TABLE reserve_workspace_items ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'shared' CHECK(visibility IN ('shared','owner'));
ALTER TABLE reserve_workspace_items ADD COLUMN IF NOT EXISTS assignee_user_id text REFERENCES reserve_users(id);
ALTER TABLE reserve_workspace_items ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
ALTER TABLE reserve_workspace_items ADD COLUMN IF NOT EXISTS approved_by text REFERENCES reserve_users(id);
ALTER TABLE reserve_workspace_items ADD COLUMN IF NOT EXISTS approved_revision integer;
ALTER TABLE reserve_workspace_items ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE reserve_workspace_items ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE reserve_workspace_items ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE TABLE IF NOT EXISTS reserve_user_capabilities (
 user_id text NOT NULL REFERENCES reserve_users(id) ON DELETE CASCADE,
 capability text NOT NULL CHECK(capability IN ('studio.read','workspace.read','workspace.create','workspace.edit','workspace.request_review','workspace.approve','appointments.read','appointments.manage','blocks.manage','clients.read','chair.read','chair.notes.write','operations.configure','finance.read','users.admin')),
 decision text NOT NULL CHECK(decision IN ('allow','deny')),
 scope text NOT NULL CHECK(scope IN ('company','shared','provider','assigned')),
 granted_by text NOT NULL REFERENCES reserve_users(id),
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,capability,scope)
);
CREATE TABLE IF NOT EXISTS reserve_workspace_events (
 id text PRIMARY KEY, item_id text NOT NULL REFERENCES reserve_workspace_items(id),
 actor_id text NOT NULL REFERENCES reserve_users(id), action text NOT NULL,
 revision integer NOT NULL, feedback text NOT NULL DEFAULT '' CHECK(length(feedback)<=600),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reserve_workspace_assignee ON reserve_workspace_items(assignee_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS reserve_workspace_events_item ON reserve_workspace_events(item_id, created_at DESC);
ALTER TABLE reserve_user_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_workspace_events ENABLE ROW LEVEL SECURITY;

UPDATE reserve_workspace_items SET assignee_user_id=CASE WHEN assignee='both' THEN created_by WHEN assignee='neil' THEN (SELECT max(id) FROM reserve_users WHERE role='owner' HAVING count(*)=1) WHEN assignee='katie' THEN (SELECT max(id) FROM reserve_users WHERE role IN ('operator','staff') AND provider_id='katie' HAVING count(*)=1) END WHERE assignee_user_id IS NULL;
UPDATE reserve_workspace_items SET status='review' WHERE status='approved' AND approved_revision IS NULL;
