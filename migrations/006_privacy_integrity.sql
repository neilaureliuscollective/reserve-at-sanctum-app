ALTER TABLE reserve_chair_profiles ADD COLUMN provider_id text NOT NULL DEFAULT 'katie';
ALTER TABLE reserve_chair_notes DROP CONSTRAINT reserve_chair_notes_provider_id_check;
ALTER TABLE reserve_chair_notes ADD CONSTRAINT reserve_note_provider FOREIGN KEY(provider_id) REFERENCES reserve_providers(id);
ALTER TABLE reserve_chair_notes DROP CONSTRAINT reserve_chair_notes_pkey;
ALTER TABLE reserve_chair_notes ADD PRIMARY KEY(user_id,provider_id);
ALTER TABLE reserve_customers ADD CONSTRAINT reserve_customer_org UNIQUE(id,organization_id);
ALTER TABLE reserve_appointments ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE reserve_appointments ADD CONSTRAINT reserve_visit_customer FOREIGN KEY(customer_id,organization_id) REFERENCES reserve_customers(id,organization_id);
ALTER TABLE reserve_services ADD CONSTRAINT reserve_offering_identity UNIQUE(id,provider_id,location_id,organization_id);
ALTER TABLE reserve_appointments ADD CONSTRAINT reserve_visit_offering FOREIGN KEY(service_id,provider_id,location_id,organization_id) REFERENCES reserve_services(id,provider_id,location_id,organization_id);
ALTER TABLE reserve_access ADD CONSTRAINT reserve_access_assignment FOREIGN KEY(provider_id,location_id) REFERENCES reserve_provider_locations(provider_id,location_id);
ALTER TABLE reserve_users ADD COLUMN identity_verified boolean NOT NULL DEFAULT false;
CREATE INDEX reserve_outbox_due ON reserve_outbox(state,due_at);
CREATE INDEX reserve_customer_search ON reserve_customers(organization_id,name);
-- Preserve legacy operating hours as location intervals, pending operator approval.
INSERT INTO reserve_hours(id,location_id,weekday,start_minute,end_minute)
 SELECT 'legacy:location:'||weekday,'eunice',weekday,min(start_minute),max(end_minute)
 FROM reserve_hours WHERE location_id='eunice' AND provider_id IS NOT NULL AND day IS NULL GROUP BY weekday;
