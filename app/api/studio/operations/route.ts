import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { BookingError } from "@/lib/booking";
import { database } from "@/lib/db";
import { mutationOrigin, failure } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import {
  operationOverview,
  proposeOperation,
  applyOperation,
  dismissOperation,
} from "@/lib/studio-operations";
export const dynamic = "force-dynamic";
async function actor() {
  const a = await currentUser();
  if (!a) throw new BookingError("Sign in to Studio.", 401);
  return a;
}
export async function GET(request: Request) {
  try {
    return Response.json(
      await operationOverview(
        await database(),
        await actor(),
        z.coerce
          .number()
          .int()
          .min(0)
          .max(10000)
          .parse(new URL(request.url).searchParams.get("page") || 0),
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    mutationOrigin(request);
    return Response.json(
      {
        proposal: await proposeOperation(
          await database(),
          await actor(),
          await readChairJson(request),
        ),
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request) {
  try {
    mutationOrigin(request);
    const a = await actor(),
      input = z
        .object({
          id: z.uuid(),
          action: z.enum(["apply", "dismiss"]),
          acknowledge: z.boolean().default(false),
        })
        .strict()
        .parse(await readChairJson(request));
    const db = await database();
    if (input.action === "apply")
      await applyOperation(db, a, input.id, input.acknowledge);
    else await dismissOperation(db, a, input.id);
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
