ALTER TABLE reserve_workspace_items DROP CONSTRAINT IF EXISTS reserve_workspace_items_kind_check;
ALTER TABLE reserve_workspace_items ADD CONSTRAINT reserve_workspace_items_kind_check CHECK(kind IN ('idea','feedback','decision','task','content'));
ALTER TABLE reserve_workspace_items DROP CONSTRAINT IF EXISTS reserve_workspace_items_detail_check;
ALTER TABLE reserve_workspace_items ADD CONSTRAINT reserve_workspace_items_detail_check CHECK(char_length(detail)<=6000);
CREATE TABLE IF NOT EXISTS reserve_ai_usage (
 user_id text NOT NULL REFERENCES reserve_users(id) ON DELETE CASCADE,
 minute_bucket bigint NOT NULL,
 requests integer NOT NULL DEFAULT 1,
 PRIMARY KEY(user_id,minute_bucket)
);
ALTER TABLE reserve_ai_usage ENABLE ROW LEVEL SECURITY;

-- Hosted scripts/migrate.ts revokes browser-role grants through lockdownStudio.
