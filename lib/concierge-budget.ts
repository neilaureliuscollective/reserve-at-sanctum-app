import { randomUUID } from "node:crypto";
import { BookingError, type Actor } from "./booking";
import type { Database, Queryable } from "./db";
import { requireMember } from "./personal-reserve";
export async function conciergeRate(
  db: Queryable,
  actor: Actor,
  now = Date.now(),
) {
  requireMember(actor);
  const bucket = Math.floor(now / 60000);
  const [row] = await db.query<{ requests: number }>(
    `INSERT INTO reserve_concierge_rate(user_id,bucket,requests) VALUES($1,$2,1)
 ON CONFLICT(user_id) DO UPDATE SET requests=CASE WHEN reserve_concierge_rate.bucket=$2 THEN reserve_concierge_rate.requests+1 ELSE 1 END,bucket=$2
 WHERE reserve_concierge_rate.bucket<>$2 OR reserve_concierge_rate.requests<6 RETURNING requests`,
    [actor.id, bucket],
  );
  if (!row) throw new BookingError("Take a moment, then try again.", 429);
}
export type ModelConfig = {
  model: string;
  inputPrice: number;
  outputPrice: number;
  memberCents: number;
  tenantCents: number;
};
export function modelConfig(): ModelConfig | null {
  const model = process.env.RESERVE_CONCIERGE_MODEL;
  if (!model || !process.env.OPENAI_API_KEY) return null;
  const inputPrice = Number(
    process.env.RESERVE_CONCIERGE_INPUT_USD_PER_MILLION,
  );
  const outputPrice = Number(
    process.env.RESERVE_CONCIERGE_OUTPUT_USD_PER_MILLION,
  );
  const memberCents = Number(
    process.env.RESERVE_CONCIERGE_MEMBER_MONTHLY_CENTS || 200,
  );
  const tenantCents = Number(
    process.env.RESERVE_CONCIERGE_TENANT_MONTHLY_CENTS || 2500,
  );
  if (
    ![inputPrice, outputPrice].every(
      (n) => Number.isFinite(n) && n > 0 && n <= 1000,
    ) ||
    ![memberCents, tenantCents].every(
      (n) => Number.isSafeInteger(n) && n > 0 && n <= 100000,
    )
  )
    return null;
  return { model, inputPrice, outputPrice, memberCents, tenantCents };
}
export function tokenCost(input: number, output: number, c: ModelConfig) {
  return Math.max(
    1,
    Math.ceil((input * c.inputPrice + output * c.outputPrice) / 10000),
  );
}
export async function reserveModelSpend(
  db: Database,
  actor: Actor,
  c: ModelConfig,
  cents: number,
  now = new Date(),
) {
  requireMember(actor);
  if (!Number.isSafeInteger(cents) || cents < 1)
    throw new BookingError("Concierge budget is unavailable.", 503);
  const period = now.toISOString().slice(0, 7),
    id = randomUUID();
  await db.transaction(async (tx) => {
    // Fixed lock order serializes tenant and member admission across instances.
    for (const [subject, limit] of [
      ["tenant:legacy-reserve", c.tenantCents],
      [`member:${actor.id}`, c.memberCents],
    ] as const) {
      await tx.query(
        "INSERT INTO reserve_concierge_budgets(subject,period) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [subject, period],
      );
      const [admitted] = await tx.query(
        `UPDATE reserve_concierge_budgets SET charged_cents=charged_cents+$3 WHERE subject=$1 AND period=$2 AND charged_cents+$3<=$4 RETURNING charged_cents`,
        [subject, period, cents, limit],
      );
      if (!admitted)
        throw new BookingError(
          "The concierge conversation allowance is resting. Your membership, booking and routine tools remain available.",
          429,
        );
    }
    await tx.query(
      "INSERT INTO reserve_concierge_calls(id,user_id,period,reserved_cents,charged_cents,status,model) VALUES($1,$2,$3,$4,$4,'reserved',$5)",
      [id, actor.id, period, cents, c.model],
    );
  });
  return { id, period, cents };
}
export async function settleModelSpend(
  db: Database,
  actor: Actor,
  reservation: { id: string; period: string; cents: number },
  usage: { input: number; output: number } | null,
  c: ModelConfig,
) {
  const charged = usage
    ? tokenCost(usage.input, usage.output, c)
    : reservation.cents;
  await db.transaction(async (tx) => {
    const [claim] = await tx.query<{ id: string }>(
      `UPDATE reserve_concierge_calls SET status=$3,charged_cents=$4,input_tokens=$5,output_tokens=$6 WHERE id=$1 AND user_id=$2 AND status='reserved' RETURNING id`,
      [
        reservation.id,
        actor.id,
        usage ? "complete" : "uncertain",
        charged,
        usage?.input ?? null,
        usage?.output ?? null,
      ],
    );
    if (!claim) return;
    for (const subject of ["tenant:legacy-reserve", `member:${actor.id}`])
      await tx.query(
        "UPDATE reserve_concierge_budgets SET charged_cents=charged_cents+$3 WHERE subject=$1 AND period=$2",
        [subject, reservation.period, charged - reservation.cents],
      );
  });
}
