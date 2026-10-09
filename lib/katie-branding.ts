import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { configured, database } from "./db";
import { memberRead } from "./experience/member";
import { publicKatieProfile } from "./provider-brands";
import { katieProfile } from "./provider-brand-display";
export const katieBranding = cache(async () => {
  if (!configured()) return katieProfile;
  return (
    (await memberRead(async () => publicKatieProfile(await database()), 2500))
      .data ?? katieProfile
  );
});
export async function katieBrandIcon(size: string) {
  if (!["180", "192", "512"].includes(size)) return null;
  // The app symbol is distinct from the published, text-bearing brand logo.
  return readFile(
    path.join(process.cwd(), "public/fix-it-shop/app/icons", size + ".png"),
  );
}
