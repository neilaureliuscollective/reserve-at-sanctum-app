import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import { rate, event, requireVitalisMember } from "@/lib/vitalis/store";
import { privateHeaders, vitalisFailure } from "@/lib/vitalis/http";
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const a = await currentUser();
    requireVitalisMember(a);
    const db = await database();
    await rate(db, a, Date.now(), "event");
    const i = z
      .object({
        event: z.enum(["vitalis_view", "join_started", "join_failed"]),
      })
      .strict()
      .parse(await readChairJson(req, 256));
    await event(db, i.event);
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (e) {
    return vitalisFailure(e);
  }
}
