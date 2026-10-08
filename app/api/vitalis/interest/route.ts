import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import {
  readSettings,
  readInterest,
  saveInterest,
  withdraw,
  requireVitalisMember,
  rate,
  event,
} from "@/lib/vitalis/store";
import { revisionInput } from "@/lib/vitalis/validation";
import { privateHeaders, vitalisFailure } from "@/lib/vitalis/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const a = await currentUser(),
      db = await database(),
      settings = await readSettings(db);
    return Response.json(
      {
        settings,
        account: a?.role ?? null,
        interest: a?.role === "client" ? await readInterest(db, a) : null,
      },
      { headers: privateHeaders },
    );
  } catch (e) {
    return vitalisFailure(e);
  }
}
async function change(req: Request, method: string) {
  try {
    mutationOrigin(req);
    const a = await currentUser();
    requireVitalisMember(a);
    const db = await database();
    await rate(db, a);
    const input = await readChairJson(req, 4096);
    const interest =
      method === "DELETE"
        ? await withdraw(db, a, revisionInput.parse(input).revision)
        : await saveInterest(db, a, input, method === "POST");
    return Response.json({ interest }, { headers: privateHeaders });
  } catch (e) {
    return vitalisFailure(e);
  }
}
export const POST = (req: Request) => change(req, "POST");
export const PATCH = (req: Request) => change(req, "PATCH");
export const DELETE = (req: Request) => change(req, "DELETE");
