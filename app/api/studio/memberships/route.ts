import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { BookingError } from "@/lib/booking";
import { database } from "@/lib/db";
import { failure, mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import {
  membershipOperations,
  requireMembershipOwner,
  savePlan,
  grantMembership,
  changeMembership,
  closeRequest,
} from "@/lib/membership-operations";
export const dynamic = "force-dynamic";
async function owner() {
  const a = await currentUser();
  if (!a) throw new BookingError("Sign in to Studio.", 401);
  requireMembershipOwner(a);
  return a;
}
export async function GET(req: Request) {
  try {
    const a = await owner();
    const page = z.coerce
      .number()
      .int()
      .min(0)
      .max(10000)
      .parse(new URL(req.url).searchParams.get("page") ?? 0);
    return Response.json(
      await membershipOperations(await database(), a, page),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const a = await owner();
    const input = z
      .object({
        action: z.enum(["plan", "grant", "change", "close"]),
        data: z.unknown(),
      })
      .strict()
      .parse(await readChairJson(req, 12000));
    const db = await database();
    if (input.action === "plan") await savePlan(db, a, input.data);
    if (input.action === "grant") await grantMembership(db, a, input.data);
    if (input.action === "change") await changeMembership(db, a, input.data);
    if (input.action === "close") {
      const r = z
        .object({
          id: z.string().min(1).max(80),
          revision: z.number().int().positive(),
        })
        .strict()
        .parse(input.data);
      await closeRequest(db, a, r.id, r.revision);
    }
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
