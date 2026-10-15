import { appOrigin } from "@/lib/auth-confirmation";
import { accountEntranceFor } from "@/lib/fix-it-booking";
import { safeDestination } from "@/lib/experience/entry";
import { NextResponse } from "next/server";
import { hasSupabase, supabase } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = appOrigin();
  const code = url.searchParams.get("code");
  const requested = url.searchParams.get("next");
  const next = safeDestination(requested);

  if (code && hasSupabase()) {
    try {
      const { error } = await (await supabase()).auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, origin), { headers: { "Cache-Control": "private, no-store" } });
    } catch { /* Missing verifier or transport outage returns to safe sign-in. */ }
  }
  return NextResponse.redirect(
    new URL(
      `${accountEntranceFor(next)}?next=${encodeURIComponent(next)}&error=oauth`,
      origin,
    ),
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
