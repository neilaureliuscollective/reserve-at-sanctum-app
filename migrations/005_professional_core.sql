-- Organization #001 owns every existing Reserve record. Defaults preserve the
-- live single-location paths while the routes begin passing explicit scope.
CREATE TABLE reserve_organizations (
  id text PRIMARY KEY, name text NOT NULL, brand_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reserve_organizations ENABLE ROW LEVEL SECURITY;
INSERT INTO reserve_organizations(id,name,brand_key)
VALUES('reserve-at-sanctum','The Reserve at Sanctum','sanctum-petrol');
CREATE TABLE reserve_locations (
  id text PRIMARY KEY, organization_id text NOT NULL REFERENCES reserve_organizations(id),
  name text NOT NULL, time_zone text NOT NULL, enabled boolean NOT NULL DEFAULT true,
  UNIQUE(organization_id,id)
);
ALTER TABLE reserve_locations ENABLE ROW LEVEL SECURITY;
INSERT INTO reserve_locations(id,organization_id,name,time_zone)
VALUES('eunice-sanctum','reserve-at-sanctum','The Reserve at Sanctum','America/Chicago');
ALTER TABLE reserve_users ADD COLUMN organization_id text NOT NULL DEFAULT 'reserve-at-sanctum' REFERENCES reserve_organizations(id);
ALTER TABLE reserve_providers ADD COLUMN organization_id text NOT NULL DEFAULT 'reserve-at-sanctum' REFERENCES reserve_organizations(id);
ALTER TABLE reserve_services ADD COLUMN organization_id text NOT NULL DEFAULT 'reserve-at-sanctum' REFERENCES reserve_organizations(id);
ALTER TABLE reserve_appointments ADD COLUMN organization_id text NOT NULL DEFAULT 'reserve-at-sanctum' REFERENCES reserve_organizations(id);
ALTER TABLE reserve_occupancy ADD COLUMN organization_id text NOT NULL DEFAULT 'reserve-at-sanctum' REFERENCES reserve_organizations(id);
ALTER TABLE reserve_sessions ADD COLUMN organization_id text NOT NULL DEFAULT 'reserve-at-sanctum' REFERENCES reserve_organizations(id);
ALTER TABLE reserve_audit ADD COLUMN organization_id text NOT NULL DEFAULT 'reserve-at-sanctum' REFERENCES reserve_organizations(id);
ALTER TABLE reserve_grooming_profiles ADD COLUMN organization_id text NOT NULL DEFAULT 'reserve-at-sanctum' REFERENCES reserve_organizations(id);
ALTER TABLE reserve_chair_profiles ADD COLUMN organization_id text NOT NULL DEFAULT 'reserve-at-sanctum' REFERENCES reserve_organizations(id);
ALTER TABLE reserve_chair_context ADD COLUMN organization_id text NOT NULL DEFAULT 'reserve-at-sanctum' REFERENCES reserve_organizations(id);
ALTER TABLE reserve_chair_notes ADD COLUMN organization_id text NOT NULL DEFAULT 'reserve-at-sanctum' REFERENCES reserve_organizations(id);
ALTER TABLE reserve_chair_funnel ADD COLUMN organization_id text NOT NULL DEFAULT 'reserve-at-sanctum' REFERENCES reserve_organizations(id);
ALTER TABLE reserve_blocks ADD COLUMN organization_id text NOT NULL DEFAULT 'reserve-at-sanctum' REFERENCES reserve_organizations(id);
ALTER TABLE reserve_workspace_items ADD COLUMN organization_id text NOT NULL DEFAULT 'reserve-at-sanctum' REFERENCES reserve_organizations(id);
ALTER TABLE reserve_providers ADD COLUMN location_id text NOT NULL DEFAULT 'eunice-sanctum';
ALTER TABLE reserve_services ADD COLUMN location_id text NOT NULL DEFAULT 'eunice-sanctum';
ALTER TABLE reserve_appointments ADD COLUMN location_id text NOT NULL DEFAULT 'eunice-sanctum';
ALTER TABLE reserve_occupancy ADD COLUMN location_id text NOT NULL DEFAULT 'eunice-sanctum';
ALTER TABLE reserve_blocks ADD COLUMN location_id text NOT NULL DEFAULT 'eunice-sanctum';
CREATE UNIQUE INDEX reserve_users_org_id ON reserve_users(organization_id,id);
CREATE UNIQUE INDEX reserve_providers_org_id ON reserve_providers(organization_id,id);
CREATE UNIQUE INDEX reserve_providers_org_location_id ON reserve_providers(organization_id,location_id,id);
CREATE UNIQUE INDEX reserve_services_org_location_id ON reserve_services(organization_id,location_id,id);
CREATE UNIQUE INDEX reserve_appointments_org_location_id ON reserve_appointments(organization_id,location_id,id);
CREATE UNIQUE INDEX reserve_appointments_org_id ON reserve_appointments(organization_id,id);
CREATE UNIQUE INDEX reserve_blocks_org_location_id ON reserve_blocks(organization_id,location_id,id);
CREATE UNIQUE INDEX reserve_chair_profiles_org_id ON reserve_chair_profiles(organization_id,user_id);
CREATE INDEX reserve_appointments_org_time ON reserve_appointments(organization_id,starts_at);
CREATE INDEX reserve_workspace_org_updated ON reserve_workspace_items(organization_id,updated_at DESC);
ALTER TABLE reserve_users ADD CONSTRAINT reserve_user_provider_scope FOREIGN KEY (organization_id,provider_id) REFERENCES reserve_providers(organization_id,id);
ALTER TABLE reserve_providers ADD CONSTRAINT reserve_provider_location_scope FOREIGN KEY (organization_id,location_id) REFERENCES reserve_locations(organization_id,id);
ALTER TABLE reserve_services ADD CONSTRAINT reserve_service_provider_scope FOREIGN KEY (organization_id,location_id,provider_id) REFERENCES reserve_providers(organization_id,location_id,id);
ALTER TABLE reserve_appointments ADD CONSTRAINT reserve_visit_client_scope FOREIGN KEY (organization_id,client_id) REFERENCES reserve_users(organization_id,id);
ALTER TABLE reserve_appointments ADD CONSTRAINT reserve_visit_provider_scope FOREIGN KEY (organization_id,location_id,provider_id) REFERENCES reserve_providers(organization_id,location_id,id);
ALTER TABLE reserve_appointments ADD CONSTRAINT reserve_visit_service_scope FOREIGN KEY (organization_id,location_id,service_id) REFERENCES reserve_services(organization_id,location_id,id);
ALTER TABLE reserve_occupancy ADD CONSTRAINT reserve_occupancy_provider_scope FOREIGN KEY (organization_id,location_id,provider_id) REFERENCES reserve_providers(organization_id,location_id,id);
ALTER TABLE reserve_occupancy ADD CONSTRAINT reserve_occupancy_visit_scope FOREIGN KEY (organization_id,location_id,appointment_id) REFERENCES reserve_appointments(organization_id,location_id,id);
ALTER TABLE reserve_occupancy ADD CONSTRAINT reserve_occupancy_block_scope FOREIGN KEY (organization_id,location_id,block_id) REFERENCES reserve_blocks(organization_id,location_id,id);
ALTER TABLE reserve_blocks ADD CONSTRAINT reserve_block_provider_scope FOREIGN KEY (organization_id,location_id,provider_id) REFERENCES reserve_providers(organization_id,location_id,id);
ALTER TABLE reserve_blocks ADD CONSTRAINT reserve_block_creator_scope FOREIGN KEY (organization_id,created_by) REFERENCES reserve_users(organization_id,id);
ALTER TABLE reserve_sessions ADD CONSTRAINT reserve_session_user_scope FOREIGN KEY (organization_id,user_id) REFERENCES reserve_users(organization_id,id);
ALTER TABLE reserve_audit ADD CONSTRAINT reserve_audit_actor_scope FOREIGN KEY (organization_id,actor_id) REFERENCES reserve_users(organization_id,id);
ALTER TABLE reserve_audit ADD CONSTRAINT reserve_audit_visit_scope FOREIGN KEY (organization_id,appointment_id) REFERENCES reserve_appointments(organization_id,id);
ALTER TABLE reserve_grooming_profiles ADD CONSTRAINT reserve_grooming_user_scope FOREIGN KEY (organization_id,user_id) REFERENCES reserve_users(organization_id,id);
ALTER TABLE reserve_chair_profiles ADD CONSTRAINT reserve_chair_user_scope FOREIGN KEY (organization_id,user_id) REFERENCES reserve_users(organization_id,id);
ALTER TABLE reserve_chair_context ADD CONSTRAINT reserve_context_chair_scope FOREIGN KEY (organization_id,user_id) REFERENCES reserve_chair_profiles(organization_id,user_id);
ALTER TABLE reserve_chair_notes ADD CONSTRAINT reserve_note_chair_scope FOREIGN KEY (organization_id,user_id) REFERENCES reserve_chair_profiles(organization_id,user_id);
ALTER TABLE reserve_chair_notes ADD CONSTRAINT reserve_note_provider_scope FOREIGN KEY (organization_id,provider_id) REFERENCES reserve_providers(organization_id,id);
ALTER TABLE reserve_chair_notes ADD CONSTRAINT reserve_note_author_scope FOREIGN KEY (organization_id,author_id) REFERENCES reserve_users(organization_id,id);
ALTER TABLE reserve_workspace_items ADD CONSTRAINT reserve_workspace_creator_scope FOREIGN KEY (organization_id,created_by) REFERENCES reserve_users(organization_id,id);
ALTER TABLE reserve_workspace_items ADD CONSTRAINT reserve_workspace_updater_scope FOREIGN KEY (organization_id,updated_by) REFERENCES reserve_users(organization_id,id);
-- Keep the legacy (day,event) key so the currently deployed event route remains
-- valid during rollout. Remove that key only when multi-shop traffic is enabled.
CREATE UNIQUE INDEX reserve_chair_funnel_org_day_event ON reserve_chair_funnel(organization_id,day,event);
