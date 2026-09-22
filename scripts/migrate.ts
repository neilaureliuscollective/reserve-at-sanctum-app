import { database, schema } from "../lib/db";
async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("Set DATABASE_URL for the intended Supabase project.");
  await schema(await database());
  console.log(
    "Reserve schema applied. No live offerings or staff roles were created.",
  );
  process.exit(0);
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
