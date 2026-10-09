import { z } from "zod";
import { currentUser, supabase } from "@/lib/auth";
import { database } from "@/lib/db";
import { mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import { BookingError } from "@/lib/booking";
import {
  businessConfig,
  consentRedirect,
  grantBusiness,
  revokeBusiness,
} from "@/lib/business-connections";
import { businessFailure } from "@/lib/business-token";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const config = businessConfig(),
      actor = await currentUser();
    if (!actor)
      throw new BookingError("Sign in before connecting your business.", 401);
    const input = z
      .object({
        authorizationId: z.string().min(1).max(200),
        provider: z.string().max(80).default(""),
        decision: z.enum(["approve", "deny"]),
        websiteAccess: z.boolean().default(false),
      })
      .strict()
      .parse(await readChairJson(req, 2000));
    const auth = await supabase();
    const verified = await auth.auth.getUser();
    if (
      verified.error ||
      !verified.data.user?.email_confirmed_at ||
      verified.data.user.id !== actor.id ||
      verified.data.user.is_anonymous
    )
      throw new BookingError("Use your confirmed professional account.", 401);
    const details = await auth.auth.oauth.getAuthorizationDetails(
      input.authorizationId,
    );
    if (details.error || !details.data)
      throw new BookingError("Authorization expired. Start again.", 409);
    if (
      "authorization_id" in details.data &&
      (details.data.client.id !== config.client ||
        details.data.user.id !== actor.id ||
        details.data.redirect_uri !== config.callback)
    )
      throw new BookingError("This application is not approved.", 403);
    if (input.decision === "deny") {
      // No grant is created. Native denial can fail for already-approved redirects; fail closed.
      const denied = await auth.auth.oauth.denyAuthorization(
        input.authorizationId,
        { skipBrowserRedirect: true },
      );
      const raw =
        denied.data?.redirect_url ??
        ("redirect_url" in details.data ? details.data.redirect_url : null);
      if (!raw)
        throw new BookingError(
          "Connection declined. Return to Public Aethelios.",
          409,
        );
      const target = new URL(raw),
        base = new URL(config.callback);
      if (
        target.origin !== base.origin ||
        target.pathname !== base.pathname ||
        target.username ||
        target.password ||
        target.hash
      )
        throw new BookingError("Authorization return refused.", 403);
      target.searchParams.delete("code");
      target.searchParams.set("error", "access_denied");
      return Response.json(
        { redirect: target.href },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    if (!input.provider)
      throw new BookingError("Choose an authorized professional.", 400);
    const approved =
      "redirect_url" in details.data
        ? details
        : await auth.auth.oauth.approveAuthorization(input.authorizationId, {
            skipBrowserRedirect: true,
          });
    if (approved.error || !approved.data || !("redirect_url" in approved.data))
      throw new BookingError("Authorization could not finish.", 409);
    const result = consentRedirect(approved.data.redirect_url, config.callback);
    await grantBusiness(
      await database(),
      actor,
      input.provider,
      config.client,
      result.key,
      input.websiteAccess &&
        process.env.RESERVE_BUSINESS_WEBSITES_ENABLED === "true",
    );
    return Response.json(
      { redirect: result.url },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return businessFailure(e);
  }
}
export async function DELETE(req: Request) {
  try {
    mutationOrigin(req);
    businessConfig();
    const actor = await currentUser();
    if (!actor) throw new BookingError("Sign in required.", 401);
    const input = z
      .object({ id: z.uuid() })
      .strict()
      .parse(await readChairJson(req, 2000));
    await revokeBusiness(await database(), actor, input.id);
    return Response.json(
      { revoked: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return businessFailure(e);
  }
}
