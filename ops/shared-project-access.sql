-- Apply once to the Gent Ascend Supabase project after migrations/001-004.
-- Set the login password out of band, then use the transaction pooler URL
-- with reserve_app.<project-ref> as DATABASE_URL in Reserve only.
-- No Gent Ascend tables or Auth admin tables are granted to this role.
CREATE ROLE reserve_app NOLOGIN;
GRANT USAGE ON SCHEMA public TO reserve_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
 reserve_users, reserve_providers, reserve_services, reserve_appointments,
 reserve_occupancy, reserve_sessions, reserve_audit,
 reserve_grooming_profiles, reserve_chair_profiles, reserve_chair_context,
 reserve_chair_notes, reserve_chair_funnel, reserve_blocks,
 reserve_workspace_items TO reserve_app;
GRANT USAGE ON SEQUENCE reserve_audit_id_seq TO reserve_app;
CREATE POLICY reserve_server_access ON reserve_users TO reserve_app USING (true) WITH CHECK (true);
CREATE POLICY reserve_server_access ON reserve_providers TO reserve_app USING (true) WITH CHECK (true);
CREATE POLICY reserve_server_access ON reserve_services TO reserve_app USING (true) WITH CHECK (true);
CREATE POLICY reserve_server_access ON reserve_appointments TO reserve_app USING (true) WITH CHECK (true);
CREATE POLICY reserve_server_access ON reserve_occupancy TO reserve_app USING (true) WITH CHECK (true);
CREATE POLICY reserve_server_access ON reserve_sessions TO reserve_app USING (true) WITH CHECK (true);
CREATE POLICY reserve_server_access ON reserve_audit TO reserve_app USING (true) WITH CHECK (true);
CREATE POLICY reserve_server_access ON reserve_grooming_profiles TO reserve_app USING (true) WITH CHECK (true);
CREATE POLICY reserve_server_access ON reserve_chair_profiles TO reserve_app USING (true) WITH CHECK (true);
CREATE POLICY reserve_server_access ON reserve_chair_context TO reserve_app USING (true) WITH CHECK (true);
CREATE POLICY reserve_server_access ON reserve_chair_notes TO reserve_app USING (true) WITH CHECK (true);
CREATE POLICY reserve_server_access ON reserve_chair_funnel TO reserve_app USING (true) WITH CHECK (true);
CREATE POLICY reserve_server_access ON reserve_blocks TO reserve_app USING (true) WITH CHECK (true);
CREATE POLICY reserve_server_access ON reserve_workspace_items TO reserve_app USING (true) WITH CHECK (true);
