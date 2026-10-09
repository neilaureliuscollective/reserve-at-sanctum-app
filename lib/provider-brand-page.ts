import { notFound } from "next/navigation";
import { cache } from "react";
import { configured, database } from "./db";
import { publicBrand } from "./provider-brands";
export const publishedBrand = cache(async (slug: string) => {
  if (!configured()) notFound();
  const row = await publicBrand(await database(), slug);
  if (!row || row.provider_id === "katie") notFound();
  return row;
});
