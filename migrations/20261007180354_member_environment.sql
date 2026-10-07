-- Additive member environment. Historical location remains unknown unless reviewed.
ALTER TABLE reserve_users ADD COLUMN IF NOT EXISTS preferred_location_id text REFERENCES reserve_locations(id);
ALTER TABLE reserve_appointments ADD COLUMN IF NOT EXISTS location_id text REFERENCES reserve_locations(id);
CREATE INDEX IF NOT EXISTS reserve_visit_location ON reserve_appointments(location_id,starts_at);
REVOKE ALL ON reserve_locations,reserve_organizations,reserve_membership_plans,reserve_memberships,reserve_provider_locations FROM PUBLIC;
