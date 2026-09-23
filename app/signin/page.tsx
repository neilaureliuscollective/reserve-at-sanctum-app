import { configured, isPreview } from "@/lib/db";
import { hasSupabase } from "@/lib/auth";
import { SigninForm } from "@/components/signin-form";
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
