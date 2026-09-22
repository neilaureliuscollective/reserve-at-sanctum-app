import { database, configured } from "@/lib/db";
import { availability, catalog } from "@/lib/booking";
import { failure } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    if (!configured())
      return Response.json({ services: [], slots: [], setupRequired: true });
    const db = await database(),
      u = new URL(req.url);
    if (!u.searchParams.has("service"))
      return Response.json({ services: await catalog(db) });
    return Response.json({
      slots: await availability(
        db,
        u.searchParams.get("service")!,
        u.searchParams.get("date") || "",
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
