-- Additive Square mapping and location/provider expansion. Existing rows stay intact.
ALTER TABLE reserve_locations ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '';
ALTER TABLE reserve_locations ADD COLUMN IF NOT EXISTS booking_enabled boolean NOT NULL DEFAULT false;
UPDATE reserve_locations SET booking_enabled = true WHERE id = 'eunice' AND booking_enabled = false;

ALTER TABLE reserve_membership_plans ADD COLUMN IF NOT EXISTS benefit_model jsonb NOT NULL DEFAULT '[]';
UPDATE reserve_membership_plans SET benefit_model = '[
  {"kind":"recognition","label":"Location recognition"},
  {"kind":"product_discount","label":"Member product pricing when offered"},
  {"kind":"recognition","label":"Visit history kept with your account"}
]'::jsonb WHERE id='house' AND benefit_model = '[]'::jsonb;
UPDATE reserve_membership_plans SET benefit_model = '[
  {"kind":"recognition","label":"Everything in House"},
  {"kind":"service_benefit","label":"Perk-based services as they open"},
  {"kind":"product_discount","label":"Early access to member drops"}
]'::jsonb WHERE id='circle' AND benefit_model = '[]'::jsonb;
UPDATE reserve_membership_plans SET benefit_model = '[
  {"kind":"recognition","label":"Everything in Circle"},
  {"kind":"credits","label":"Consultation benefits as they open"},
  {"kind":"digital_access","label":"Digital access as it opens"},
  {"kind":"location_eligibility","label":"Location-specific privileges"}
]'::jsonb WHERE id='private' AND benefit_model = '[]'::jsonb;

CREATE TABLE IF NOT EXISTS reserve_provider_locations (
  provider_id text NOT NULL REFERENCES reserve_providers(id) ON DELETE CASCADE,
  location_id text NOT NULL REFERENCES reserve_locations(id) ON DELETE CASCADE,
  PRIMARY KEY (provider_id, location_id)
);

INSERT INTO reserve_provider_locations(provider_id, location_id)
SELECT id, location_id FROM reserve_providers WHERE location_id IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS square_customer_mappings (
  user_id text PRIMARY KEY REFERENCES reserve_users(id) ON DELETE CASCADE,
  square_customer_id text NOT NULL,
  square_environment text NOT NULL,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (square_customer_id, square_environment)
);

CREATE TABLE IF NOT EXISTS square_location_mappings (
  location_id text PRIMARY KEY REFERENCES reserve_locations(id) ON DELETE CASCADE,
  square_location_id text NOT NULL,
  square_environment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (square_location_id, square_environment)
);

CREATE TABLE IF NOT EXISTS square_provider_mappings (
  provider_id text PRIMARY KEY REFERENCES reserve_providers(id) ON DELETE CASCADE,
  square_team_member_id text NOT NULL,
  square_environment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (square_team_member_id, square_environment)
);

CREATE TABLE IF NOT EXISTS square_catalog_mappings (
  internal_id text NOT NULL,
  internal_kind text NOT NULL CHECK (internal_kind IN ('service','product','membership_plan')),
  square_catalog_object_id text NOT NULL,
  square_variation_id text,
  square_environment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (internal_kind, internal_id, square_environment)
);

CREATE UNIQUE INDEX IF NOT EXISTS square_catalog_object_env
  ON square_catalog_mappings(square_catalog_object_id, square_environment);

CREATE TABLE IF NOT EXISTS square_subscription_mappings (
  membership_id text PRIMARY KEY REFERENCES reserve_memberships(id) ON DELETE CASCADE,
  square_subscription_id text NOT NULL,
  square_plan_variation_id text,
  square_environment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (square_subscription_id, square_environment)
);

CREATE TABLE IF NOT EXISTS square_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  square_merchant_id text,
  square_environment text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status text NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted','processed','ignored','failed')),
  payload_digest text NOT NULL
);

ALTER TABLE square_customer_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE square_location_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE square_provider_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE square_catalog_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE square_subscription_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE square_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_provider_locations ENABLE ROW LEVEL SECURITY;
