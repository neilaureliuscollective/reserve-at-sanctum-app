import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { mutationOrigin, failure } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import { requireMember } from "@/lib/personal-reserve";
import { memberConcierge } from "@/lib/member-concierge";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const actor = await currentUser();
    requireMember(actor);
    return Response.json(
      await memberConcierge(
        await database(),
        actor,
        await readChairJson(req, 10000),
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
