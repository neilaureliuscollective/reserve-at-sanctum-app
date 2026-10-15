import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { BookingError } from "@/lib/booking";
import {
  businessWorkspace,
  fixItBusiness,
  mutateBusinessWorkspace,
} from "@/lib/business-workspace";
import { mutationOrigin, failure } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const actor = await currentUser();
    if (!actor) throw new BookingError("Please sign in.", 401);
    const db = await database();
    return Response.json(
      await businessWorkspace(
        db,
        actor,
        await fixItBusiness(db),
        new URL(req.url).searchParams.get("date") || "",
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const actor = await currentUser();
    if (!actor) throw new BookingError("Please sign in.", 401);
    const db = await database();
    return Response.json(
      await mutateBusinessWorkspace(
        db,
        actor,
        await fixItBusiness(db),
        await readChairJson(req),
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
