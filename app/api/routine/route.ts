import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { failure, mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import {
  requireMember,
  readRoutine,
  saveRoutine,
  clearRoutine,
} from "@/lib/personal-reserve";
export const dynamic = "force-dynamic";
const response = (routine: unknown) =>
  Response.json({ routine }, { headers: { "Cache-Control": "no-store" } });
export async function GET() {
  try {
    const actor = await currentUser();
    requireMember(actor);
    return response(await readRoutine(await database(), actor));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const actor = await currentUser();
    requireMember(actor);
    return response(
      await saveRoutine(
        await database(),
        actor,
        await readChairJson(req, 8000),
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req: Request) {
  try {
    mutationOrigin(req);
    const actor = await currentUser();
    requireMember(actor);
    const i = z
      .object({ revision: z.number().int().positive() })
      .strict()
      .parse(await readChairJson(req));
    return response(await clearRoutine(await database(), actor, i.revision));
  } catch (e) {
    return failure(e);
  }
}
