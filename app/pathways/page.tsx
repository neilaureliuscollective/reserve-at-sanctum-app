import Link from "next/link";
import {
  pathways,
  educationalTopics,
  type Priority,
} from "@aethelios/concierge-core";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { memberRead } from "@/lib/experience/member";
import { readRoutine } from "@/lib/personal-reserve";
import { MemberShell } from "@/components/experience/member-shell";
import { RoutineEditor } from "@/components/experience/routine-editor";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your Pathways" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ priority?: string }>;
}) {
  const actor = await currentUser(),
    input = (await searchParams).priority;
  const priority = pathways.some((p) => p.id === input)
    ? (input as Priority)
    : undefined;
  const state =
    actor?.role === "client"
      ? await memberRead(async () => readRoutine(await database(), actor))
      : null;
  return (
    <MemberShell
      kicker="PERSONAL DIRECTION"
      title="Build your own standard."
      intro="Presence, performance and wellbeing. Start with one useful priority and a rhythm you can keep."
    >
      <div className="reserve-pathways">
        {pathways.map((p) => (
          <Link
            key={p.id}
            href={`/pathways?priority=${p.id}#routine`}
            className="reserve-pathway"
          >
            <span className="experience-kicker">{p.label}</span>
            <h2>{p.title}</h2>
            <p>{p.description}</p>
            <span className="text-link">Choose this direction ↗</span>
          </Link>
        ))}
      </div>
      <div id="routine">
        {state?.state === "ready" ? (
          <RoutineEditor
            key={priority ?? "saved"}
            saved={state.data}
            initialPriority={priority}
          />
        ) : state?.state === "unavailable" ? (
          <section className="member-line">
            <div>
              <h2>Your routine could not refresh.</h2>
              <p>Try again before making changes.</p>
            </div>
            <Link href="/pathways" className="text-link">
              Try again ↗
            </Link>
          </section>
        ) : (
          <section className="member-line">
            <div>
              <h2>A rhythm that belongs to you.</h2>
              <p>
                Customer accounts can save a priority and simple personal
                routine. General education is available below.
              </p>
            </div>
            <Link href="/signin?next=/pathways" className="button button-gold">
              Sign in to save your routine ↗
            </Link>
          </section>
        )}
      </div>
      <section id="wellness" className="reserve-education">
        <p className="experience-kicker">WELLNESS & OPTIMIZATION</p>
        <h2>Explore with clarity.</h2>
        <p>
          Learn first. Clinical evaluation and treatment decisions belong with
          licensed healthcare professionals.
        </p>
        <details>
          <summary>Hormone optimization</summary>
          <p>{educationalTopics.hormones}</p>
          <p>
            Prepare questions for your provider about symptoms, evaluation,
            alternatives, monitoring, and cost. Do not start or change treatment
            based on concierge guidance.
          </p>
        </details>
        <details>
          <summary>Peptide-related wellness</summary>
          <p>{educationalTopics.peptides}</p>
        </details>
        <p className="reserve-field-note">
          Educational content reviewed for this release on October 7, 2026. It
          is not personalized medical advice. No licensed wellness partner or
          consultation booking is active in this release.
        </p>
        <div className="reserve-source-links">
          <a
            href="https://www.endocrine.org/patient-engagement/endocrine-library/hypogonadism"
            target="_blank"
            rel="noreferrer"
          >
            Endocrine Society: low testosterone ↗
          </a>
          <a
            href="https://www.fda.gov/drugs/human-drug-compounding/certain-bulk-drug-substances-use-compounding-may-present-significant-safety-risks"
            target="_blank"
            rel="noreferrer"
          >
            FDA: compounding safety concerns ↗
          </a>
        </div>
      </section>
      <section className="member-line">
        <div>
          <p className="experience-kicker">AETHELIOS</p>
          <h2>Your next step, considered.</h2>
          <p>
            Ask for a routine foundation, understand your benefits, or find a
            Sanctum appointment.
          </p>
        </div>
        <Link href="/aethelios" className="button button-outline">
          Talk with Aethelios ↗
        </Link>
      </section>
    </MemberShell>
  );
}
