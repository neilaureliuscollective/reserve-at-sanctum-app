/** Server-only provisioning. Requires a temporary trusted admin connection. */
import { z } from "zod";
import postgres from "postgres";
import { SHARED_AUTH_PROJECT_REF } from "../lib/supabase-config";
const args = process.argv.slice(2);
async function main() {
  if (!process.env.ADMIN_DATABASE_URL)
    throw Error(
      "Set ADMIN_DATABASE_URL to the shared project's trusted admin connection. Local preview identities cannot be provisioned.",
    );
  const connection = new URL(process.env.ADMIN_DATABASE_URL);
  if (!connection.hostname.endsWith(".pooler.supabase.com") ||
      connection.username !== `postgres.${SHARED_AUTH_PROJECT_REF}` ||
      connection.port !== "5432" || !connection.password)
    throw Error("Admin connection must use the shared project's session pooler.");
  const [id, email, role, confirmation] = args;
  if (
    !z.uuid().safeParse(id).success ||
    !z.email().safeParse(email).success ||
    !["staff", "owner"].includes(role) ||
    confirmation !== "--confirm-verified-account"
  )
    throw Error(
      "Usage: npm run staff:provision -- <verified-user-uuid> <verified-email> <staff|owner> --confirm-verified-account",
    );
  const sql = postgres(process.env.ADMIN_DATABASE_URL, { prepare: false, max: 1 });
  try {
    await sql.begin(async (tx) => {
      const [auth] = await tx<{ id: string }[]>`
      SELECT id FROM auth.users WHERE id=${id}::uuid
      AND lower(email)=lower(${email}) AND email_confirmed_at IS NOT NULL`;
      if (!auth)
        throw Error(
          "No confirmed account matches both UUID and email in this Supabase project. No changes made.",
        );
      const [user] = await tx<{ id: string; role: string; provider_id: string | null }[]>`
      SELECT id,role,provider_id FROM reserve_users
      WHERE id=${id} AND lower(email)=lower(${email}) FOR UPDATE`;
      if (!user)
        throw Error(
          "The verified user must first sign in to this Reserve app. No changes made.",
        );
      if (
        user.role !== "client" &&
        !(
          user.role === role &&
          (role === "owner" || user.provider_id === "katie")
        )
      )
        throw Error(
          "This account already has a different privileged assignment. Review it manually.",
        );
      if (role === "staff")
        await tx`INSERT INTO reserve_providers(id,name,enabled)
        VALUES('katie','Katie',false) ON CONFLICT(id) DO NOTHING`;
      await tx`UPDATE reserve_users SET role=${role},provider_id=${role === "staff" ? "katie" : null} WHERE id=${id}`;
    });
  } finally {
    await sql.end();
  }
  console.log(
    "Verified account assigned. Sign in again and open /setup. No services or booking hours were enabled.",
  );
}
main()
  .then(() => process.exit(0))
  .catch(() => {
    console.error(
      "Provisioning failed. Verify arguments, confirmed account, existing assignment and intended database. No credentials are printed.",
    );
    process.exit(1);
  });
