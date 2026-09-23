CREATE TABLE IF NOT EXISTS reserve_workspace_items (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK(kind IN ('idea','feedback','decision','task')),
  lane text NOT NULL CHECK(lane IN ('reserve','fix-it','gent')),
  title text NOT NULL CHECK(char_length(title) BETWEEN 1 AND 90),
  detail text NOT NULL DEFAULT '' CHECK(char_length(detail) <= 600),
  assignee text NOT NULL DEFAULT 'both' CHECK(assignee IN ('neil','katie','both')),
  status text NOT NULL DEFAULT 'captured' CHECK(status IN ('captured','building','review','approved')),
  created_by text NOT NULL REFERENCES reserve_users(id),
  updated_by text NOT NULL REFERENCES reserve_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reserve_workspace_status_updated
  ON reserve_workspace_items(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS reserve_workspace_lane_updated
  ON reserve_workspace_items(lane, updated_at DESC);
ALTER TABLE reserve_workspace_items ENABLE ROW LEVEL SECURITY;
