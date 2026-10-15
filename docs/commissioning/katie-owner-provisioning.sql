-- REVIEW TEMPLATE ONLY. NOT EXECUTED. psql variables must be independently
-- verified UUIDs; email is deliberately not accepted as an authority input.
-- Supply user_id, founder_id and business_id (existing reviewed business).
-- The provider/location/catalog must already exist and have approved mappings.
-- This script intentionally ROLLS BACK. Founder approval must name the completed
-- variables, database mapping, backup and exact code/migration manifest first.
BEGIN;
CREATE TEMP TABLE reviewed_katie_provisioning AS
SELECT :'user_id'::uuid::text AS user_id, :'founder_id'::uuid::text AS founder_id,
       :'business_id'::text AS business_id;
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM reviewed_katie_provisioning r
   JOIN auth.users a ON a.id::text=r.user_id AND a.email_confirmed_at IS NOT NULL
   JOIN reserve_users u ON u.id=r.user_id AND u.role<>'owner'
   JOIN reserve_users f ON f.id=r.founder_id AND f.role='owner'
   JOIN reserve_businesses b ON b.id=r.business_id AND b.slug='fix-it-shop' AND b.state<>'archived'
   JOIN reserve_business_providers bp ON bp.business_id=b.id AND bp.provider_id='katie'
   JOIN reserve_business_provider_locations pl ON pl.business_id=b.id AND pl.provider_id=bp.provider_id)
 THEN RAISE EXCEPTION 'Confirmed identity, Founder, business and approved provider/location mapping must all match'; END IF;
 IF EXISTS(SELECT 1 FROM reserve_business_memberships m JOIN reviewed_katie_provisioning r ON m.user_id=r.user_id AND m.business_id=r.business_id)
 THEN RAISE EXCEPTION 'Membership already exists; review its current role/revocation rather than overwriting'; END IF;
END $$;
-- Normalize legacy authority as part of the same reviewed transaction. Retain
-- account ID/history; no account duplication, password change or Chair grant.
UPDATE reserve_users u SET role='client',provider_id=NULL
FROM reviewed_katie_provisioning r WHERE u.id=r.user_id;
INSERT INTO reserve_business_memberships(business_id,user_id,role,verified_at,verified_by)
SELECT business_id,user_id,'business_owner',now(),founder_id FROM reviewed_katie_provisioning;
SELECT b.slug,m.role,m.revoked_at IS NULL AS active
FROM reserve_business_memberships m JOIN reviewed_katie_provisioning r USING(business_id,user_id)
JOIN reserve_businesses b ON b.id=m.business_id;
ROLLBACK;
