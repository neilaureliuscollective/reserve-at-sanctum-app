/** Server-only provisioning. Requires the intended Supabase database connection. */
import { z } from "zod";
import { database } from "../lib/db";
const args = process.argv.slice(2);
async function main() {
  if (!process.env.DATABASE_URL)
    throw Error(
      "Set DATABASE_URL to the intended hosted Supabase project. Local preview identities cannot be provisioned.",
    );
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
  const db = await database();
  await db.transaction(async (tx) => {
    const [auth] = await tx.query<{ id: string }>(
      "SELECT id FROM auth.users WHERE id=$1::uuid AND lower(email)=lower($2) AND email_confirmed_at IS NOT NULL",
      [id, email],
    );
    if (!auth)
      throw Error(
        "No confirmed account matches both UUID and email in this Supabase project. No changes made.",
      );
    const [user] = await tx.query(
      "SELECT id,role,provider_id FROM reserve_users WHERE id=$1 AND lower(email)=lower($2) FOR UPDATE",
      [id, email],
    );
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
      await tx.query(
        "INSERT INTO reserve_providers(id,name,enabled) VALUES('katie','Katie',false) ON CONFLICT(id) DO NOTHING",
      );
    await tx.query(
      "UPDATE reserve_users SET role=$1,provider_id=$2 WHERE id=$3",
      [role, role === "staff" ? "katie" : null, id],
    );
  });
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
