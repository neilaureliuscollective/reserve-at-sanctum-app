/** Bootstrap the first owner only; all other assignments use the owner workspace. */
import { z } from "zod";
import { database } from "../lib/db";
async function main() {
  const [id, email, confirm] = process.argv.slice(2);
  if (
    !process.env.DATABASE_URL ||
    !z.uuid().safeParse(id).success ||
    !z.email().safeParse(email).success ||
    confirm !== "--confirm-verified-owner"
  )
    throw Error(
      "Usage: staff:provision -- <verified UUID> <verified email> --confirm-verified-owner",
    );
  const db = await database();
  await db.transaction(async (tx) => {
    const [identity] = await tx.query(
      "SELECT id FROM auth.users WHERE id=$1::uuid AND lower(email)=lower($2) AND email_confirmed_at IS NOT NULL",
      [id, email],
    );
    if (!identity) throw Error("Confirmed account not found.");
    const [user] = await tx.query(
      "SELECT id FROM reserve_users WHERE id=$1 AND lower(email)=lower($2)",
      [id, email],
    );
    if (!user) throw Error("Sign in to Reserve first.");
    const [owner] = await tx.query(
      "SELECT user_id FROM reserve_access WHERE role='owner' AND enabled AND user_id<>$1",
      [id],
    );
    if (owner)
      throw Error(
        "Use the existing owner workspace; bootstrap only creates the initial owner.",
      );
    await tx.query(
      "INSERT INTO reserve_access(id,user_id,organization_id,role) VALUES($1,$2,'reserve','owner') ON CONFLICT(id) DO NOTHING",
      [`owner:${id}`, id],
    );
    await tx.query(
      "UPDATE reserve_users SET role='owner',identity_verified=true WHERE id=$1",
      [id],
    );
    await tx.query(
      "INSERT INTO reserve_operation_events(actor_id,entity_id,action) VALUES($1,$1,'owner_bootstrapped')",
      [id],
    );
  });
  console.log(
    "Verified owner assigned. No booking configuration was published.",
  );
}
main().catch(() => {
  console.error(
    "Provisioning failed. Check the verified account, intended database and existing owner.",
  );
  process.exitCode = 1;
});
