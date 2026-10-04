import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createHash, randomBytes } from "node:crypto";
import { database, isPreview, configured } from "./db";
import type { Actor } from "./booking";
import { hasSupabase, supabaseKey, supabaseUrl } from "./supabase-config";
import { resolveAccess } from "../domains/access";
export { hasSupabase } from "./supabase-config";
export async function supabase() {
  const jar = await cookies();
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (items) => {
          try {
            items.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Server components cannot refresh cookies; mutations may. */
          }
        },
      },
    },
  );
}
export async function currentUser(): Promise<Actor | null> {
  if (!configured()) return null;
  const db = await database();
  if (hasSupabase()) {
    const {
      data: { user },
    } = await (await supabase()).auth.getUser();
    if (!user || !user.email_confirmed_at) return null;
    await db.query(
      "INSERT INTO reserve_users(id,name,email,identity_verified) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET identity_verified=excluded.identity_verified,email=excluded.email",
      [
        user.id,
        user.user_metadata?.name || user.email?.split("@")[0] || "Guest",
        user.email || `${user.id}@private.reserve`,
        Boolean(user.email_confirmed_at),
      ],
    );
    const [actor] = await db.query<Actor>("SELECT * FROM reserve_users WHERE id=$1", [user.id]);
    return actor ? resolveAccess(db, actor) : null;
  }
  if (!isPreview()) return null;
  const token = (await cookies()).get("reserve_preview")?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const actor = (
      await db.query<Actor>(
        "SELECT u.* FROM reserve_users u JOIN reserve_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now()",
        [hash],
      )
    )[0];
  return actor ? resolveAccess(db, actor) : null;
}
export async function previewLogin(identity: string) {
  if (!isPreview() || hasSupabase())
    throw new Error("Preview access is unavailable.");
  const allowed = [
    "preview-neil",
    "preview-katie",
    "preview-client",
    "preview-other",
  ];
  if (!allowed.includes(identity)) throw new Error("Unknown preview identity.");
  const token = randomBytes(32).toString("hex"),
    hash = createHash("sha256").update(token).digest("hex");
  await (
    await database()
  ).query(
    "INSERT INTO reserve_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '8 hours')",
    [hash, identity],
  );
  (await cookies()).set("reserve_preview", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: false,
    path: "/",
    maxAge: 28800,
  });
}
export async function signout() {
  if (hasSupabase()) await (await supabase()).auth.signOut();
  const jar = await cookies(),
    token = jar.get("reserve_preview")?.value;
  if (token && isPreview())
    await (
      await database()
    ).query("DELETE FROM reserve_sessions WHERE token_hash=$1", [
      createHash("sha256").update(token).digest("hex"),
    ]);
  jar.delete("reserve_preview");
}
