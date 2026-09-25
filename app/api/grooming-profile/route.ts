import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { failure, mutationOrigin } from "@/lib/http";
import { BookingError } from "@/lib/booking";
import type { GroomingProfile } from "@/lib/grooming";

const draftSchema = z.object({
  focus: z.array(z.string().min(1).max(80)).min(1).max(5),
  maintenance: z.string().min(1).max(80),
  skin: z.string().min(1).max(80),
  hair: z.string().min(1).max(80),
  beard: z.string().min(1).max(80),
  blueprint: z.object({
    focus: z.array(z.string().min(1).max(80)).min(1).max(5),
    maintenance: z.string().min(1).max(80),
    skin: z.string().min(1).max(80),
    hair: z.string().min(1).max(80),
    beard: z.string().min(1).max(80),
    direction: z.string().min(1).max(300),
    ritual: z.array(z.string().min(1).max(180)).min(1).max(6),
  }),
});

export async function GET() {
  try {
    const actor = await currentUser();
    if (!actor) throw new BookingError("Sign in to open My Sanctum.", 401);
    const rows = await (await database()).query<GroomingProfile>(
      "SELECT * FROM reserve_grooming_profiles WHERE user_id=$1",
      [actor.id],
    );
    return Response.json({ profile: rows[0] || null });
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request: Request) {
  try {
    mutationOrigin(request);
    const actor = await currentUser();
    if (!actor) throw new BookingError("Sign in to save your Blueprint.", 401);
    const input = draftSchema.parse(await request.json());
    const rows = await (await database()).query<GroomingProfile>(
      `INSERT INTO reserve_grooming_profiles
       (user_id,focus,maintenance,skin,hair,beard,blueprint,scan_completed_at,updated_at)
       VALUES($1,$2::jsonb,$3,$4,$5,$6,$7::jsonb,NULL,now())
       ON CONFLICT(user_id) DO UPDATE SET
       focus=excluded.focus, maintenance=excluded.maintenance, skin=excluded.skin,
       hair=excluded.hair, beard=excluded.beard, blueprint=excluded.blueprint,
       updated_at=now()
       RETURNING *`,
      [
        actor.id,
        JSON.stringify(input.focus),
        input.maintenance,
        input.skin,
        input.hair,
        input.beard,
        JSON.stringify(input.blueprint),
      ],
    );
    return Response.json({ profile: rows[0] });
  } catch (error) {
    return failure(error);
  }
}
