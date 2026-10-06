import { groomingDraftSchema } from "@/lib/grooming-validation";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { failure, mutationOrigin } from "@/lib/http";
import { BookingError } from "@/lib/booking";
import type { GroomingProfile } from "@/lib/grooming";


export async function GET() {
  try {
    const actor = await currentUser();
    if (!actor) throw new BookingError("Sign in to open your profile.", 401);
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
    const input = groomingDraftSchema.parse(await request.json());
    const rows = await (await database()).query<GroomingProfile>(
      `INSERT INTO reserve_grooming_profiles
       (user_id,focus,maintenance,skin,hair,beard,blueprint,scan_completed_at,updated_at)
       VALUES($1,$2::jsonb,$3,$4,$5,$6,$7::jsonb,NULL,now())
       ON CONFLICT(user_id) DO UPDATE SET
       focus=excluded.focus, maintenance=excluded.maintenance, skin=excluded.skin,
       hair=excluded.hair, beard=excluded.beard, blueprint=excluded.blueprint,
       scan_completed_at=NULL, updated_at=now()
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
