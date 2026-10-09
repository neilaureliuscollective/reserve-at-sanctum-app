import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { BookingError } from "@/lib/booking";
import { failure, mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import { blockTime, listBlocks, removeBlock } from "@/lib/studio-blocks";
export const dynamic = "force-dynamic";
async function actor() {
  const user = await currentUser();
  if (!user) throw new BookingError("Sign in to your studio.", 401);
  return user;
}
export async function GET(req: Request) {
  try {
    return Response.json({
      blocks: await listBlocks(
        await database(),
        await actor(),
        new URL(req.url).searchParams.get("provider") || undefined,
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const user = await actor();
    const input = z
      .object({
        provider: z.string().min(1).max(80).optional(),
        date: z.string().max(10),
        start: z.string().max(5),
        end: z.string().max(5),
      })
      .strict()
      .parse(await readChairJson(req));
    return Response.json(
      { id: await blockTime(await database(), user, input) },
      { status: 201 },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req: Request) {
  try {
    mutationOrigin(req);
    const user = await actor();
    const { id, provider } = z
      .object({ id: z.uuid(), provider: z.string().min(1).max(80).optional() })
      .strict()
      .parse(await readChairJson(req));
    await removeBlock(await database(), user, id, provider);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
