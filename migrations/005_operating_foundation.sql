CREATE TABLE reserve_organizations (
 id text PRIMARY KEY, name text NOT NULL
);
INSERT INTO reserve_organizations VALUES('reserve','Reserve at Sanctum');
CREATE TABLE reserve_locations (
 id text PRIMARY KEY, organization_id text NOT NULL REFERENCES reserve_organizations(id),
 slug text NOT NULL UNIQUE, name text NOT NULL, timezone text NOT NULL DEFAULT 'America/Chicago',
 address text NOT NULL DEFAULT '', contact text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pilot','live','paused')),
 booking_enabled boolean NOT NULL DEFAULT false,
 notice_minutes integer NOT NULL DEFAULT 120 CHECK(notice_minutes>=0),
 horizon_days integer NOT NULL DEFAULT 45 CHECK(horizon_days BETWEEN 1 AND 365),
 cancellation_minutes integer NOT NULL DEFAULT 0 CHECK(cancellation_minutes>=0),
 policy text NOT NULL DEFAULT '', revision integer NOT NULL DEFAULT 1,
 UNIQUE(id,organization_id)
);
INSERT INTO reserve_locations(id,organization_id,slug,name) VALUES('eunice','reserve','eunice','Reserve at Sanctum — Eunice');
ALTER TABLE reserve_users ADD COLUMN organization_id text NOT NULL DEFAULT 'reserve' REFERENCES reserve_organizations(id);
ALTER TABLE reserve_providers ADD COLUMN organization_id text NOT NULL DEFAULT 'reserve' REFERENCES reserve_organizations(id);
ALTER TABLE reserve_providers ADD COLUMN slug text;
UPDATE reserve_providers SET slug=id;
ALTER TABLE reserve_providers ADD CONSTRAINT reserve_provider_org UNIQUE(id,organization_id);
CREATE TABLE reserve_provider_locations (
 provider_id text NOT NULL, location_id text NOT NULL, organization_id text NOT NULL DEFAULT 'reserve',
 bookable boolean NOT NULL DEFAULT false,
 PRIMARY KEY(provider_id,location_id),
 FOREIGN KEY(provider_id,organization_id) REFERENCES reserve_providers(id,organization_id),
 FOREIGN KEY(location_id,organization_id) REFERENCES reserve_locations(id,organization_id)
);
INSERT INTO reserve_provider_locations(provider_id,location_id,bookable) SELECT id,'eunice',enabled FROM reserve_providers;
CREATE TABLE reserve_provider_brands (
 provider_id text PRIMARY KEY REFERENCES reserve_providers(id), name text NOT NULL,
 slug text NOT NULL UNIQUE, description text NOT NULL DEFAULT '', logo text NOT NULL DEFAULT ''
);
INSERT INTO reserve_provider_brands(provider_id,name,slug) SELECT id,'Fix It Shop','fix-it-shop' FROM reserve_providers WHERE id='katie';
CREATE TABLE reserve_access (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES reserve_users(id),
 organization_id text NOT NULL REFERENCES reserve_organizations(id),
 location_id text, provider_id text,
 role text NOT NULL CHECK(role IN ('owner','manager','provider','reception')),
 enabled boolean NOT NULL DEFAULT true,
 FOREIGN KEY(location_id,organization_id) REFERENCES reserve_locations(id,organization_id),
 FOREIGN KEY(provider_id,organization_id) REFERENCES reserve_providers(id,organization_id),
 CHECK((role='owner' AND location_id IS NULL AND provider_id IS NULL) OR
       (role IN ('manager','reception') AND location_id IS NOT NULL AND provider_id IS NULL) OR
       (role='provider' AND location_id IS NOT NULL AND provider_id IS NOT NULL))
);
INSERT INTO reserve_access(id,user_id,organization_id,location_id,provider_id,role)
 SELECT 'legacy:'||u.id,u.id,'reserve',CASE WHEN u.role='owner' THEN NULL ELSE 'eunice' END,
 CASE WHEN u.role='staff' THEN u.provider_id ELSE NULL END,
 CASE WHEN u.role='owner' THEN 'owner' ELSE 'provider' END
 FROM reserve_users u WHERE u.role='owner' OR (u.role='staff' AND EXISTS(SELECT 1 FROM reserve_providers p WHERE p.id=u.provider_id));
CREATE TABLE reserve_hours (
 id text PRIMARY KEY, location_id text NOT NULL REFERENCES reserve_locations(id),
 provider_id text, weekday integer CHECK(weekday BETWEEN 1 AND 7), day date,
 start_minute integer NOT NULL CHECK(start_minute BETWEEN 0 AND 1439 AND start_minute%15=0),
 end_minute integer NOT NULL CHECK(end_minute BETWEEN 1 AND 1440 AND end_minute%15=0),
 closed boolean NOT NULL DEFAULT false,
 CHECK(day IS NOT NULL OR weekday IS NOT NULL), CHECK(end_minute>start_minute),
 FOREIGN KEY(provider_id,location_id) REFERENCES reserve_provider_locations(provider_id,location_id)
);
INSERT INTO reserve_hours(id,location_id,provider_id,weekday,start_minute,end_minute)
 SELECT 'legacy:'||p.id||':'||d,'eunice',p.id,d,p.open_hour*60,p.close_hour*60 FROM reserve_providers p CROSS JOIN unnest(p.weekdays) d;
CREATE TABLE reserve_resources (
 id text PRIMARY KEY, location_id text NOT NULL REFERENCES reserve_locations(id),
 name text NOT NULL, enabled boolean NOT NULL DEFAULT true, UNIQUE(id,location_id)
);
ALTER TABLE reserve_services ADD COLUMN location_id text NOT NULL DEFAULT 'eunice' REFERENCES reserve_locations(id);
ALTER TABLE reserve_services ADD COLUMN organization_id text NOT NULL DEFAULT 'reserve' REFERENCES reserve_organizations(id);
ALTER TABLE reserve_services ADD COLUMN currency text NOT NULL DEFAULT 'USD' CHECK(currency='USD');
ALTER TABLE reserve_services ADD COLUMN resource_id text;
ALTER TABLE reserve_services ADD COLUMN revision integer NOT NULL DEFAULT 1;
ALTER TABLE reserve_services ADD CONSTRAINT reserve_service_assignment FOREIGN KEY(provider_id,location_id) REFERENCES reserve_provider_locations(provider_id,location_id);
ALTER TABLE reserve_services ADD CONSTRAINT reserve_service_place FOREIGN KEY(location_id,organization_id) REFERENCES reserve_locations(id,organization_id);
ALTER TABLE reserve_services ADD CONSTRAINT reserve_service_provider FOREIGN KEY(provider_id,organization_id) REFERENCES reserve_providers(id,organization_id);
ALTER TABLE reserve_services ADD CONSTRAINT reserve_service_resource FOREIGN KEY(resource_id,location_id) REFERENCES reserve_resources(id,location_id);
CREATE TABLE reserve_customers (
 id text PRIMARY KEY, organization_id text NOT NULL DEFAULT 'reserve' REFERENCES reserve_organizations(id),
 auth_user_id text UNIQUE REFERENCES reserve_users(id), name text NOT NULL,
 email text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO reserve_customers(id,auth_user_id,name,email) SELECT id,id,name,email FROM reserve_users;
CREATE TABLE reserve_customer_locations (
 customer_id text NOT NULL REFERENCES reserve_customers(id), location_id text NOT NULL REFERENCES reserve_locations(id),
 PRIMARY KEY(customer_id,location_id)
);
INSERT INTO reserve_customer_locations SELECT DISTINCT client_id,'eunice' FROM reserve_appointments;
ALTER TABLE reserve_appointments ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE reserve_appointments ADD COLUMN customer_id text REFERENCES reserve_customers(id);
UPDATE reserve_appointments SET customer_id=client_id;
ALTER TABLE reserve_appointments ADD COLUMN location_id text NOT NULL DEFAULT 'eunice' REFERENCES reserve_locations(id);
ALTER TABLE reserve_appointments ADD COLUMN organization_id text NOT NULL DEFAULT 'reserve' REFERENCES reserve_organizations(id);
ALTER TABLE reserve_appointments ADD COLUMN created_by text REFERENCES reserve_users(id);
UPDATE reserve_appointments SET created_by=client_id;
ALTER TABLE reserve_appointments ADD COLUMN snapshot jsonb NOT NULL DEFAULT '{}';
UPDATE reserve_appointments a SET snapshot=jsonb_build_object('service',s.name,'provider',p.name,'location',l.name,'currency','USD','timezone',l.timezone,'policy',l.policy,'offeringRevision',s.revision)
 FROM reserve_services s,reserve_providers p,reserve_locations l WHERE a.service_id=s.id AND a.provider_id=p.id AND l.id=a.location_id;
ALTER TABLE reserve_appointments DROP CONSTRAINT reserve_appointments_status_check;
ALTER TABLE reserve_appointments ADD CONSTRAINT reserve_appointments_status_check CHECK(status IN ('confirmed','checked_in','cancelled','completed','no_show'));
ALTER TABLE reserve_appointments ADD CONSTRAINT reserve_visit_assignment FOREIGN KEY(provider_id,location_id) REFERENCES reserve_provider_locations(provider_id,location_id);
CREATE UNIQUE INDEX reserve_request_actor ON reserve_appointments(created_by,request_key);
CREATE INDEX reserve_location_day ON reserve_appointments(location_id,starts_at,id);
CREATE TABLE reserve_resource_occupancy (
 resource_id text NOT NULL REFERENCES reserve_resources(id), starts_at timestamptz NOT NULL,
 appointment_id text NOT NULL REFERENCES reserve_appointments(id) ON DELETE CASCADE,
 PRIMARY KEY(resource_id,starts_at)
);
CREATE TABLE reserve_operation_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id text NOT NULL,
 location_id text REFERENCES reserve_locations(id), entity_id text NOT NULL, action text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE reserve_outbox (
 id text PRIMARY KEY, appointment_id text NOT NULL REFERENCES reserve_appointments(id),
 revision integer NOT NULL, kind text NOT NULL CHECK(kind IN ('confirmed','rescheduled','cancelled','reminder')),
 due_at timestamptz NOT NULL DEFAULT now(), state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent','failed','suppressed','manual')),
 attempts integer NOT NULL DEFAULT 0, locked_until timestamptz, provider_id text, error_code text,
 UNIQUE(appointment_id,revision,kind)
);
CREATE TABLE reserve_external_collections (
 id text PRIMARY KEY, appointment_id text NOT NULL REFERENCES reserve_appointments(id),
 location_id text NOT NULL REFERENCES reserve_locations(id), amount integer NOT NULL CHECK(amount>0),
 currency text NOT NULL DEFAULT 'USD' CHECK(currency='USD'), method text NOT NULL CHECK(method IN ('cash','external')),
 reference text NOT NULL DEFAULT '', created_by text NOT NULL REFERENCES reserve_users(id),
 request_key text NOT NULL, reversed_by text REFERENCES reserve_users(id), reversal_reason text,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(created_by,request_key)
);
CREATE TABLE reserve_rate_limits (
 key text PRIMARY KEY, window_start timestamptz NOT NULL, total integer NOT NULL
);
ALTER TABLE reserve_blocks ADD COLUMN location_id text NOT NULL DEFAULT 'eunice' REFERENCES reserve_locations(id);
ALTER TABLE reserve_workspace_items ADD COLUMN location_id text NOT NULL DEFAULT 'eunice' REFERENCES reserve_locations(id);
-- No new browser Data API grants. All operational reads and writes pass verified server authorization.
ALTER TABLE reserve_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_provider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_provider_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_customer_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_resource_occupancy ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_operation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_external_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_rate_limits ENABLE ROW LEVEL SECURITY;
