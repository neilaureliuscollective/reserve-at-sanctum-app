import { recoveryDestination } from "@/lib/booking-identity";
import { safeDestination } from "@/lib/experience/entry";
import { z } from "zod";
import { hasSupabase, previewLogin, signout, supabase } from "@/lib/auth";
import { mutationOrigin, failure } from "@/lib/http";
import { BookingError } from "@/lib/booking";
import { configured } from "@/lib/db";
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const body = await req.json();
    if (body.action === "signout") {
      await signout();
      return Response.json({ ok: true });
    }
    if (body.action === "preview") {
      await previewLogin(
        z
          .enum([
            "preview-neil",
            "preview-katie",
            "preview-client",
            "preview-other",
          ])
          .parse(body.identity),
      );
      return Response.json({ ok: true });
    }
    if (!hasSupabase() || !configured())
      throw new BookingError(
        "Member sign-in will open when hosted accounts are connected.",
        503,
      );
    if (body.action === "recover") {
      const email = z.email().parse(body.email);
      const { error } = await (
        await supabase()
      ).auth.resetPasswordForEmail(email, {
        redirectTo: new URL(
          "/auth/callback?next=" +
            encodeURIComponent(recoveryDestination(body.next)),
          process.env.APP_ORIGIN!,
        ).toString(),
      });
      if (error)
        throw new BookingError(
          "Unable to request recovery. Please try again later.",
          503,
        );
      return Response.json({ ok: true, recovery: true });
    }
    if (body.action === "update-password") {
      const client = await supabase();
      const { data } = await client.auth.getUser();
      if (!data.user)
        throw new BookingError("Open your recovery link first.", 401);
      const { error } = await client.auth.updateUser({
        password: z.string().min(12).max(128).parse(body.password),
      });
      if (error)
        throw new BookingError(
          "Unable to update the password. Request a new recovery link.",
        );
      return Response.json({ ok: true });
    }
    const input = z
      .object({
        action: z.enum(["signin", "signup"]),
        email: z.email(),
        password: z.string().min(12).max(128),
        name: z.string().min(1).max(100).optional(),
        next: z.string().max(2000).optional(),
      })
      .parse(body);
    const client = await supabase();
    if (input.action === "signup") {
      const { data, error } = await client.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: { name: input.name },
          emailRedirectTo: new URL(
            "/auth/callback?next=" +
              encodeURIComponent(safeDestination(input.next)),
            req.url,
          ).toString(),
        },
      });
      if (error)
        throw new BookingError(
          "Unable to create this account. Check your details or try signing in.",
        );
      return Response.json({ ok: true, verify: !data.session });
    }
    const { error } = await client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error)
      throw new BookingError(
        "Sign-in failed. Check your email and password.",
        401,
      );
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
