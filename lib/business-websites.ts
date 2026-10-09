import { isDeepStrictEqual } from "node:util";
import {
  saveBrand,
  publishBrand,
  publicBrand,
  type BrandProfile,
} from "./provider-brands";
import { createHash } from "node:crypto";
import { z } from "zod";
import { BookingError, type Actor } from "./booking";
import { providerScope } from "./booking-pilot";
import { requireCapability } from "./studio-permissions";
import type { Database, Queryable, Row } from "./db";
import type { BusinessGrant } from "./business-connections";
export const websiteCopy = z
  .object({
    headline: z.string().trim().min(1).max(120),
    about: z.string().trim().min(1).max(1200),
  })
  .strict();
export const websiteProposal = z
  .object({
    requestId: z.uuid(),
    websiteId: z.literal("fix-it-shop"),
    baseRevision: z.number().int().positive(),
    content: websiteCopy,
    serviceChanges: z
      .array(
        z
          .object({
            id: z.string().min(1).max(100),
            baseRevision: z.number().int().positive(),
            description: z.string().trim().min(1).max(600),
          })
          .strict(),
      )
      .max(10),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.serviceChanges.map((s) => s.id)).size ===
      v.serviceChanges.length,
    "Duplicate service",
  );
export const defaultFixItCopy = {
  headline: "Men’s hair. Personal attention. Her own standard.",
  about:
    "Fix It Shop is Katie Guidry’s independent men’s salon brand. As its founder and owner, she sets the standard for the experience: listen to the person, give the details their attention, and make the time feel personal.",
};
export type Website = Row & {
  id: string;
  provider_id: string;
  path: string;
  content: z.infer<typeof websiteCopy>;
  revision: number;
  draft: BrandProfile;
  published: BrandProfile;
};
export type WebsiteDraft = Row & {
  id: string;
  website_id: string;
  grant_id: string;
  created_by: string;
  base_revision: number;
  content: z.infer<typeof websiteCopy>;
  service_changes: z.infer<typeof websiteProposal>["serviceChanges"];
  fingerprint: string;
  baseline: Row;
  state: "review" | "approved" | "rejected";
};
export function websiteEnabled() {
  if (process.env.RESERVE_BUSINESS_WEBSITES_ENABLED !== "true")
    throw new BookingError("Business websites are awaiting activation.", 503);
}
async function websiteGrant(db: Queryable, actor: Actor, grant: BusinessGrant) {
  websiteEnabled();
  providerScope(actor, grant.provider_id);
  requireCapability(actor, "workspace.edit");
  const [live] = await db.query(
    "SELECT id FROM reserve_business_grants WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL AND expires_at>now() AND website_access FOR SHARE",
    [grant.id, actor.id],
  );
  if (!live)
    throw new BookingError(
      "Website permission was revoked or was not approved. Reconnect with website consent.",
      403,
    );
}
async function site(db: Queryable, provider: string, lock = false) {
  const [row] = await db.query<Website>(
    "SELECT w.id,w.provider_id,w.path,b.draft,b.published,b.revision FROM reserve_business_websites w JOIN reserve_provider_brands b ON b.provider_id=w.provider_id WHERE w.id='fix-it-shop' AND w.provider_id=$1 AND b.published IS NOT NULL" +
      (lock ? " FOR UPDATE OF b" : ""),
    [provider],
  );
  if (!row)
    throw new BookingError(
      "Register and publish this professional’s brand in Reserve first.",
      404,
    );
  return {
    ...row,
    content: websiteCopy.parse({
      headline: row.published.headline,
      about: row.published.bio,
    }),
  };
}
function noCompetingBrandDraft(website: Website) {
  if (!isDeepStrictEqual(website.draft, website.published))
    throw new BookingError(
      "A brand draft is already awaiting review in Brands. Review that before a connected copy proposal.",
      409,
    );
}
export async function websiteSource(
  db: Database,
  actor: Actor,
  grant: BusinessGrant,
) {
  return db.transaction(async (tx) => {
    await websiteGrant(tx, actor, grant);
    const website = await site(tx, grant.provider_id);
    const services = await tx.query<{
      id: string;
      name: string;
      description: string;
      revision: number;
    }>(
      "SELECT id,name,description,revision FROM reserve_services WHERE provider_id=$1 ORDER BY id LIMIT 10",
      [grant.provider_id],
    );
    const proposals = await tx.query<WebsiteDraft>(
      "SELECT id,state,created_at FROM reserve_website_proposals WHERE website_id=$1 AND grant_id=$2 ORDER BY created_at DESC,id LIMIT 20",
      [website.id, grant.id],
    );
    return {
      version: 1,
      source: "Legacy Reserve",
      websiteId: website.id,
      providerId: website.provider_id,
      path: website.path,
      revision: website.revision,
      content: website.content,
      services,
      proposals,
      fetchedAt: new Date().toISOString(),
    };
  });
}
export async function proposeWebsite(
  db: Database,
  actor: Actor,
  grant: BusinessGrant,
  raw: unknown,
) {
  const input = websiteProposal.parse(raw),
    fingerprint = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
  return db.transaction(async (tx) => {
    await websiteGrant(tx, actor, grant);
    const website = await site(tx, grant.provider_id, true);
    const [prior] = await tx.query<WebsiteDraft>(
      "SELECT * FROM reserve_website_proposals WHERE id=$1",
      [input.requestId],
    );
    if (prior) {
      if (
        prior.grant_id !== grant.id ||
        prior.created_by !== actor.id ||
        prior.fingerprint !== fingerprint
      )
        throw new BookingError(
          "Proposal request changed. Reload before trying again.",
          409,
        );
      return { id: prior.id, state: prior.state };
    }
    noCompetingBrandDraft(website);
    if (website.revision !== input.baseRevision)
      throw new BookingError(
        "Website changed. Reload its current version.",
        409,
      );
    const [count] = await tx.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM reserve_website_proposals WHERE website_id=$1 AND (state='review' OR created_at>now()-interval '1 day')",
      [website.id],
    );
    if (Number(count.count) >= 30)
      throw new BookingError(
        "Review existing proposals before adding more.",
        429,
      );
    const baselineServices = [];
    for (const change of input.serviceChanges) {
      const [service] = await tx.query<{
        id: string;
        description: string;
        revision: number;
      }>(
        "SELECT id,description,revision FROM reserve_services WHERE id=$1 AND provider_id=$2 FOR SHARE",
        [change.id, grant.provider_id],
      );
      if (!service || service.revision !== change.baseRevision)
        throw new BookingError(
          "Service changed. Reload before proposing.",
          409,
        );
      baselineServices.push(service);
    }
    await tx.query(
      "INSERT INTO reserve_website_proposals(id,website_id,grant_id,created_by,base_revision,content,service_changes,fingerprint,baseline) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9::jsonb)",
      [
        input.requestId,
        website.id,
        grant.id,
        actor.id,
        input.baseRevision,
        JSON.stringify(input.content),
        JSON.stringify(input.serviceChanges),
        fingerprint,
        JSON.stringify({
          content: website.content,
          services: baselineServices,
        }),
      ],
    );
    return { id: input.requestId, state: "review" as const };
  });
}
export async function websiteReviewQueue(db: Queryable, actor: Actor) {
  websiteEnabled();
  providerScope(
    actor,
    actor.role === "owner" ? "katie" : (actor.provider_id ?? ""),
  );
  requireCapability(actor, "workspace.read");
  const website = await site(
    db,
    actor.role === "owner" ? "katie" : (actor.provider_id ?? ""),
  );
  const proposals = await db.query<WebsiteDraft>(
    "SELECT * FROM reserve_website_proposals WHERE website_id=$1 AND state='review' ORDER BY created_at,id LIMIT 30",
    [website.id],
  );
  const versions = await db.query<{
    revision: number;
    content: unknown;
    created_at: string;
  }>(
    "SELECT base_revision AS revision,content,reviewed_at AS created_at FROM reserve_website_proposals WHERE website_id=$1 AND state='approved' ORDER BY reviewed_at DESC LIMIT 20",
    [website.id],
  );
  return { website, proposals, versions };
}
export async function reviewWebsite(db: Database, actor: Actor, raw: unknown) {
  websiteEnabled();
  requireCapability(actor, "operations.configure");
  if (actor.role !== "owner")
    throw new BookingError("Owner approval is required.", 403);
  const input = z
    .object({
      id: z.uuid(),
      decision: z.enum(["approve", "reject"]),
      baseRevision: z.number().int().positive(),
    })
    .strict()
    .parse(raw);
  return db.transaction(async (tx) => {
    const [found] = await tx.query<WebsiteDraft>(
      "SELECT * FROM reserve_website_proposals WHERE id=$1",
      [input.id],
    );
    if (!found) throw new BookingError("Proposal unavailable.", 404);
    // Same lock order as proposeWebsite avoids deadlocks; review must match the displayed version.
    const website = await site(
      tx,
      actor.role === "owner" ? "katie" : (actor.provider_id ?? ""),
      true,
    );
    providerScope(actor, website.provider_id);
    requireCapability(actor, "workspace.approve");
    if (website.id !== found.website_id)
      throw new BookingError("Website publishing authority required.", 403);
    const [proposal] = await tx.query<WebsiteDraft>(
      "SELECT * FROM reserve_website_proposals WHERE id=$1 FOR UPDATE",
      [input.id],
    );
    if (proposal.state !== "review")
      throw new BookingError("Proposal already reviewed. Reload.", 409);
    if (proposal.base_revision !== input.baseRevision)
      throw new BookingError("Displayed proposal changed.", 409);
    if (input.decision === "approve") {
      if (website.revision !== proposal.base_revision)
        throw new BookingError(
          "Website changed since this proposal. Prepare a fresh proposal.",
          409,
        );
      noCompetingBrandDraft(website);
      const content = websiteCopy.parse(proposal.content);
      const validated = websiteProposal.parse({
        requestId: proposal.id,
        websiteId: proposal.website_id,
        baseRevision: proposal.base_revision,
        content,
        serviceChanges: proposal.service_changes,
      });
      for (const change of validated.serviceChanges) {
        const [service] = await tx.query<{ revision: number }>(
          "SELECT revision FROM reserve_services WHERE id=$1 AND provider_id=$2 FOR UPDATE",
          [change.id, website.provider_id],
        );
        if (!service || service.revision !== change.baseRevision)
          throw new BookingError("Service changed since this proposal.", 409);
      }
      // Reuse existing brand validation, identity/assets rules, revision events and owner publication.
      const sameTransaction: Database = {
        query: tx.query.bind(tx),
        transaction: (fn) => fn(tx),
      };
      const draft = await saveBrand(
        sameTransaction,
        actor,
        website.provider_id,
        website.revision,
        {
          ...website.published,
          headline: content.headline,
          bio: content.about,
        },
      );
      await publishBrand(
        sameTransaction,
        actor,
        website.provider_id,
        draft.revision,
        true,
      );
      for (const change of validated.serviceChanges)
        await tx.query(
          "UPDATE reserve_services SET description=$3,revision=revision+1 WHERE id=$1 AND provider_id=$2",
          [change.id, website.provider_id, change.description],
        );
    }
    await tx.query(
      "UPDATE reserve_website_proposals SET state=$2,reviewed_by=$3,reviewed_at=now() WHERE id=$1",
      [
        proposal.id,
        input.decision === "approve" ? "approved" : "rejected",
        actor.id,
      ],
    );
    return {
      reviewed: true,
      revision: website.revision + (input.decision === "approve" ? 2 : 0),
    };
  });
}
export async function publishedFixItCopy(db: Queryable) {
  if (process.env.RESERVE_BUSINESS_WEBSITES_ENABLED !== "true")
    return defaultFixItCopy;
  const brand = await publicBrand(db, "fix-it-shop");
  return brand
    ? websiteCopy.parse({
        headline: brand.profile.headline,
        about: brand.profile.bio,
      })
    : defaultFixItCopy;
}
