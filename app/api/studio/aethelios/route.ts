import { hasBusinessConnection } from "@/lib/business-connections";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { BookingError } from "@/lib/booking";
import { requireCapability } from "@/lib/studio-permissions";
import { readChairJson } from "@/lib/chair-http";
import { failure, mutationOrigin } from "@/lib/http";
import {
  assistantInput,
  generateStudioAnswer,
  reserveAiSlot,
} from "@/lib/studio-ai";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    mutationOrigin(request);
    const actor = await currentUser();
    if (!actor) throw new BookingError("Sign in to Studio.", 401);
    requireCapability(actor, "studio.read");
    requireCapability(actor, "workspace.read");
    if (await hasBusinessConnection(await database(), actor))
      throw new BookingError(
        "Your connected business intelligence is in Public Aethelios. Open Business Connections there.",
        409,
      );
    const input = assistantInput.parse(await readChairJson(request, 16000));
    if (!process.env.OPENAI_API_KEY)
      throw new BookingError(
        "Aethelios is not connected yet. Your writing workspace is ready.",
        503,
      );
    await reserveAiSlot(await database(), actor);
    return Response.json(
      { answer: await generateStudioAnswer(actor, input) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
