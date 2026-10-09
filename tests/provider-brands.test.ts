import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import sharp from "sharp";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import { proposeOperation, operationOverview } from "../lib/studio-operations";
import type { Actor } from "../lib/booking";
import {
  brandOverview,
  createBrandLocation,
  createBrand,
  saveBrand,
  publishBrand,
  publicBrand,
  draftBrand,
  setBrandLocations,
  storeBrandAsset,
  readBrandAsset,
  brandProfile,
} from "../lib/provider-brands";
import { katieProfile } from "../lib/provider-brand-display";
import { prepareBrandImage } from "../lib/brand-image";
import {
  providerIdentity,
  providerManifest,
  identityDestination,
  recoveryDestination,
  providerEntrance,
} from "../lib/booking-identity";
let pg: PGlite, db: Database;
const owner: Actor = {
  id: "preview-neil",
  name: "Neil",
  email: "neil@preview.invalid",
  role: "owner",
  provider_id: null,
};
const katie: Actor = {
  id: "preview-katie",
  name: "Katie",
  email: "katie@preview.invalid",
  role: "operator",
  provider_id: "katie",
};
const client: Actor = {
  id: "preview-client",
  name: "Jordan",
  email: "jordan@preview.invalid",
  role: "client",
  provider_id: null,
};
const profile = {
  ...katieProfile,
  name: "Test Studio",
  professional: "Synthetic Professional",
  title: "Independent founder",
  headline: "Synthetic preview",
  bio: "Preview only",
};
before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  db = wrapPglite(pg);
  await schema(db);
  await seed(db);
});
after(async () => pg.close());
test("onboarding is owner-only, starts disabled and never publishes synthetic services", async () => {
  await assert.rejects(
    createBrand(db, katie, {
      provider: "other",
      slug: "other-studio",
      profile,
      location: "eunice",
    }),
    /permission/,
  );
  await assert.rejects(
    createBrand(db, owner, {
      provider: "bad",
      slug: "bad-studio",
      profile,
      location: "missing",
    }),
    /existing location/,
  );
  assert.equal(
    (await db.query("SELECT id FROM reserve_providers WHERE id='bad'")).length,
    0,
  );
  const brand = await createBrand(db, owner, {
    provider: "second",
    slug: "second-studio",
    profile,
    location: "eunice",
  });
  assert.equal(brand.published, null);
  assert.equal(
    (
      await db.query("SELECT enabled FROM reserve_providers WHERE id='second'")
    )[0].enabled,
    false,
  );
  assert.equal(
    (
      await db.query(
        "SELECT * FROM reserve_services WHERE provider_id='second'",
      )
    ).length,
    0,
  );
  assert.equal(await publicBrand(db, "second-studio"), null);
  await assert.rejects(
    createBrand(db, owner, {
      provider: "third",
      slug: "second-studio",
      profile,
      location: "eunice",
    }),
    /already has/,
  );
  assert.equal(
    (await db.query("SELECT * FROM reserve_providers WHERE id='third'")).length,
    0,
  );
});
test("provider drafts stay isolated, reject cross-brand assets and stale revisions", async () => {
  await createBrand(db, owner, {
    provider: "katie",
    slug: "fix-it-shop",
    profile: katieProfile,
    location: "eunice",
  });
  await assert.rejects(
    saveBrand(db, katie, "second", 1, profile),
    /Provider access/,
  );
  await assert.rejects(draftBrand(db, katie, "second"), /Provider access/);
  await assert.rejects(brandOverview(db, client), /permission/);
  const data = await brandOverview(db, katie);
  assert.deepEqual(
    data.providers.map((p) => p.id),
    ["katie"],
  );
  const saved = await saveBrand(db, katie, "katie", 1, {
    ...katieProfile,
    bio: "A private draft",
  });
  assert.equal(saved.revision, 2);
  assert.equal(await publicBrand(db, "fix-it-shop"), null);
  await assert.rejects(
    saveBrand(db, katie, "katie", 1, katieProfile),
    /changed/,
  );
  await assert.rejects(publishBrand(db, katie, "katie", 2, true), /permission/);
  await assert.rejects(
    saveBrand(db, katie, "katie", 2, {
      ...katieProfile,
      professional: "Other person",
    }),
    /founder identity/,
  );
  const image = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "#a0bbd0" },
  })
    .png()
    .toBuffer();
  const encoded = await prepareBrandImage(image.toString("base64"));
  const upload = await storeBrandAsset(db, owner, "second", encoded);
  assert.equal(await readBrandAsset(db, upload.id, "192"), null);
  await assert.rejects(
    readBrandAsset(db, upload.id, "192", katie),
    /Provider access/,
  );
  await assert.rejects(
    saveBrand(db, katie, "katie", 2, { ...katieProfile, logo: upload.id }),
    /imagery uploaded/,
  );
  await assert.rejects(
    publishBrand(db, owner, "second", 1, true),
    /Upload a logo/,
  );
  const changed = await saveBrand(db, owner, "second", 1, {
    ...profile,
    logo: upload.id,
  });
  const published = await publishBrand(
    db,
    owner,
    "second",
    changed.revision,
    true,
  );
  assert.equal(
    (await publicBrand(db, "second-studio"))?.profile.name,
    "Test Studio",
  );
  assert.ok(await readBrandAsset(db, upload.id, "192"));
  // A new draft cannot change the public snapshot until owner publishes it.
  await saveBrand(db, owner, "second", published.revision, {
    ...profile,
    name: "Private new name",
    logo: upload.id,
  });
  assert.equal(
    (await publicBrand(db, "second-studio"))?.profile.name,
    "Test Studio",
  );
  await assert.rejects(
    publishBrand(db, owner, "second", published.revision, true),
    /changed/,
  );
  const row = await draftBrand(db, owner, "second");
  await publishBrand(db, owner, "second", row!.revision, false);
  assert.equal(await publicBrand(db, "second-studio"), null);
  assert.equal(await readBrandAsset(db, upload.id, "192"), null);
});
test("location changes require owner and revision, and preserve future appointments", async () => {
  await assert.rejects(
    createBrandLocation(db, katie, {
      id: "austin",
      name: "Synthetic Austin",
      city: "Austin",
      region: "Texas",
      timezone: "America/Chicago",
      address: "",
    }),
    /permission/,
  );
  await createBrandLocation(db, owner, {
    id: "austin",
    name: "Synthetic Austin",
    city: "Austin",
    region: "Texas",
    timezone: "America/Chicago",
    address: "",
  });
  assert.equal(
    (
      await db.query(
        "SELECT booking_enabled FROM reserve_locations WHERE id='austin'",
      )
    )[0].booking_enabled,
    false,
  );
  await assert.rejects(
    createBrandLocation(db, owner, {
      id: "austin",
      name: "Synthetic Austin",
      city: "Austin",
      region: "Texas",
      timezone: "Invalid/Zone",
      address: "",
    }),
    /IANA timezone/,
  );
  await assert.rejects(
    setBrandLocations(db, katie, "katie", 1, ["eunice"]),
    /permission/,
  );
  await assert.rejects(
    setBrandLocations(db, owner, "second", 99, ["eunice"]),
    /changed/,
  );
  await assert.rejects(
    setBrandLocations(db, owner, "second", 1, ["missing"]),
    /Unknown location/,
  );
  await db.query(
    "INSERT INTO reserve_appointments(id,client_id,provider_id,service_id,starts_at,ends_at,busy_until,price,request_key,original_start,location_id) VALUES('brand-future','preview-client','katie','signature',now()+interval '3 days',now()+interval '3 days 1 hour',now()+interval '3 days 1 hour',4500,'brand-future',now()+interval '3 days','eunice')",
  );
  await assert.rejects(
    setBrandLocations(db, owner, "katie", 1, ["austin"]),
    /future visits/,
  );
  await setBrandLocations(db, owner, "katie", 1, ["eunice", "austin"]);
  assert.equal(
    (
      await db.query(
        "SELECT * FROM reserve_provider_locations WHERE provider_id='katie'",
      )
    ).length,
    2,
  );
  assert.equal(
    (
      await db.query(
        "SELECT location_id FROM reserve_appointments WHERE id='brand-future'",
      )
    )[0].location_id,
    "eunice",
  );
});
test("safe image normalization rejects SVG and excessive pixels, strips metadata and creates actual PNG icons", async () => {
  await assert.rejects(
    prepareBrandImage(
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString(
        "base64",
      ),
    ),
    /PNG/,
  );
  const huge = await sharp({
    create: { width: 2100, height: 2100, channels: 3, background: "#112233" },
  })
    .png()
    .toBuffer();
  await assert.rejects(
    prepareBrandImage(huge.toString("base64")),
    /four million/,
  );
  const images = await prepareBrandImage(
    (
      await sharp({
        create: { width: 200, height: 100, channels: 3, background: "#112233" },
      })
        .jpeg()
        .toBuffer()
    ).toString("base64"),
  );
  assert.equal((await sharp(images.image).metadata()).format, "webp");
  for (const size of [180, 192, 512] as const) {
    const m = await sharp(images[`icon${size}`]).metadata();
    assert.equal(m.width, size);
    assert.equal(m.height, size);
    assert.equal(m.format, "png");
    assert.equal(m.exif, undefined);
  }
  await assert.rejects(
    storeBrandAsset(db, katie, "second", images),
    /Provider access/,
  );
});
test("themes and links are bounded and independent with safe auth returns", () => {
  assert.equal(
    brandProfile.safeParse({ ...profile, theme: "#ffffff" }).success,
    false,
  );
  assert.equal(
    brandProfile.safeParse({ ...profile, accent: "url(javascript:foo)" })
      .success,
    false,
  );
  const a = providerIdentity(
    "second-studio",
    "second",
    "Test Studio",
    "Test Person",
    "#14291e",
  );
  const b = providerIdentity(
    "third-studio",
    "third",
    "Third",
    "Test Other",
    "#14291e",
  );
  const manifest = providerManifest(
    a,
    (size) => `/providers/second-studio/icons/${size}`,
  );
  assert.notEqual(manifest.id, providerManifest(b, () => "icon").id);
  assert.ok(manifest.start_url!.startsWith(manifest.scope!));
  assert.ok(
    manifest.shortcuts!.every((x) => x.url.startsWith(manifest.scope!)),
  );
  assert.equal(
    identityDestination(a, a.book + "?service=test"),
    a.book + "?service=test",
  );
  for (const url of [
    "https://evil.invalid",
    "//evil.invalid",
    a.base + "/../../../studio",
    a.base + "/%2e%2e/%2e%2e/studio",
    b.visits,
  ])
    assert.equal(identityDestination(a, url), a.visits);
  assert.equal(providerEntrance(a.book), a.signin);
  assert.equal(
    recoveryDestination(a.base + "/reset-password"),
    a.base + "/reset-password",
  );
  assert.equal(recoveryDestination("https://evil.invalid"), "/reset-password");
  assert.equal(
    recoveryDestination(a.base + "/../../studio"),
    "/reset-password",
  );
});
test("new tables retain RLS and have no public policies or grants", async () => {
  for (const table of [
    "reserve_provider_brands",
    "reserve_provider_brand_assets",
    "reserve_provider_brand_events",
  ]) {
    assert.equal(
      (
        await db.query("SELECT relrowsecurity FROM pg_class WHERE relname=$1", [
          table,
        ])
      )[0].relrowsecurity,
      true,
    );
    assert.equal(
      (await db.query("SELECT * FROM pg_policies WHERE tablename=$1", [table]))
        .length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "SELECT * FROM information_schema.table_privileges WHERE table_name=$1 AND grantee='PUBLIC'",
          [table],
        )
      ).length,
      0,
    );
  }
});

test("operation review evaluates visits in their own location timezone", async () => {
  await createBrandLocation(db, owner, {
    id: "new-york",
    name: "Synthetic New York",
    city: "New York",
    region: "New York",
    timezone: "America/New_York",
    address: "",
  });
  await db.query(
    "INSERT INTO reserve_services(id,provider_id,name,description,minutes,buffer,price,enabled) VALUES('brand-second','second','Synthetic','Test',60,0,1000,false)",
  );
  await db.query(
    "INSERT INTO reserve_appointments(id,client_id,provider_id,service_id,starts_at,ends_at,busy_until,price,request_key,original_start,location_id) VALUES('brand-timezone','preview-client','second','brand-second','2030-06-03T16:00:00Z','2030-06-03T17:00:00Z','2030-06-03T17:00:00Z',1000,'brand-timezone','2030-06-03T16:00:00Z','new-york')",
  );
  const p = await proposeOperation(db, owner, {
    kind: "provider",
    provider_id: "second",
    name: "Synthetic Professional",
    enabled: true,
    open_hour: 9,
    close_hour: 12,
    weekdays: [1, 2, 3, 4, 5, 6, 7],
    target_revision: 1,
    location_id: "eunice",
  });
  const data = await operationOverview(db, owner);
  assert.equal(data.proposals.find((v) => v.id === p.id)?.affected_visits, 1);
});
