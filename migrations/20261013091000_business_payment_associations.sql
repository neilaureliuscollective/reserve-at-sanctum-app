-- Payment evidence only. No payment creation, accounting ledger, billing jobs,
-- subscription activation or changes to the shared appointment scheduler.
CREATE UNIQUE INDEX IF NOT EXISTS reserve_appointment_provider_pair ON reserve_appointments(id,provider_id);
CREATE TABLE IF NOT EXISTS reserve_business_square_locations (
 business_id text NOT NULL REFERENCES reserve_businesses(id),
 seller_id text NOT NULL, square_location_id text NOT NULL,
 environment text NOT NULL CHECK(environment IN ('sandbox','production')),
 PRIMARY KEY(business_id,environment), UNIQUE(environment,seller_id,square_location_id)
);
CREATE TABLE IF NOT EXISTS reserve_appointment_payment_links (
 id text PRIMARY KEY, business_id text NOT NULL, provider_id text NOT NULL, appointment_id text NOT NULL,
 processor text NOT NULL DEFAULT 'square' CHECK(processor='square'),
 environment text NOT NULL CHECK(environment IN ('sandbox','production')),
 seller_id text NOT NULL, external_payment_id text NOT NULL, external_location_id text NOT NULL,
 state text NOT NULL CHECK(state IN ('APPROVED','PENDING','COMPLETED','CANCELED','FAILED')),
 amount_cents integer NOT NULL CHECK(amount_cents>=0), currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 observed_at timestamptz NOT NULL, recorded_by text NOT NULL REFERENCES reserve_users(id),
 FOREIGN KEY(business_id,provider_id) REFERENCES reserve_business_providers(business_id,provider_id),
 FOREIGN KEY(appointment_id,provider_id) REFERENCES reserve_appointments(id,provider_id),
 UNIQUE(environment,seller_id,external_payment_id)
);
CREATE TABLE IF NOT EXISTS reserve_business_subscription_entitlements (
 business_id text PRIMARY KEY REFERENCES reserve_businesses(id),
 processor text NOT NULL DEFAULT 'stripe' CHECK(processor='stripe'),
 state text NOT NULL DEFAULT 'unconfigured' CHECK(state IN ('unconfigured','test_prepared','suspended')),
 stripe_customer_id text UNIQUE, stripe_subscription_id text UNIQUE,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reserve_business_square_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_appointment_payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_business_subscription_entitlements ENABLE ROW LEVEL SECURITY;
