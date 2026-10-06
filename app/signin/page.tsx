import Image from "next/image";
import { safeDestination } from "@/lib/experience/entry";
import { configured, isPreview } from "@/lib/db";
import { hasSupabase } from "@/lib/auth";
import { SigninForm } from "@/components/signin-form";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your Legacy Reserve account" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const p = await searchParams;
  const next = safeDestination(p.next);
  // Deployment-specific links have a different Origin and cookie scope. Send
  // account creation to the stable address expected by the auth API.
  const canonicalOrigin = process.env.APP_ORIGIN;
  if (
    process.env.VERCEL_ENV === "production" &&
    canonicalOrigin &&
    (await headers()).get("host") !== new URL(canonicalOrigin).host
  ) {
    const url = new URL("/signin", canonicalOrigin);
    url.searchParams.set("next", next);
    if (p.error === "oauth") url.searchParams.set("error", "oauth");
    redirect(url.toString());
  }
  return (
    <main id="main" className="inner-page section signin-page">
      <div>
        <Image src="/brand/legacy-reserve/official-seal.webp" width={96} height={96} alt="Legacy Reserve official seal" priority />
        <p className="eyebrow">YOUR PLACE AT LEGACY RESERVE</p>
        <h1>
          Welcome <em>back.</em>
        </h1>
        <p>Your preferences. Your visits. A little more time for you.</p>
      </div>
      <SigninForm preview={isPreview()} hosted={hasSupabase() && configured()} next={next} oauthError={p.error === "oauth"} />
    </main>
  );
}
