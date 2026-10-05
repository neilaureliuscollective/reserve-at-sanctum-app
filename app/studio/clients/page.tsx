import Link from "next/link";
import { studioActor } from "@/lib/studio-session";
import { database } from "@/lib/db";
import { studioClients } from "@/lib/command-center";
import { z } from "zod";
export default async function Clients({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await studioActor();
  const page = z.coerce
    .number()
    .int()
    .min(0)
    .max(10000)
    .catch(0)
    .parse((await searchParams).page ?? 0);
  const rows = await studioClients(await database(), actor, page);
  return (
    <>
      <header className="studio-title">
        <p className="eyebrow">CLIENT RELATIONSHIPS</p>
        <h1>
          Know the <em>man.</em>
        </h1>
        <p>
          Service history from the appointment book. Chair preferences and
          private notes remain in the Chair.
        </p>
      </header>
      <section className="studio-section">
        {rows.slice(0, 30).map((c) => (
          <Link
            className="studio-action-row"
            href={`/studio/clients/${encodeURIComponent(c.id)}`}
            key={c.id}
          >
            <div>
              <strong>{c.name}</strong>
              <span>{c.visits} completed visits · View service history</span>
            </div>
            <span>↗</span>
          </Link>
        ))}
        {rows.length === 0 && (
          <>
            <h2>
              {page ? "No more clients." : "Before the first relationship."}
            </h2>
            <p>
              Clients appear here when they have appointments within your
              authorized schedule.
            </p>
          </>
        )}
        <div className="studio-pagination">
          {page > 0 && (
            <Link href={`/studio/clients?page=${page - 1}`}>Previous</Link>
          )}
          {rows.length > 30 && (
            <Link href={`/studio/clients?page=${page + 1}`}>Next</Link>
          )}
        </div>
      </section>
    </>
  );
}
