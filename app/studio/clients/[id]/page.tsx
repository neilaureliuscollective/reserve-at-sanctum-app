import { PilotContactEditor } from "@/components/booking-pilot";
import Link from "next/link";
import { notFound } from "next/navigation";
import { studioActor } from "@/lib/studio-session";
import { database } from "@/lib/db";
import { pilotHistory } from "@/lib/booking-pilot";
import { clientHistory } from "@/lib/command-center";
import { BookingError } from "@/lib/booking";
import { z } from "zod";
export default async function Client({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await studioActor();
  const { id } = await params;
  const page = z.coerce
    .number()
    .int()
    .min(0)
    .max(10000)
    .catch(0)
    .parse((await searchParams).page ?? 0);
  let data;
  try {
    try {
      data = await pilotHistory(await database(), actor, id, page);
    } catch (e) {
      if (!(e instanceof BookingError && e.status === 404)) throw e;
      data = await clientHistory(await database(), actor, id, page);
    }
  } catch (e) {
    if (e instanceof BookingError && e.status === 404) notFound();
    throw e;
  }
  return (
    <>
      <Link className="studio-inline" href="/studio/clients">
        ← Clients
      </Link>
      <header className="studio-title">
        <p className="eyebrow">SERVICE HISTORY</p>
        <h1>{data.client.name}</h1>
        <p>
          Private Chair information remains in its consented working
          environment.
        </p>
      </header>
      {"phone" in data.client &&
        "email" in data.client &&
        "revision" in data.client &&
        typeof data.client.phone === "string" &&
        typeof data.client.email === "string" &&
        typeof data.client.revision === "number" && (
          <PilotContactEditor
            client={{
              id: data.client.id,
              name: data.client.name,
              email: data.client.email,
              phone: data.client.phone,
              revision: data.client.revision,
            }}
          />
        )}
      <section className="studio-section">
        <h2>Visit history.</h2>
        {!data.visits.length && (
          <p>No visits saved yet. Add an appointment from your calendar.</p>
        )}
        {data.visits.map((v) => (
          <div key={String(v.id)} className="studio-status-row">
            <div>
              <strong>{String(v.service_name)}</strong>
              <p>
                {new Intl.DateTimeFormat("en-US", {
                  timeZone:
                    typeof v.timezone === "string"
                      ? v.timezone
                      : "America/Chicago",
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(v.starts_at as string))}
              </p>
            </div>
            <span>{String(v.status)}</span>
          </div>
        ))}
        <div className="studio-pagination">
          {page > 0 && <Link href={`?page=${page - 1}`}>Previous</Link>}
          {"hasMore" in data && data.hasMore && (
            <Link href={`?page=${page + 1}`}>Next</Link>
          )}
        </div>
        <Link className="studio-inline" href="/studio/schedule#chair-studio">
          Open the Chair ↗
        </Link>
      </section>
    </>
  );
}
