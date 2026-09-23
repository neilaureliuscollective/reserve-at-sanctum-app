import { configured, isPreview } from "@/lib/db";
import { hasSupabase } from "@/lib/auth";
import { SigninForm } from "@/components/signin-form";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your Reserve account" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const p = await searchParams;
  const next =
    p.next && /^\/(?!\/)/.test(p.next) && !p.next.includes("\\")
      ? p.next
      : "/account";
  // Deployment-specific links have a different Origin and cookie scope. Send
  // account creation to the stable address expected by the auth API.
  if (
    process.env.NODE_ENV === "production" &&
    (await headers()).get("host") !== "reserve-at-sanctum-app.vercel.app"
  ) {
    const url = new URL("https://reserve-at-sanctum-app.vercel.app/signin");
    url.searchParams.set("next", next);
    if (p.error === "oauth") url.searchParams.set("error", "oauth");
    redirect(url.toString());
  }
  return (
    <main id="main" className="inner-page section signin-page">
      <div>
        <p className="eyebrow">YOUR PLACE AT THE RESERVE</p>
        <h1>
          Welcome <em>back.</em>
        </h1>
        <p>Your preferences. Your visits. A little more time for you.</p>
      </div>
      <SigninForm preview={isPreview()} hosted={hasSupabase() && configured()} next={next} oauthError={p.error === "oauth"} />
    </main>
  );
}
