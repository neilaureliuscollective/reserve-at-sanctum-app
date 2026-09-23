import { readChairJson } from "@/lib/chair-http";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { BookingError } from "@/lib/booking";
import { failure, mutationOrigin } from "@/lib/http";
import { listChairs, saveChairNote } from "@/lib/chair-store";
export const dynamic = "force-dynamic";
async function actor() {
  const user = await currentUser();
  if (!user) throw new BookingError("Sign in to open the studio.", 401);
  return user;
}
export async function GET() {
  try {
    const user = await actor();
    return Response.json({ chairs: await listChairs(await database(), user) });
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(req: Request) {
  try {
    mutationOrigin(req);
    const user = await actor();
    const input = await readChairJson(req);
    await saveChairNote(await database(), user, input);
    return Response.json({ saved: true });
  } catch (e) {
    return failure(e);
  }
}
