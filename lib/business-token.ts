import { ZodError } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  businessConfig,
  readBusinessGrant,
  verifyBusinessClaims,
  linkKey,
} from "./business-connections";
import { supabaseKey, supabaseUrl } from "./supabase-config";
import { database } from "./db";
import { BookingError, type Actor } from "./booking";
export async function businessActor(request: Request) {
  const config = businessConfig();
  const authorization = request.headers.get("authorization") ?? "";
  if (
    !authorization.startsWith("Bearer ") ||
    authorization.length > 12000 ||
    !supabaseUrl ||
    !supabaseKey
  )
    throw new BookingError("Business authorization required.", 401);
  const token = authorization.slice(7),
    key = linkKey.parse(request.headers.get("x-business-link"));
  const auth = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [user, claims] = await Promise.all([
    auth.auth.getUser(token),
    auth.auth.getClaims(token),
  ]);
  if (
    user.error ||
    claims.error ||
    !user.data.user?.email_confirmed_at ||
    !claims.data
  )
    throw new BookingError("Business sign-in expired. Reconnect.", 401);
  verifyBusinessClaims(
    claims.data.claims,
    user.data.user.id,
    config.client,
    `${supabaseUrl.replace(/\/$/, "")}/auth/v1`,
  );
  const db = await database();
  const [actor] = await db.query<Actor>(
    `SELECT u.*,COALESCE((SELECT jsonb_agg(jsonb_build_object('capability',c.capability,'decision',c.decision,'scope',c.scope)) FROM reserve_user_capabilities c WHERE c.user_id=u.id),'[]'::jsonb) AS capability_overrides FROM reserve_users u WHERE u.id=$1`,
    [user.data.user.id],
  );
  if (!actor)
    throw new BookingError("Professional access is not configured.", 403);
  const grant = await readBusinessGrant(db, actor, config.client, key);
  return { db, actor, grant };
}
export function businessFailure(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof BookingError
          ? error.message
          : "Business connection unavailable.",
    },
    {
      status:
        error instanceof BookingError
          ? error.status
          : error instanceof ZodError
            ? 400
            : 503,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
