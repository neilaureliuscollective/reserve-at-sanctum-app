import { z } from "zod";
import { hasSupabase, previewLogin, signout, supabase } from "@/lib/auth";
import { mutationOrigin, failure } from "@/lib/http";
import { BookingError } from "@/lib/booking";
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
    if (!hasSupabase())
      throw new BookingError(
        "Member sign-in will open when hosted accounts are connected.",
        503,
      );
    const input = z
      .object({
        action: z.enum(["signin", "signup"]),
        email: z.email(),
        password: z.string().min(12).max(128),
        name: z.string().min(1).max(100).optional(),
      })
      .parse(body);
    const client = await supabase();
    if (input.action === "signup") {
      const { data, error } = await client.auth.signUp({
        email: input.email,
        password: input.password,
        options: { data: { name: input.name } },
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
