import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { studioClients } from "@/lib/command-center";
import { BookingError } from "@/lib/booking";
import { failure } from "@/lib/http";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const actor = await currentUser();
    if (!actor) throw new BookingError("Sign in to Studio.", 401);
    const page = z.coerce
      .number()
      .int()
      .min(0)
      .max(10000)
      .parse(new URL(request.url).searchParams.get("page") ?? 0);
    const rows = await studioClients(await database(), actor, page);
    return Response.json(
      { clients: rows.slice(0, 30), hasMore: rows.length > 30, page },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
