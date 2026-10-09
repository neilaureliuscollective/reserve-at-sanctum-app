import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { BookingError } from "@/lib/booking";
import { failure, mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import {
  pilotClients,
  createPilotClient,
  importPilotClients,
} from "@/lib/booking-pilot";
export const dynamic = "force-dynamic";
async function actor() {
  const a = await currentUser();
  if (!a) throw new BookingError("Sign in to Studio.", 401);
  return a;
}
export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const rows = await pilotClients(
      await database(),
      await actor(),
      p.get("provider") || undefined,
      p.get("q") || "",
      z.coerce
        .number()
        .int()
        .min(0)
        .max(10000)
        .parse(p.get("page") || 0),
    );
    return Response.json(
      { clients: rows.slice(0, 30), hasMore: rows.length > 30 },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const a = await actor(),
      db = await database();
    const input = z
      .object({
        provider: z.string().min(1).max(80),
        action: z.enum(["create", "preview", "import"]),
        client: z.unknown().optional(),
        source: z.string().trim().min(1).max(80).optional(),
        rows: z.array(z.unknown()).max(20).optional(),
      })
      .strict()
      .parse(await readChairJson(req, 16000));
    if (input.action === "create")
      return Response.json(
        await createPilotClient(db, a, input.provider, input.client),
        { status: 201 },
      );
    if (!input.rows || !input.source)
      throw new BookingError("Supply import source and rows.");
    return Response.json(
      await importPilotClients(
        db,
        a,
        input.provider,
        input.source,
        input.rows,
        input.action === "import",
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
