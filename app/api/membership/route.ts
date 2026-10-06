import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { failure } from "@/lib/http";
import { membershipDesk } from "@/lib/membership";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await currentUser();
    const db = await database();
    return Response.json(await membershipDesk(db, actor));
  } catch (error) {
    return failure(error);
  }
}
