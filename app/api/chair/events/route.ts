import { readChairJson } from "@/lib/chair-http";
import { z } from "zod";
import { chairEvents } from "@/lib/chair";
import { database, configured } from "@/lib/db";
import { mutationOrigin } from "@/lib/http";
const eventSchema = z.object({ event: z.enum(chairEvents) }).strict();
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const { event } = eventSchema.parse(await readChairJson(req, 100));
    if (configured())
      await (
        await database()
      ).query(
        `INSERT INTO reserve_chair_funnel(day,event,total) VALUES(current_date,$1,1)
      ON CONFLICT(day,event) DO UPDATE SET total=reserve_chair_funnel.total+1`,
        [event],
      );
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 400 });
  }
}
