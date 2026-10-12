import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Database } from "./db";
import { schema } from "./db";
import { lockdownStudio } from "./studio-lockdown";
export async function migrationManifest() {
  const directory = path.join(process.cwd(), "migrations");
  const files = (await readdir(directory)).filter(name => /^\d+.*\.sql$/.test(name)).sort();
  return Promise.all(files.map(async file => ({ file, sha256: createHash("sha256").update(await readFile(path.join(directory,file))).digest("hex") })));
}
/** Preserve existing migration bytes and all-or-nothing application. Hosted
 * migration history/baseline reconciliation is still required before approval. */
export async function applyReviewedMigrations(db: Database) {
  return db.transaction(async tx => {
    await tx.query("SELECT pg_advisory_xact_lock(726394821)");
    await schema(tx);
    await lockdownStudio(tx);
  });
}
