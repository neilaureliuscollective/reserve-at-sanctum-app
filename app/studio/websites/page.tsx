import Link from "next/link";
import { studioActor } from "@/lib/studio-session";
import { database } from "@/lib/db";
import { websiteReviewQueue } from "@/lib/business-websites";
import { BookingError } from "@/lib/booking";
import { WebsiteReview } from "@/components/website-review";
export default async function Websites() {
  const actor = await studioActor();
  if (process.env.RESERVE_BUSINESS_WEBSITES_ENABLED !== "true")
    return (
      <section>
        <h1>Website approvals</h1>
        <p>Website connections are awaiting activation.</p>
      </section>
    );
  let data;
  try {
    data = await websiteReviewQueue(await database(), actor);
  } catch (e) {
    if (e instanceof BookingError)
      return (
        <section>
          <h1>Website approvals</h1>
          <p>{e.message}</p>
        </section>
      );
    throw e;
  }
  return (
    <section>
      <p className="eyebrow">FIX IT SHOP</p>
      <h1>Website approvals</h1>
      <p>
        Brand revision {data.website.revision}. Review the exact saved change
        before approving.
      </p>
      <Link href={data.website.path}>View public website ↗</Link>
      {data.proposals.length ? (
        data.proposals.map((proposal) => (
          <WebsiteReview
            canPublish={actor.role === "owner"}
            key={proposal.id}
            proposal={proposal}
          />
        ))
      ) : (
        <p>No proposals awaiting review.</p>
      )}
      <h2>Approved proposal history</h2>
      <p>
        To restore older wording, prepare a new proposal in Aethelios. History
        is never silently overwritten.
      </p>
      {data.versions.map((v) => (
        <details key={v.revision}>
          <summary>Revision {v.revision}</summary>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(v.content, null, 2)}
          </pre>
        </details>
      ))}
    </section>
  );
}
