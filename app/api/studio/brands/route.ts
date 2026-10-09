import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { BookingError } from "@/lib/booking";
import { failure, mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import {
  brandOverview,
  createBrandLocation,
  createBrand,
  saveBrand,
  publishBrand,
  setBrandLocations,
} from "@/lib/provider-brands";
export const dynamic = "force-dynamic";
async function actor() {
  const a = await currentUser();
  if (!a) throw new BookingError("Sign in to Studio.", 401);
  return a;
}
export async function GET() {
  try {
    return Response.json(await brandOverview(await database(), await actor()), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const a = await actor();
    const x = z
      .discriminatedUnion("action", [
        z.object({ action: z.literal("create"), input: z.unknown() }).strict(),
        z
          .object({ action: z.literal("create-location"), input: z.unknown() })
          .strict(),
        z
          .object({
            action: z.literal("save"),
            provider: z.string().min(1).max(80),
            revision: z.number().int().positive(),
            profile: z.unknown(),
          })
          .strict(),
        z
          .object({
            action: z.enum(["publish", "unpublish"]),
            provider: z.string().min(1).max(80),
            revision: z.number().int().positive(),
          })
          .strict(),
        z
          .object({
            action: z.literal("locations"),
            provider: z.string().min(1).max(80),
            revision: z.number().int().positive(),
            locations: z.unknown(),
          })
          .strict(),
      ])
      .parse(await readChairJson(req, 16000));
    const db = await database();
    const result =
      x.action === "create-location"
        ? await createBrandLocation(db, a, x.input)
        : x.action === "create"
          ? await createBrand(db, a, x.input)
          : x.action === "save"
            ? await saveBrand(db, a, x.provider, x.revision, x.profile)
            : x.action === "locations"
              ? await setBrandLocations(
                  db,
                  a,
                  x.provider,
                  x.revision,
                  x.locations,
                )
              : await publishBrand(
                  db,
                  a,
                  x.provider,
                  x.revision,
                  x.action === "publish",
                );
    return Response.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
