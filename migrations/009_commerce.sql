CREATE TABLE reserve_commerce_settings (
 location_id text PRIMARY KEY REFERENCES reserve_locations(id), enabled boolean NOT NULL DEFAULT false,
 tax_bps integer NOT NULL DEFAULT 0 CHECK(tax_bps BETWEEN 0 AND 3000),service_taxable boolean NOT NULL DEFAULT false,
 tax_approved boolean NOT NULL DEFAULT false, tax_note text NOT NULL DEFAULT '',revision integer NOT NULL DEFAULT 1
);
INSERT INTO reserve_commerce_settings(location_id) SELECT id FROM reserve_locations;
CREATE TABLE reserve_skus (
 id text PRIMARY KEY,organization_id text NOT NULL REFERENCES reserve_organizations(id),sku text NOT NULL,
 brand text NOT NULL DEFAULT 'Legacy Reserve',name text NOT NULL,description text NOT NULL DEFAULT '',
 price integer NOT NULL CHECK(price BETWEEN 0 AND 1000000),taxable boolean NOT NULL DEFAULT true,
 enabled boolean NOT NULL DEFAULT false,revision integer NOT NULL DEFAULT 1,UNIQUE(organization_id,sku),UNIQUE(id,organization_id)
);
CREATE TABLE reserve_stock (
 location_id text NOT NULL,sku_id text NOT NULL,organization_id text NOT NULL,
 on_hand integer NOT NULL DEFAULT 0 CHECK(on_hand>=0),reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0 AND reserved<=on_hand),
 PRIMARY KEY(location_id,sku_id),FOREIGN KEY(location_id,organization_id) REFERENCES reserve_locations(id,organization_id),
 FOREIGN KEY(sku_id,organization_id) REFERENCES reserve_skus(id,organization_id)
);
CREATE TABLE reserve_orders (
 id text PRIMARY KEY,location_id text NOT NULL,organization_id text NOT NULL,customer_id text,
 appointment_id text REFERENCES reserve_appointments(id),created_by text NOT NULL REFERENCES reserve_users(id),request_key text NOT NULL,fingerprint text NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','paid','void','part_refunded','refunded')),
 subtotal integer NOT NULL CHECK(subtotal>=0),discount integer NOT NULL CHECK(discount>=0 AND discount<=subtotal),
 tax integer NOT NULL CHECK(tax>=0),tip integer NOT NULL CHECK(tip>=0),total integer NOT NULL CHECK(total=subtotal-discount+tax+tip AND total>0),
 refunded integer NOT NULL DEFAULT 0 CHECK(refunded>=0 AND refunded<=total),currency text NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
 tax_snapshot jsonb NOT NULL,revision integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),paid_at timestamptz,
 UNIQUE(created_by,request_key),FOREIGN KEY(location_id,organization_id) REFERENCES reserve_locations(id,organization_id),
 FOREIGN KEY(customer_id,organization_id) REFERENCES reserve_customers(id,organization_id)
);
CREATE UNIQUE INDEX reserve_one_visit_sale ON reserve_orders(appointment_id) WHERE status<>'void';
CREATE TABLE reserve_order_lines (
 id text PRIMARY KEY,order_id text NOT NULL REFERENCES reserve_orders(id),sku_id text REFERENCES reserve_skus(id),
 kind text NOT NULL CHECK(kind IN ('service','product')),name text NOT NULL,quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 100),
 unit_price integer NOT NULL CHECK(unit_price>=0),discount integer NOT NULL CHECK(discount>=0),tax integer NOT NULL CHECK(tax>=0),
 CHECK(discount<=quantity*unit_price),CHECK((kind='product')=(sku_id IS NOT NULL))
);
CREATE TABLE reserve_stock_movements (
 id text PRIMARY KEY,location_id text NOT NULL,sku_id text NOT NULL,actor_id text NOT NULL,order_id text REFERENCES reserve_orders(id),
 delta integer NOT NULL,reserved_delta integer NOT NULL DEFAULT 0,kind text NOT NULL CHECK(kind IN ('adjust','reserve','release','sale','return')),
 reason text NOT NULL,request_key text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(actor_id,request_key),FOREIGN KEY(location_id,sku_id) REFERENCES reserve_stock(location_id,sku_id)
);
CREATE TABLE reserve_payments (
 id text PRIMARY KEY,order_id text NOT NULL UNIQUE REFERENCES reserve_orders(id),method text NOT NULL CHECK(method IN ('cash','stripe')),
 state text NOT NULL CHECK(state IN ('creating','pending','succeeded','expired','review')),
 session_id text UNIQUE,payment_intent text UNIQUE,checkout_url text,expires_at timestamptz,amount integer NOT NULL CHECK(amount>0),
 created_at timestamptz NOT NULL DEFAULT now(),settled_at timestamptz,error_code text
);
CREATE TABLE reserve_refunds (
 id text PRIMARY KEY,order_id text NOT NULL REFERENCES reserve_orders(id),created_by text NOT NULL,request_key text NOT NULL,
 amount integer NOT NULL CHECK(amount>0),reason text NOT NULL,state text NOT NULL CHECK(state IN ('creating','pending','succeeded','failed')),
 processor_id text UNIQUE,error_code text,settled_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(created_by,request_key)
);
CREATE TABLE reserve_returns (
 id text PRIMARY KEY,line_id text NOT NULL REFERENCES reserve_order_lines(id),quantity integer NOT NULL CHECK(quantity>0),
 actor_id text NOT NULL,reason text NOT NULL,request_key text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(actor_id,request_key)
);
CREATE TABLE reserve_payment_events (
 id text PRIMARY KEY,type text NOT NULL,object_id text NOT NULL,order_id text REFERENCES reserve_orders(id),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processed','failed','ignored')),
 error_code text,attempts integer NOT NULL DEFAULT 0,due_at timestamptz NOT NULL DEFAULT now(),created_at timestamptz NOT NULL DEFAULT now(),processed_at timestamptz
);
CREATE INDEX reserve_commerce_day ON reserve_orders(location_id,created_at,id);
CREATE INDEX reserve_event_pending ON reserve_payment_events(state,created_at);
ALTER TABLE reserve_commerce_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_payment_events ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION reserve_immutable_commerce() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Commercial history is append-only'; END $$;
REVOKE ALL ON FUNCTION reserve_immutable_commerce() FROM PUBLIC;
CREATE TRIGGER reserve_lines_immutable BEFORE UPDATE OR DELETE ON reserve_order_lines FOR EACH ROW EXECUTE FUNCTION reserve_immutable_commerce();
CREATE TRIGGER reserve_movements_immutable BEFORE UPDATE OR DELETE ON reserve_stock_movements FOR EACH ROW EXECUTE FUNCTION reserve_immutable_commerce();
CREATE TRIGGER reserve_returns_immutable BEFORE UPDATE OR DELETE ON reserve_returns FOR EACH ROW EXECUTE FUNCTION reserve_immutable_commerce();
