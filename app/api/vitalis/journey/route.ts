import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import { requireMember } from "@/lib/personal-reserve";
import { rate } from "@/lib/vitalis/store";
import {
  journeyOverview,
  saveJourney,
  checkJourney,
  clearJourney,
} from "@/lib/vitalis/journey-store";
import { privateHeaders, vitalisFailure } from "@/lib/vitalis/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const a = await currentUser();
    requireMember(a);
    return Response.json(await journeyOverview(await database(), a), {
      headers: privateHeaders,
    });
  } catch (e) {
    return vitalisFailure(e);
  }
}
async function change(req: Request, method: string) {
  try {
    mutationOrigin(req);
    const a = await currentUser();
    requireMember(a);
    const db = await database();
    await rate(db, a);
    const input = await readChairJson(req, 1024);
    const data =
      method === "POST"
        ? await saveJourney(db, a, input)
        : method === "PATCH"
          ? await checkJourney(db, a, input)
          : await clearJourney(db, a, input);
    return Response.json(data, { headers: privateHeaders });
  } catch (e) {
    return vitalisFailure(e);
  }
}
export const POST = (r: Request) => change(r, "POST");
export const PATCH = (r: Request) => change(r, "PATCH");
export const DELETE = (r: Request) => change(r, "DELETE");
