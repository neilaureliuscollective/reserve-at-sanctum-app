import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { clientHistory } from "@/lib/command-center";
import { BookingError } from "@/lib/booking";
import { failure } from "@/lib/http";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await currentUser();
    if (!actor) throw new BookingError("Sign in to Studio.", 401);
    const page = z.coerce
      .number()
      .int()
      .min(0)
      .max(10000)
      .parse(new URL(request.url).searchParams.get("page") ?? 0);
    return Response.json(
      await clientHistory(await database(), actor, (await params).id, page),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
