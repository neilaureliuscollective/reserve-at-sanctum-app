import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { failure, mutationOrigin } from "@/lib/http";
import { BookingError } from "@/lib/booking";
import { z } from "zod";
import { readChairJson } from "@/lib/chair-http";
import {
  memberRequest,
  requestMembership,
  closeRequest,
  membershipPrivileges,
} from "@/lib/membership-operations";
import { membershipDesk } from "@/lib/membership";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await currentUser();
    const db = await database();
    const desk = await membershipDesk(db, actor);
    return Response.json(
      {
        ...desk,
        plans: desk.plans.filter(
          (p) => p.active || p.id === desk.membership?.plan_id,
        ),
        request: actor ? await memberRequest(db, actor) : null,
        privileges: membershipPrivileges(
          desk.membership,
          desk.plans.find((p) => p.id === desk.membership?.plan_id),
          Boolean(desk.membership?.location_enabled),
          Boolean(desk.membership?.location_booking_enabled),
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const actor = await currentUser();
    if (!actor)
      throw new BookingError("Sign in to request membership access.", 401);
    return Response.json(
      {
        request: await requestMembership(
          await database(),
          actor,
          await readChairJson(req),
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req: Request) {
  try {
    mutationOrigin(req);
    const actor = await currentUser();
    if (!actor) throw new BookingError("Sign in to manage your request.", 401);
    const i = z
      .object({
        id: z.string().min(1).max(80),
        revision: z.number().int().positive(),
      })
      .strict()
      .parse(await readChairJson(req));
    await closeRequest(await database(), actor, i.id, i.revision, true);
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
