-- Apply with the migration credential on the intended hosted database.
-- Connect the separately created application LOGIN to this group role.
-- Set its password out-of-band; never commit or paste credentials into this file.
CREATE ROLE reserve_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS;
GRANT USAGE ON SCHEMA public TO reserve_runtime;
DO $$
DECLARE t record;
BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'reserve_%' AND tablename<>'reserve_migrations'
 LOOP EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.%I TO reserve_runtime',t.tablename); END LOOP;
END $$;
GRANT USAGE,SELECT ON SEQUENCE reserve_operation_events_id_seq,reserve_audit_id_seq TO reserve_runtime;
-- No schema CREATE, auth.users access, role management or migration-ledger writes.
-- The private server validates identity and assignment scope for every request.
-- Never give this role to anon/authenticated or use it in a browser/Data API client.
