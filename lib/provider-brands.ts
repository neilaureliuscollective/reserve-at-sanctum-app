import { z } from "zod";
import { randomUUID } from "node:crypto";
import { BookingError, type Actor } from "./booking";
import type { Database, Queryable, Row } from "./db";
import { requireCapability } from "./studio-permissions";
export const brandSlug = z
  .string()
  .trim()
  .min(3)
  .max(60)
  .regex(/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const asset = z.uuid().nullable();
export const brandProfile = z
  .object({
    name: z.string().trim().min(2).max(60),
    professional: z.string().trim().min(2).max(80),
    title: z.string().trim().min(2).max(80),
    headline: z.string().trim().min(2).max(120),
    bio: z.string().trim().max(1200),
    theme: color,
    accent: color,
    logo: asset,
    cover: asset,
  })
  .strict()
  .superRefine((p, ctx) => {
    if (
      contrast(p.theme, "#f4efe6") < 7 ||
      contrast(p.theme, p.accent) < 4.5 ||
      contrast(p.accent, "#070b10") < 4.5
    )
      ctx.addIssue({
        code: "custom",
        message: "Choose a dark theme and light accent with readable contrast.",
      });
  });
export type BrandProfile = z.infer<typeof brandProfile>;
export type BrandRow = Row & {
  provider_id: string;
  slug: string;
  draft: BrandProfile;
  published: BrandProfile | null;
  revision: number;
  published_revision: number | null;
};
export function contrast(a: string, b: string) {
  const lum = (s: string) => {
    const x = [1, 3, 5]
      .map((i) => parseInt(s.slice(i, i + 2), 16) / 255)
      .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
    return x[0] * 0.2126 + x[1] * 0.7152 + x[2] * 0.0722;
  };
  const x = lum(a),
    y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export {
  katieProfile,
  brandIdentity,
  brandAsset,
  logoFor,
} from "./provider-brand-display";
import { katieProfile } from "./provider-brand-display";
function scope(a: Actor, provider?: string, edit = false) {
  requireCapability(a, "studio.read");
  requireCapability(a, edit ? "workspace.edit" : "appointments.read");
  if (
    a.role !== "owner" &&
    (!a.provider_id || (provider && a.provider_id !== provider))
  )
    throw new BookingError("Provider access is required.", 403);
  return a.role === "owner" ? provider : a.provider_id!;
}
function owner(a: Actor) {
  requireCapability(a, "operations.configure");
  if (a.role !== "owner")
    throw new BookingError("Owner approval is required.", 403);
}
async function event(
  db: Queryable,
  a: Actor,
  p: string,
  action: string,
  revision: number,
) {
  await db.query(
    "INSERT INTO reserve_provider_brand_events(id,provider_id,actor_id,action,revision) VALUES($1,$2,$3,$4,$5)",
    [randomUUID(), p, a.id, action, revision],
  );
}
function identityRules(provider: string, slug: string, p: BrandProfile) {
  if (
    provider === "katie" &&
    (slug !== "fix-it-shop" ||
      p.name !== "Fix It Shop" ||
      p.professional !== "Katie Guidry" ||
      p.title !== "Founder of Fix It Shop")
  )
    throw new BookingError(
      "Preserve Katie Guidry’s Fix It Shop founder identity.",
    );
  if (
    provider !== "katie" &&
    ["fix-it-shop", "legacy-reserve", "studio", "admin"].includes(slug)
  )
    throw new BookingError("That booking link is reserved.");
}
async function validateAssets(
  db: Queryable,
  provider: string,
  p: BrandProfile,
) {
  for (const id of [p.logo, p.cover].filter(Boolean)) {
    if (
      !(
        await db.query(
          "SELECT id FROM reserve_provider_brand_assets WHERE id=$1 AND provider_id=$2",
          [id, provider],
        )
      ).length
    )
      throw new BookingError("Use imagery uploaded for this provider.", 403);
  }
}
export async function brandOverview(db: Queryable, a: Actor) {
  const p = scope(a);
  const providers = await db.query(
    `SELECT p.id,p.name,p.enabled,p.revision,b.slug,b.draft,b.published,b.revision AS brand_revision,b.published_revision,
 (SELECT count(*)::int FROM reserve_services s WHERE s.provider_id=p.id AND s.enabled) AS services,
 (SELECT count(*)::int FROM reserve_users u WHERE u.provider_id=p.id AND u.role IN ('staff','operator')) AS staff,
 (SELECT count(*)::int FROM reserve_appointments v WHERE v.provider_id=p.id AND v.status='confirmed' AND v.starts_at>now()) AS upcoming,
 COALESCE((SELECT jsonb_agg(pl.location_id ORDER BY pl.location_id) FROM reserve_provider_locations pl WHERE pl.provider_id=p.id),'[]'::jsonb) AS locations
 FROM reserve_providers p LEFT JOIN reserve_provider_brands b ON b.provider_id=p.id WHERE ${p ? "p.id=$1" : "TRUE"} ORDER BY p.name`,
    p ? [p] : [],
  );
  const locations = await db.query(
    "SELECT id,name,city,region,enabled,booking_enabled,status FROM reserve_locations ORDER BY name",
  );
  return { providers, locations, owner: a.role === "owner" };
}
export async function createBrand(db: Database, a: Actor, raw: unknown) {
  owner(a);
  const x = z
    .object({
      provider: brandSlug,
      slug: brandSlug,
      profile: brandProfile,
      location: z.string().min(1).max(80),
    })
    .strict()
    .parse(raw);
  identityRules(x.provider, x.slug, x.profile);
  return db.transaction(async (tx) => {
    if (
      !(
        await tx.query("SELECT id FROM reserve_locations WHERE id=$1", [
          x.location,
        ])
      ).length
    )
      throw new BookingError("Choose an existing location.");
    // Owner-supplied professional only. New providers remain disabled and have no services.
    await tx.query(
      "INSERT INTO reserve_providers(id,name,enabled,location_id) VALUES($1,$2,false,$3) ON CONFLICT(id) DO NOTHING",
      [x.provider, x.profile.professional, x.location],
    );
    await tx.query("SELECT id FROM reserve_providers WHERE id=$1 FOR UPDATE", [
      x.provider,
    ]);
    if (
      (
        await tx.query(
          "SELECT provider_id FROM reserve_provider_brands WHERE provider_id=$1 OR slug=$2",
          [x.provider, x.slug],
        )
      ).length
    )
      throw new BookingError(
        "This provider or booking link already has a brand.",
        409,
      );
    await validateAssets(tx, x.provider, x.profile);
    await tx.query(
      "INSERT INTO reserve_provider_locations(provider_id,location_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [x.provider, x.location],
    );
    const [row] = await tx.query<BrandRow>(
      "INSERT INTO reserve_provider_brands(provider_id,slug,draft,updated_by) VALUES($1,$2,$3,$4) RETURNING *",
      [x.provider, x.slug, JSON.stringify(x.profile), a.id],
    );
    await event(tx, a, x.provider, "created", 1);
    return row;
  });
}
export async function saveBrand(
  db: Database,
  a: Actor,
  provider: string,
  revision: number,
  raw: unknown,
) {
  scope(a, provider, true);
  const p = brandProfile.parse(raw);
  z.number().int().positive().parse(revision);
  return db.transaction(async (tx) => {
    const [row] = await tx.query<BrandRow>(
      "SELECT * FROM reserve_provider_brands WHERE provider_id=$1 FOR UPDATE",
      [provider],
    );
    if (!row)
      throw new BookingError("Create this provider’s brand first.", 404);
    if (row.revision !== revision)
      throw new BookingError("This draft changed. Reload before saving.", 409);
    identityRules(provider, row.slug, p);
    await validateAssets(tx, provider, p);
    const [next] = await tx.query<BrandRow>(
      "UPDATE reserve_provider_brands SET draft=$2,revision=revision+1,updated_by=$3,updated_at=now() WHERE provider_id=$1 RETURNING *",
      [provider, JSON.stringify(p), a.id],
    );
    await event(tx, a, provider, "draft_saved", next.revision);
    return next;
  });
}
export async function publishBrand(
  db: Database,
  a: Actor,
  provider: string,
  revision: number,
  publish: boolean,
) {
  owner(a);
  z.number().int().positive().parse(revision);
  return db.transaction(async (tx) => {
    const [row] = await tx.query<BrandRow>(
      "SELECT * FROM reserve_provider_brands WHERE provider_id=$1 FOR UPDATE",
      [provider],
    );
    if (!row) throw new BookingError("Brand not found.", 404);
    if (row.revision !== revision)
      throw new BookingError(
        "This draft changed. Review it again before publishing.",
        409,
      );
    const p = brandProfile.parse(row.draft);
    identityRules(provider, row.slug, p);
    await validateAssets(tx, provider, p);
    if (publish && provider !== "katie" && !p.logo)
      throw new BookingError(
        "Upload a logo before publishing an independent brand.",
      );
    const [next] = await tx.query<BrandRow>(
      "UPDATE reserve_provider_brands SET published=$2,published_revision=$3,published_by=$4,published_at=now(),revision=revision+1,updated_by=$4,updated_at=now() WHERE provider_id=$1 RETURNING *",
      [
        provider,
        publish ? JSON.stringify(p) : null,
        publish ? revision : null,
        a.id,
      ],
    );
    await event(
      tx,
      a,
      provider,
      publish ? "published" : "unpublished",
      next.revision,
    );
    return next;
  });
}
export async function publicBrand(db: Queryable, slug: string) {
  if (!brandSlug.safeParse(slug).success) return null;
  const [row] = await db.query<BrandRow>(
    "SELECT provider_id,slug,published FROM reserve_provider_brands WHERE slug=$1 AND published IS NOT NULL",
    [slug],
  );
  return row
    ? {
        provider_id: row.provider_id,
        slug: row.slug,
        profile: brandProfile.parse(row.published),
      }
    : null;
}
export async function publicKatieProfile(db: Queryable) {
  return (await publicBrand(db, "fix-it-shop"))?.profile ?? katieProfile;
}
export async function draftBrand(db: Queryable, a: Actor, provider: string) {
  scope(a, provider);
  const [row] = await db.query<BrandRow>(
    "SELECT * FROM reserve_provider_brands WHERE provider_id=$1",
    [provider],
  );
  return row ?? null;
}
export async function setBrandLocations(
  db: Database,
  a: Actor,
  provider: string,
  revision: number,
  raw: unknown,
) {
  owner(a);
  const ids = z.array(z.string().min(1).max(80)).min(1).max(10).parse(raw);
  if (new Set(ids).size !== ids.length)
    throw new BookingError("Choose unique locations.");
  return db.transaction(async (tx) => {
    const [p] = await tx.query(
      "SELECT id,revision FROM reserve_providers WHERE id=$1 FOR UPDATE",
      [provider],
    );
    if (!p) throw new BookingError("Provider not found.", 404);
    if (p.revision !== revision)
      throw new BookingError(
        "Provider settings changed. Reload before saving.",
        409,
      );
    for (const id of ids)
      if (
        !(await tx.query("SELECT id FROM reserve_locations WHERE id=$1", [id]))
          .length
      )
        throw new BookingError("Unknown location.");
    // Do not silently strand confirmed future appointments at a removed location.
    if (
      (
        await tx.query(
          "SELECT id FROM reserve_appointments WHERE provider_id=$1 AND status='confirmed' AND starts_at>now() AND NOT(COALESCE(location_id,'eunice')=ANY($2::text[])) LIMIT 1",
          [provider, ids],
        )
      ).length
    )
      throw new BookingError(
        "Reschedule future visits before removing their location.",
        409,
      );
    await tx.query(
      "DELETE FROM reserve_provider_locations WHERE provider_id=$1 AND NOT(COALESCE(location_id,'eunice')=ANY($2::text[]))",
      [provider, ids],
    );
    for (const id of ids)
      await tx.query(
        "INSERT INTO reserve_provider_locations(provider_id,location_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [provider, id],
      );
    await tx.query(
      "UPDATE reserve_providers SET location_id=$2,revision=revision+1 WHERE id=$1",
      [provider, ids[0]],
    );
    await event(tx, a, provider, "locations_updated", revision + 1);
    return { ok: true };
  });
}
export async function storeBrandAsset(
  db: Database,
  a: Actor,
  provider: string,
  images: { image: Buffer; icon180: Buffer; icon192: Buffer; icon512: Buffer },
) {
  scope(a, provider, true);
  return db.transaction(async (tx) => {
    // Lock a row to serialize the 20-asset cap across concurrent uploads.
    if (
      !(
        await tx.query(
          "SELECT id FROM reserve_providers WHERE id=$1 FOR UPDATE",
          [provider],
        )
      ).length
    )
      throw new BookingError("Provider not found.", 404);
    const [count] = await tx.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM reserve_provider_brand_assets WHERE provider_id=$1",
      [provider],
    );
    if (count.count >= 20)
      throw new BookingError(
        "The 20-image limit is reached. Contact the platform owner.",
      );
    const id = randomUUID();
    await tx.query(
      "INSERT INTO reserve_provider_brand_assets(id,provider_id,image,icon180,icon192,icon512,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        id,
        provider,
        images.image,
        images.icon180,
        images.icon192,
        images.icon512,
        a.id,
      ],
    );
    return { id };
  });
}
export async function readBrandAsset(
  db: Queryable,
  id: string,
  size: string,
  a?: Actor,
) {
  if (!z.uuid().safeParse(id).success) return null;
  const col = {
    image: "image",
    "180": "icon180",
    "192": "icon192",
    "512": "icon512",
  }[size];
  if (!col) return null;
  const [row] = await db.query<{ provider_id: string; bytes: Uint8Array }>(
    `SELECT a.provider_id,a.${col} AS bytes FROM reserve_provider_brand_assets a WHERE a.id=$1 ${a ? "" : "AND EXISTS(SELECT 1 FROM reserve_provider_brands b WHERE b.provider_id=a.provider_id AND (b.published->>'logo'=a.id OR b.published->>'cover'=a.id))"}`,
    [id],
  );
  if (!row) return null;
  if (a) scope(a, row.provider_id);
  return Buffer.from(row.bytes);
}

export async function createBrandLocation(
  db: Database,
  a: Actor,
  raw: unknown,
) {
  owner(a);
  const x = z
    .object({
      id: brandSlug,
      name: z.string().trim().min(2).max(100),
      city: z.string().trim().min(2).max(80),
      region: z.string().trim().min(2).max(80),
      timezone: z
        .string()
        .max(80)
        .refine((value) => {
          try {
            new Intl.DateTimeFormat("en-US", { timeZone: value });
            return value.includes("/");
          } catch {
            return false;
          }
        }, "Use a valid IANA timezone."),
      address: z.string().trim().max(300),
    })
    .strict()
    .parse(raw);
  return db.transaction(async (tx) => {
    if (
      (await tx.query("SELECT id FROM reserve_locations WHERE id=$1", [x.id]))
        .length
    )
      throw new BookingError("This location identifier already exists.", 409);
    await tx.query(
      "INSERT INTO reserve_locations(id,organization_id,slug,name,short_name,city,region,timezone,address,enabled,booking_enabled,status) VALUES($1,'legacy-reserve',$1,$2,$3,$3,$4,$5,$6,false,false,'planned')",
      [x.id, x.name, x.city, x.region, x.timezone, x.address],
    );
    await tx.query(
      "INSERT INTO reserve_audit(actor_id,appointment_id,action) VALUES($1,$2,'location_created_closed')",
      [a.id, "location:" + x.id],
    );
    return { ok: true };
  });
}
