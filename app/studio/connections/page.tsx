import { studioActor } from "@/lib/studio-session";
import { database } from "@/lib/db";
import { RevokeBusiness } from "@/components/business-consent";
export default async function Connections() {
  const actor = await studioActor();
  if (process.env.RESERVE_BUSINESS_CONNECTIONS_ENABLED !== "true")
    return (
      <section>
        <h1>Business connections</h1>
        <p>Connections are awaiting activation.</p>
      </section>
    );
  const rows = await (
    await database()
  ).query<{ id: string; provider_id: string; expires_at: string }>(
    "SELECT id,provider_id,expires_at FROM reserve_business_grants WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC",
    [actor.id],
  );
  return (
    <section>
      <p className="eyebrow">PUBLIC AETHELIOS</p>
      <h1>Business connections</h1>
      <p>Each connection reads only its approved professional’s schedule.</p>
      {rows.length ? (
        rows.map((r) => (
          <article key={r.id}>
            <h2>{r.provider_id}</h2>
            <p>Expires {new Date(r.expires_at).toLocaleDateString("en-US")}</p>
            <RevokeBusiness id={r.id} />
          </article>
        ))
      ) : (
        <p>No active business connections.</p>
      )}
    </section>
  );
}
