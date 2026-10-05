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
    return Response.json(
      await commandCenter(
        await database(),
        actor,
        z.coerce
          .number()
          .int()
          .min(0)
          .max(10000)
          .parse(new URL(request.url).searchParams.get("page") ?? 0),
      ),
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
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
        assignee_user_id: z.string().min(1).max(100).nullable().optional(),
        visibility: z.enum(["shared", "owner"]).optional(),
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
        action: z.enum(["complete", "archive", "request_changes"]).optional(),
        feedback: z.string().trim().max(600).optional(),
        assignee_user_id: z.string().min(1).max(100).optional(),
        status: status.optional(),

        title: z.string().trim().min(1).max(90).optional(),
        detail: z.string().trim().max(600).optional(),
      })
      .strict()
      .refine(
        (value) =>
          value.status !== undefined ||
          value.action !== undefined ||
          value.assignee_user_id !== undefined ||
          value.title !== undefined ||
          value.detail !== undefined,
        "Choose something to update.",
      )
      .parse(await readChairJson(request));
    const { id, ...changes } = input;
    return Response.json(
      {
        item: await updateWorkspaceItem(await database(), actor, id, changes),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
