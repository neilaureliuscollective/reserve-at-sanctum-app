import { isFixItApp } from "@/lib/app-edition";
import { SigninForm } from "@/components/signin-form";
import { configured, isPreview } from "@/lib/db";
import { hasSupabase } from "@/lib/auth";
import { fixItDestination, fixItBooking as brand } from "@/lib/fix-it-booking";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const p = await searchParams,
    next = fixItDestination(p.next);
  const origin = process.env.APP_ORIGIN;
  if (
    process.env.VERCEL_ENV === "production" &&
    origin &&
    (await headers()).get("host") !== new URL(origin).host
  ) {
    const url = new URL(brand.signin, origin);
    url.searchParams.set("next", next);
    if (p.error === "oauth") url.searchParams.set("error", "oauth");
    redirect(url.toString());
  }
  return (
    <main id="main" className="fix-it-content fix-it-auth">
      <p className="eyebrow">FIX IT SHOP · YOUR APPOINTMENTS</p>
      <h1>
        Welcome <em>back.</em>
      </h1>
      <p>
        Use your existing Legacy Reserve account. Your appointments with Katie
        stay here.
      </p>
      <SigninForm
        preview={isPreview()}
        hosted={hasSupabase() && configured()}
        next={next}
        oauthError={p.error === "oauth"}
        clientOnly={!isFixItApp()}
        recoveryHref={brand.base + "/forgot-password"}
      />
    </main>
  );
}
