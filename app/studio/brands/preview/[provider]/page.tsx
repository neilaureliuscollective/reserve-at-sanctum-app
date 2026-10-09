import { notFound } from "next/navigation";
import { studioActor } from "@/lib/studio-session";
import { database } from "@/lib/db";
import { draftBrand, brandIdentity } from "@/lib/provider-brands";
import { sanctumDirectory } from "@/lib/experience/sanctum-directory";
import {
  ProviderWorld,
  ProviderHome,
} from "@/components/provider-booking-world";
import "@/app/fix-it-shop/app/booking.css";
import "@/app/providers/[slug]/provider.css";
export default async function Page({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const a = await studioActor(),
    db = await database(),
    row = await draftBrand(db, a, (await params).provider);
  if (!row) notFound();
  const b = brandIdentity(row, row.draft);
  return (
    <ProviderWorld profile={row.draft} identity={b} preview>
      <ProviderHome
        profile={row.draft}
        identity={b}
        directory={await sanctumDirectory(db)}
        preview
      />
    </ProviderWorld>
  );
}
