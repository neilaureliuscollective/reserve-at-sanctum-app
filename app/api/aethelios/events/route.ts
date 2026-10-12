import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { requireMember } from "@/lib/personal-reserve";
import { mutationOrigin, failure } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import { browserConciergeEvent, conciergeEvent } from "@/lib/concierge-events";
import { conciergeRate } from "@/lib/concierge-budget";
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const actor = await currentUser(); requireMember(actor);
    const { event } = browserConciergeEvent.parse(await readChairJson(req, 200));
    const db = await database();
    await conciergeRate(db, actor!);
    await conciergeEvent(db, event);
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch(e) { return failure(e); }
}
