import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { BookingError } from "@/lib/booking";
import {
  commandCenter,
  createWorkspaceItem,
  updateWorkspaceItem,
} from "@/lib/command-center";
import { database } from "@/lib/db";
import { readChairJson } from "@/lib/chair-http";
import { failure, mutationOrigin } from "@/lib/http";

export const dynamic = "force-dynamic";

async function operator() {
  const user = await currentUser();
  if (!user) throw new BookingError("Sign in to Reserve Command.", 401);
  return user;
}

const kind = z.enum(["idea", "feedback", "decision", "task"]);
const lane = z.enum(["reserve", "fix-it", "gent"]);
const assignee = z.enum(["neil", "katie", "both"]);
const status = z.enum(["captured", "building", "review", "approved"]);

export async function GET(request: Request) {
  try {
    const actor = await operator();
    const params = new URL(request.url).searchParams;
    const offset = z.coerce.number().int().min(0).max(10000).parse(params.get("offset") || 0);
    return Response.json(await commandCenter(await database(), actor, params.get("date") || undefined, offset), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    mutationOrigin(request);
    const actor = await operator();
    const input = z
      .object({
        kind,
        lane,
        title: z.string().trim().min(1).max(90),
        detail: z.string().trim().max(600).default(""),
        assignee,
        visibility: z.enum(["shared", "founder", "provider"]).optional(),
        due_date: z.iso.date().nullable().optional(),
      })
      .strict()
      .parse(await readChairJson(request));
    return Response.json(
      { item: await createWorkspaceItem(await database(), actor, input) },
      { status: 201 },
    );
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    mutationOrigin(request);
    const actor = await operator();
    const input = z
      .object({
        id: z.uuid(),
        revision: z.number().int().positive(),
        completed: z.boolean().optional(),
        handoff_to: z.string().min(1).max(100).optional(),
        acknowledge: z.boolean().optional(),
        status: status.optional(),
        assignee: assignee.optional(),
        title: z.string().trim().min(1).max(90).optional(),
        detail: z.string().trim().max(600).optional(),
      })
      .strict()
      .refine(
        (value) =>
          value.completed !== undefined || value.handoff_to !== undefined || value.acknowledge !== undefined ||
          value.status !== undefined ||
          value.assignee !== undefined ||
          value.title !== undefined ||
          value.detail !== undefined,
        "Choose something to update.",
      )
      .parse(await readChairJson(request));
    const { id, ...changes } = input;
    return Response.json({
      item: await updateWorkspaceItem(await database(), actor, id, changes),
    });
  } catch (error) {
    return failure(error);
  }
}
