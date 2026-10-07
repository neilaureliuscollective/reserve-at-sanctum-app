import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { requireMember } from "@/lib/personal-reserve";
import { readChairJson } from "@/lib/chair-http";
import { failure, mutationOrigin } from "@/lib/http";
import { prepareCheckout, ownCheckout } from "@/lib/collection-checkout";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const actor = await currentUser();
    requireMember(actor);
    return Response.json(
      await prepareCheckout(await database(), actor, await readChairJson(req)),
      { headers },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function GET(req: Request) {
  try {
    const actor = await currentUser();
    requireMember(actor);
    return Response.json(
      await ownCheckout(
        await database(),
        actor,
        new URL(req.url).searchParams.get("attempt") || "",
      ),
      { headers },
    );
  } catch (e) {
    return failure(e);
  }
}
