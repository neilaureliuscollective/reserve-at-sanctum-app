import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { book, visits, BookingError } from "@/lib/booking";
import { mutationOrigin, failure } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const actor = await currentUser();
    if (!actor) throw new BookingError("Sign in to view your visits.", 401);
    return Response.json({
      visits: await visits(
        await database(),
        actor,
        new URL(req.url).searchParams.get("studio") === "true",
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const actor = await currentUser();
    if (!actor)
      throw new BookingError("Sign in before reserving a visit.", 401);
    const input = z
      .object({
        serviceId: z.string().max(80),
        start: z.iso.datetime(),
        note: z.string().max(600).default(""),
        requestKey: z.uuid(),
      })
      .parse(await req.json());
    return Response.json(
      { appointment: await book(await database(), actor, input) },
      { status: 201 },
    );
  } catch (e) {
    return failure(e);
  }
}
