CREATE TABLE IF NOT EXISTS reserve_users (
 id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
 role text NOT NULL DEFAULT 'client' CHECK(role IN ('client','staff','owner')),
 provider_id text
);
CREATE TABLE IF NOT EXISTS reserve_providers (
 id text PRIMARY KEY, name text NOT NULL, enabled boolean NOT NULL DEFAULT false,
 open_hour integer NOT NULL DEFAULT 9, close_hour integer NOT NULL DEFAULT 17,
 weekdays integer[] NOT NULL DEFAULT '{2,3,4,5,6}'
);
CREATE TABLE IF NOT EXISTS reserve_services (
 id text PRIMARY KEY, provider_id text NOT NULL REFERENCES reserve_providers(id),
 name text NOT NULL, description text NOT NULL,
 minutes integer NOT NULL CHECK(minutes>0 AND minutes%15=0),
 buffer integer NOT NULL DEFAULT 15 CHECK(buffer>=0 AND buffer%15=0),
 price integer NOT NULL CHECK(price>=0), enabled boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS reserve_appointments (
 id text PRIMARY KEY, client_id text NOT NULL REFERENCES reserve_users(id),
 provider_id text NOT NULL REFERENCES reserve_providers(id),
 service_id text NOT NULL REFERENCES reserve_services(id),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 busy_until timestamptz NOT NULL, price integer NOT NULL,
 status text NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled','completed')),
 note text NOT NULL DEFAULT '', request_key text NOT NULL,
 original_start timestamptz NOT NULL,
 revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(client_id,request_key), CHECK(starts_at < ends_at AND ends_at <= busy_until)
);
-- Every 15-minute unit of service + buffer is claimed atomically.
-- Staff blocks must use the same occupancy ledger.
CREATE TABLE IF NOT EXISTS reserve_occupancy (
 provider_id text NOT NULL REFERENCES reserve_providers(id),
 starts_at timestamptz NOT NULL,
 appointment_id text REFERENCES reserve_appointments(id) ON DELETE CASCADE,
 block_reason text,
 PRIMARY KEY(provider_id,starts_at),
 CHECK(appointment_id IS NOT NULL OR block_reason IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS reserve_sessions (
 token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES reserve_users(id),
 expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS reserve_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id text NOT NULL,
 appointment_id text NOT NULL, action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reserve_client_visits ON reserve_appointments(client_id,starts_at);
CREATE INDEX IF NOT EXISTS reserve_provider_visits ON reserve_appointments(provider_id,starts_at);
-- Private access is exclusively through authorized server routes. No browser SQL access.
ALTER TABLE reserve_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_occupancy ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_audit ENABLE ROW LEVEL SECURITY;
