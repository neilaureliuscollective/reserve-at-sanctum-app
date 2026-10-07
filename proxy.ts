import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseKey, supabaseUrl } from "./lib/supabase-config";

// Refresh hosted auth cookies before Server Components read them. Authorization
// remains in each server page / API route, using getUser and database-owned roles.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Let public pages stream before account services respond. Protected routes
  // retain cookie refresh and authoritative getUser() verification.
  const publicPaths = ['/', '/home', '/enter', '/setup', '/fix-it-shop', '/book', '/shop', '/chair', '/sanctum-mirror', '/mirror', '/profile'];
  if (publicPaths.includes(request.nextUrl.pathname)) {
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
  const url = supabaseUrl;
  const key = supabaseKey;
  if (!url || !key) return response;
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  try { await client.auth.getClaims(); }
  catch { /* Transport failure must not break public browsing. Private routes still verify getUser. */ }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/",
    "/home",
    "/pathways",
    "/aethelios",
    "/visit",
    "/shop",
    "/shop/:path*",
    "/my-reserve",
    "/membership",
    "/my-visit",
    "/sanctum-mirror",
    "/mirror",
    "/profile",
    "/fix-it-shop",
    "/enter",
    "/account/:path*",
    "/chair",
    "/my-sanctum/:path*",
    "/auth/callback",
    "/studio/:path*",
    "/signin",
    "/setup",
    "/book",
    "/api/:path*",
  ],
};
