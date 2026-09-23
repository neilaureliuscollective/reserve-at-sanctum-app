import { readChairJson } from "@/lib/chair-http";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { BookingError } from "@/lib/booking";
import { failure, mutationOrigin } from "@/lib/http";
import { getChair, saveChair, deleteChair } from "@/lib/chair-store";
export const dynamic = "force-dynamic";
async function actor() {
  const user = await currentUser();
  if (!user) throw new BookingError("Sign in to save your Chair.", 401);
  return user;
}
export async function GET() {
  try {
    const user = await actor();
    return Response.json({ profile: await getChair(await database(), user) });
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(req: Request) {
  try {
    mutationOrigin(req);
    const user = await actor();
    const input = await readChairJson(req);
    return Response.json({
      profile: await saveChair(await database(), user, input),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req: Request) {
  try {
    mutationOrigin(req);
    const user = await actor();
    await deleteChair(await database(), user);
    return Response.json({ deleted: true });
  } catch (e) {
    return failure(e);
  }
}
