import Link from "next/link";
import { currentUser, supabase } from "@/lib/auth";
import { database } from "@/lib/db";
import { businessConfig } from "@/lib/business-connections";
import { BusinessConsent } from "@/components/business-consent";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Connect your business · Legacy Reserve",
  robots: { index: false, follow: false },
};
export default async function Authorize({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const { authorization_id: id } = await searchParams;
  let configured = true;
  try {
    businessConfig();
  } catch {
    configured = false;
  }
  if (!configured)
    return (
      <main className="inner-page section">
        <h1>Business connections</h1>
        <p>This connection is awaiting activation.</p>
      </main>
    );
  const actor = await currentUser();
  if (!actor)
    return (
      <main className="inner-page section">
        <h1>Connect your business</h1>
        <Link
          className="button"
          href={
            "/signin?next=" +
            encodeURIComponent(
              "/business-connections/authorize?authorization_id=" + (id ?? ""),
            )
          }
        >
          Sign in to Legacy Reserve
        </Link>
      </main>
    );
  if (!id || id.length > 200)
    return (
      <main className="inner-page section">
        <h1>Start in Public Aethelios</h1>
        <p>Open Business Connections and select your company room.</p>
      </main>
    );
  const details = await (
    await supabase()
  ).auth.oauth.getAuthorizationDetails(id);
  if (
    details.data &&
    "authorization_id" in details.data &&
    (details.data.client.id !== businessConfig().client ||
      details.data.user.id !== actor.id ||
      details.data.redirect_uri !== businessConfig().callback)
  )
    return (
      <main className="inner-page section">
        <h1>Application not authorized</h1>
        <p>Start a new connection in Public Aethelios.</p>
      </main>
    );
  if (details.error)
    return (
      <main className="inner-page section">
        <h1>Authorization unavailable</h1>
        <p>Return to Public Aethelios and start again.</p>
      </main>
    );
  const providers = await (
    await database()
  ).query<{ id: string; name: string }>(
    "SELECT id,name FROM reserve_providers WHERE enabled AND " +
      (actor.role === "owner" ? "TRUE" : "id=$1") +
      " ORDER BY name",
    actor.role === "owner" ? [] : [actor.provider_id],
  );
  return (
    <main className="inner-page section">
      <p className="eyebrow">LEGACY RESERVE × PUBLIC AETHELIOS</p>
      <h1>Your business. Connected.</h1>
      <BusinessConsent
        websites={process.env.RESERVE_BUSINESS_WEBSITES_ENABLED === "true"}
        authorizationId={id}
        providers={providers}
      />
    </main>
  );
}
