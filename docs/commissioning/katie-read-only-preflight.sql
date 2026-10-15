-- READ ONLY. Run against an independently verified target, with the intended
-- application role. Never use output as approval to migrate or grant access.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
SELECT current_database(), current_user, inet_server_addr(), version();
SELECT name, to_regclass(name) IS NOT NULL AS present
FROM unnest(ARRAY['reserve_users','reserve_providers','reserve_locations',
 'reserve_businesses','reserve_business_memberships','reserve_business_providers',
 'reserve_business_locations','reserve_business_provider_locations',
 'reserve_business_staff_assignments','reserve_business_events',
 'reserve_auth_delivery_limits','reserve_booking_request_fences','reserve_booking_messages']) AS t(name);
-- Compare these columns, types, defaults and constraints with the complete
-- reviewed migrations; presence alone is NOT sufficient commissioning evidence.
SELECT c.relname,a.attname,format_type(a.atttypid,a.atttypmod) AS type,
 a.attnotnull,pg_get_expr(d.adbin,d.adrelid) AS default_value
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
JOIN pg_attribute a ON a.attrelid=c.oid
LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
WHERE n.nspname='public' AND c.relname LIKE 'reserve_%' AND a.attnum>0 AND NOT a.attisdropped
ORDER BY c.relname,a.attnum;
SELECT conrelid::regclass AS relation,conname,pg_get_constraintdef(oid)
FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY 1,2;
SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'reserve_%';
SELECT grantee,table_name,privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name LIKE 'reserve_%' ORDER BY table_name,grantee,privilege_type;
ROLLBACK;
