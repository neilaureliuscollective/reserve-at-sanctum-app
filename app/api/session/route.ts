import { currentUser } from "@/lib/auth";
import { isPreview } from "@/lib/db";
import { failure } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json({ user: await currentUser(), preview: isPreview() });
  } catch (e) {
    return failure(e);
  }
}
