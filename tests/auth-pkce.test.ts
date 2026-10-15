import { test } from "node:test";
import assert from "node:assert/strict";
import { createServerClient } from "@supabase/ssr";
import { confirmationRedirect } from "../lib/auth-confirmation";
// Real installed SSR/Auth SDK, synthetic transport. No mail or external requests.
test("resend persists PKCE verifier cookies and a fresh callback client consumes them", async () => {
  const jar = new Map<string, string>();
  let challenge = "",
    verifier = "",
    redirect = "";
  const token = [
    { alg: "HS256", typ: "JWT" },
    {
      sub: "00000000-0000-4000-8000-000000000001",
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    "synthetic",
  ]
    .map((x) =>
      Buffer.from(typeof x === "string" ? x : JSON.stringify(x)).toString(
        "base64url",
      ),
    )
    .join(".");
  const transport: typeof fetch = async (input, init) => {
    const u = new URL(String(input));
    const body = JSON.parse(String(init?.body || "{}"));
    if (u.pathname.endsWith("/resend")) {
      challenge = body.code_challenge;
      redirect = u.searchParams.get("redirect_to") || "";
      return Response.json({});
    }
    assert.ok(u.pathname.endsWith("/token"));
    assert.equal(body.auth_code, "synthetic-code");
    verifier = body.code_verifier;
    return Response.json({
      access_token: token,
      refresh_token: "synthetic-refresh",
      expires_in: 3600,
      token_type: "bearer",
      user: {
        id: "00000000-0000-4000-8000-000000000001",
        aud: "authenticated",
        email: "synthetic@preview.invalid",
      },
    });
  };
  const make = () =>
    createServerClient(
      "https://synthetic.supabase.co",
      "synthetic-publishable",
      {
        global: { fetch: transport },
        cookies: {
          getAll: () => [...jar].map(([name, value]) => ({ name, value })),
          setAll: (items) => items.forEach((c) => jar.set(c.name, c.value)),
        },
      },
    );
  const destination = confirmationRedirect("/fix-it-shop/manage", {
    APP_ORIGIN: "https://booking.example",
  });
  const first = make();
  const resend = await first.auth.resend({
    type: "signup",
    email: "synthetic@preview.invalid",
    options: { emailRedirectTo: destination },
  });
  assert.equal(resend.error, null);
  assert.ok(challenge);
  assert.ok([...jar.keys()].some((k) => k.includes("code-verifier")));
  assert.equal(
    new URL(redirect).searchParams.get("next"),
    "/fix-it-shop/manage",
  );
  const callback = make();
  const result = await callback.auth.exchangeCodeForSession("synthetic-code");
  assert.equal(result.error, null);
  assert.ok(verifier);
  assert.ok([...jar.keys()].some((k) => k.endsWith("auth-token")));
  const empty = createServerClient(
    "https://synthetic.supabase.co",
    "synthetic-publishable",
    {
      global: {
        fetch: async () => {
          throw Error("Missing verifier must fail before network");
        },
      },
      cookies: { getAll: () => [], setAll: () => {} },
    },
  );
  assert.ok((await empty.auth.exchangeCodeForSession("synthetic-code")).error);
});
