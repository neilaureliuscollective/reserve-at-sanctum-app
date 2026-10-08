import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import { requireVitalisOwner, rate } from "@/lib/vitalis/store";
import { revenueOverview, saveForecast } from "@/lib/vitalis/revenue-store";
import { privateHeaders, vitalisFailure } from "@/lib/vitalis/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const a = await currentUser();
    requireVitalisOwner(a);
    return Response.json(await revenueOverview(await database(), a), {
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
    const result = await saveForecast(db, a, await readChairJson(req, 16000));
    return Response.json(result, { headers: privateHeaders });
  } catch (e) {
    return vitalisFailure(e);
  }
}
