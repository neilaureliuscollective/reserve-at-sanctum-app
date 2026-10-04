-- Shopify owns commerce; these records are verified mirrors, never a second stock ledger.
CREATE TABLE reserve_shopify_locations (
 location_id text PRIMARY KEY REFERENCES reserve_locations(id),
 shop_domain text NOT NULL CHECK(shop_domain ~ '^[a-z0-9][a-z0-9-]*\.myshopify\.com$'),
 shopify_location_id text NOT NULL CHECK(shopify_location_id ~ '^gid://shopify/Location/[0-9]+$'),
 enabled boolean NOT NULL DEFAULT false, verified_at timestamptz NOT NULL DEFAULT now(),
 scan_from timestamptz, scan_until timestamptz, scan_cursor text, scan_checked_at timestamptz,
 UNIQUE(shop_domain,shopify_location_id)
);
CREATE TABLE reserve_shopify_orders (
 id text PRIMARY KEY, shop_domain text NOT NULL, shopify_order_id text NOT NULL,
 location_id text NOT NULL REFERENCES reserve_locations(id), name text NOT NULL,
 financial_status text NOT NULL, currency text NOT NULL CHECK(currency='USD'),
 total integer NOT NULL CHECK(total>=0), received integer NOT NULL CHECK(received>=0),
 refunded integer NOT NULL CHECK(refunded>=0), source text NOT NULL,
 test boolean NOT NULL, cancelled boolean NOT NULL, lines jsonb NOT NULL DEFAULT '[]',
 shop_updated_at timestamptz NOT NULL, processed_at timestamptz NOT NULL, synced_at timestamptz NOT NULL DEFAULT now(), checked_at timestamptz NOT NULL DEFAULT now(),
 appointment_id text UNIQUE REFERENCES reserve_appointments(id),
 customer_id text REFERENCES reserve_customers(id), linked_by text REFERENCES reserve_users(id),
 link_reason text, linked_at timestamptz,
 UNIQUE(shop_domain,shopify_order_id),
 CHECK(shopify_order_id ~ '^gid://shopify/Order/[0-9]+$')
);
CREATE INDEX reserve_shopify_order_location ON reserve_shopify_orders(location_id,processed_at DESC);
CREATE TABLE reserve_shopify_events (
 shop_domain text NOT NULL, event_id text NOT NULL, topic text NOT NULL,
 shopify_order_id text NOT NULL, state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processed','failed','unmapped')),
 attempts integer NOT NULL DEFAULT 0, due_at timestamptz NOT NULL DEFAULT now(),
 error_code text, received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz,
 PRIMARY KEY(shop_domain,event_id)
);
ALTER TABLE reserve_shopify_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_shopify_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_shopify_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE reserve_shopify_link_history (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 sale_id text NOT NULL REFERENCES reserve_shopify_orders(id),
 appointment_id text NOT NULL REFERENCES reserve_appointments(id),
 actor_id text NOT NULL REFERENCES reserve_users(id), action text NOT NULL CHECK(action IN ('link','unlink')),
 reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reserve_shopify_link_history ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER reserve_shopify_link_history_immutable BEFORE UPDATE OR DELETE ON reserve_shopify_link_history FOR EACH ROW EXECUTE FUNCTION reserve_immutable_commerce();
