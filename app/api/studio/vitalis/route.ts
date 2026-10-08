import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import {
  overview,
  savePartner,
  saveSettings,
  requireVitalisOwner,
  rate,
  cleanup,
} from "@/lib/vitalis/store";
import { privateHeaders, vitalisFailure } from "@/lib/vitalis/http";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const a = await currentUser();
    requireVitalisOwner(a);
    const page = z.coerce
      .number()
      .int()
      .min(0)
      .max(10000)
      .parse(new URL(req.url).searchParams.get("page") ?? 0);
    return Response.json(await overview(await database(), a, page), {
      headers: privateHeaders,
    });
  } catch (e) {
    return vitalisFailure(e);
  }
}
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const a = await currentUser();
    requireVitalisOwner(a);
    const db = await database();
    await rate(db, a);
    const i = z
      .object({
        action: z.enum(["settings", "partner", "cleanup"]),
        data: z.unknown(),
      })
      .strict()
      .parse(await readChairJson(req, 4096));
    if (i.action === "settings") await saveSettings(db, a, i.data);
    else if (i.action === "partner") await savePartner(db, a, i.data);
    else {
      z.object({}).strict().parse(i.data);
      await cleanup(db, a);
    }
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (e) {
    return vitalisFailure(e);
  }
}
