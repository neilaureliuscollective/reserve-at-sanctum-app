-- CRM identity is separate from a login. No illustrative catalog is published.
CREATE TABLE IF NOT EXISTS reserve_clients (
 id text PRIMARY KEY, provider_id text NOT NULL REFERENCES reserve_providers(id),
 user_id text REFERENCES reserve_users(id), name text NOT NULL,
 email text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '',
 source text NOT NULL DEFAULT 'manual', source_key text,
 created_by text NOT NULL REFERENCES reserve_users(id), revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider_id,source,source_key), UNIQUE(provider_id,id),
 CHECK(length(name) BETWEEN 1 AND 100)
);
CREATE UNIQUE INDEX IF NOT EXISTS reserve_client_user_link ON reserve_clients(provider_id,user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reserve_client_contacts ON reserve_clients(provider_id,email,phone);
ALTER TABLE reserve_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_appointments ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE reserve_appointments ADD COLUMN IF NOT EXISTS crm_client_id text;
ALTER TABLE reserve_appointments ADD COLUMN IF NOT EXISTS created_by text REFERENCES reserve_users(id);
ALTER TABLE reserve_appointments ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'online';
-- Composite FK stops a CRM client from being booked under another provider.
ALTER TABLE reserve_appointments DROP CONSTRAINT IF EXISTS reserve_appointment_crm_scope;
ALTER TABLE reserve_appointments ADD CONSTRAINT reserve_appointment_crm_scope FOREIGN KEY(provider_id,crm_client_id) REFERENCES reserve_clients(provider_id,id);
ALTER TABLE reserve_appointments DROP CONSTRAINT IF EXISTS reserve_appointment_client_present;
ALTER TABLE reserve_appointments ADD CONSTRAINT reserve_appointment_client_present CHECK(client_id IS NOT NULL OR crm_client_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS reserve_manual_request ON reserve_appointments(created_by,request_key) WHERE source='manual';
CREATE INDEX IF NOT EXISTS reserve_crm_history ON reserve_appointments(crm_client_id,starts_at);
CREATE TABLE IF NOT EXISTS reserve_booking_messages (
 id text PRIMARY KEY, appointment_id text NOT NULL REFERENCES reserve_appointments(id),
 revision integer NOT NULL, kind text NOT NULL CHECK(kind IN ('booked','reschedule','cancel','reminder')),
 state text NOT NULL DEFAULT 'manual_required' CHECK(state IN ('manual_required','confirmed_manual','superseded','sent','failed')),
 attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
 handled_by text REFERENCES reserve_users(id), handled_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(appointment_id,revision,kind)
);
ALTER TABLE reserve_booking_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS reserve_booking_message_queue ON reserve_booking_messages(state,available_at);
CREATE TABLE IF NOT EXISTS reserve_client_imports (
 id text PRIMARY KEY, provider_id text NOT NULL REFERENCES reserve_providers(id),
 source text NOT NULL, created_by text NOT NULL REFERENCES reserve_users(id),
 summary jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reserve_client_imports ENABLE ROW LEVEL SECURITY;


INSERT INTO reserve_clients(id,provider_id,user_id,name,email,source,source_key,created_by)
 SELECT 'account:'||a.provider_id||':'||u.id,a.provider_id,u.id,u.name,lower(u.email),'account',u.id,u.id
 FROM reserve_appointments a JOIN reserve_users u ON u.id=a.client_id GROUP BY a.provider_id,u.id,u.name,u.email
 ON CONFLICT DO NOTHING;
UPDATE reserve_appointments a SET crm_client_id=c.id FROM reserve_clients c WHERE a.crm_client_id IS NULL AND a.client_id=c.user_id AND a.provider_id=c.provider_id;
