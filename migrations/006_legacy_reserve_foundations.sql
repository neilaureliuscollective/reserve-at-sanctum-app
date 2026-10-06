-- Additive Legacy Reserve foundations. Existing booking, auth, and occupancy stay intact.
CREATE TABLE IF NOT EXISTS reserve_locations (
  id text PRIMARY KEY,
  name text NOT NULL,
  short_name text NOT NULL,
  city text NOT NULL,
  region text NOT NULL DEFAULT '',
  timezone text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'planned' CHECK(status IN ('operating','coming','planned')),
  presentation jsonb NOT NULL DEFAULT '{}'
);

INSERT INTO reserve_locations(id,name,short_name,city,region,timezone,enabled,status) VALUES
 ('eunice','Eunice, Louisiana','Eunice','Eunice','Louisiana','America/Chicago',true,'operating'),
 ('lafayette','Lafayette, Louisiana','Lafayette','Lafayette','Louisiana','America/Chicago',false,'planned'),
 ('austin','Austin, Texas','Austin','Austin','Texas','America/Chicago',false,'planned'),
 ('dallas','Dallas, Texas','Dallas','Dallas','Texas','America/Chicago',false,'planned')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE reserve_providers ADD COLUMN IF NOT EXISTS location_id text REFERENCES reserve_locations(id);
UPDATE reserve_providers SET location_id='eunice' WHERE location_id IS NULL;

CREATE TABLE IF NOT EXISTS reserve_membership_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  benefits jsonb NOT NULL DEFAULT '[]',
  active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);

INSERT INTO reserve_membership_plans(id,name,tagline,benefits,active,sort_order) VALUES
 ('house','House','Belong to a Legacy Reserve location.','["Location recognition","Member product pricing when offered","Visit history kept with your account"]',false,1),
 ('circle','Circle','Recurring care and included visits, when the house is ready.','["Everything in House","Perk-based services as they open","Early access to member drops"]',false,2),
 ('private','Private','Consultation, digital benefits, and future performance partners.','["Everything in Circle","Consultation benefits as they open","Location-specific privileges"]',false,3)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS reserve_memberships (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES reserve_users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES reserve_membership_plans(id),
  location_id text REFERENCES reserve_locations(id),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','paused','ended')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, plan_id)
);

ALTER TABLE reserve_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_memberships ENABLE ROW LEVEL SECURITY;
