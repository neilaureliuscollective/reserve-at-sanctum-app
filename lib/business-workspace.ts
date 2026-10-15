import { z } from "zod";
import { DateTime } from "luxon";
import { BookingError, change, type Actor } from "./booking";
import type { Database, Queryable } from "./db";
import {
  requireBusinessAccess,
  businessAuthorityEnabled,
} from "./business-authority";
import {
  operationInput,
  proposeOperation,
  applyOperation,
} from "./studio-operations";
import { blockTime, removeBlock } from "./studio-blocks";
import { katieNativeBooking } from "./katie-launch";

// Borrow the existing domain transactions without opening a second transaction.
const transactionDatabase = (tx: Queryable): Database => ({
  ...tx,
  transaction: (fn) => fn(tx),
});
// Never return this internal adapter actor to a session or caller. Its authority
// is bounded by locked membership + provider/location checks in the outer transaction.
const operator = (actor: Actor, provider: string): Actor => ({
  ...actor,
  role: "operator",
  provider_id: provider,
  capability_overrides: [],
});
export async function suppressBusinessLegacyAccess(
  db: Queryable,
  actor: Actor,
): Promise<Actor> {
  if (actor.role === "owner") return actor; // Separate platform Founder authority.
  const rows = await db.query(
    "SELECT 1 FROM reserve_business_memberships WHERE user_id=$1 LIMIT 1",
    [actor.id],
  );
  return rows.length
    ? { ...actor, role: "client", provider_id: null, capability_overrides: [] }
    : actor;
}
export async function businessEntrance(db: Queryable, actor: Actor | null) {
  if (!actor || !businessAuthorityEnabled()) return null;
  const rows = await db.query(
    `SELECT b.id FROM reserve_businesses b JOIN reserve_business_memberships m ON m.business_id=b.id
    WHERE b.slug='fix-it-shop' AND b.state<>'archived' AND m.user_id=$1 AND m.revoked_at IS NULL AND m.verified_at IS NOT NULL`,
    [actor.id],
  );
  return rows.length ? "/fix-it-shop/manage" : null;
}
export async function fixItBusiness(db: Queryable) {
  const [b] = await db.query<{ id: string }>(
    "SELECT id FROM reserve_businesses WHERE slug='fix-it-shop'",
  );
  if (!b)
    throw new BookingError(
      "Fix It Shop management has not been provisioned.",
      503,
    );
  return b.id;
}
async function scopedProvider(
  tx: Queryable,
  actor: Actor,
  business: string,
  provider: string,
  configure = false,
) {
  const membership = await requireBusinessAccess(
    tx,
    actor,
    business,
    configure ? "configuration.manage" : "appointments.read",
  );
  const rows = await tx.query(
    `SELECT bp.provider_id FROM reserve_business_providers bp WHERE bp.business_id=$1 AND bp.provider_id=$2
    AND ($4::boolean OR EXISTS(SELECT 1 FROM reserve_business_staff_assignments sa WHERE sa.business_id=$1 AND sa.provider_id=$2 AND sa.user_id=$3)) FOR SHARE OF bp`,
    [business, provider, actor.id, membership.role !== "staff"],
  );
  if (!rows.length)
    throw new BookingError(
      "Professional is outside your business access.",
      403,
    );
}
export async function businessWorkspace(
  db: Database,
  actor: Actor,
  business: string,
  date: string,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !DateTime.fromISO(date).isValid)
    throw new BookingError("Choose a valid calendar day.");
  return db.transaction(async (tx) => {
    const membership = await requireBusinessAccess(
      tx,
      actor,
      business,
      "appointments.read",
    );
    const providers = await tx.query(
      `SELECT p.*,COALESCE(l.timezone,'America/Chicago') AS timezone FROM reserve_providers p
      JOIN reserve_business_providers bp ON bp.provider_id=p.id LEFT JOIN reserve_locations l ON l.id=p.location_id
      WHERE bp.business_id=$1 AND ($3::boolean OR EXISTS(SELECT 1 FROM reserve_business_staff_assignments sa WHERE sa.business_id=$1 AND sa.user_id=$2 AND sa.provider_id=p.id)) ORDER BY p.name`,
      [business, actor.id, membership.role !== "staff"],
    );
    const ids = providers.map((p) => p.id);
    const services = await tx.query(
      "SELECT id,provider_id,name,description,minutes,buffer,price,enabled,revision FROM reserve_services WHERE provider_id=ANY($1::text[]) ORDER BY name",
      [ids],
    );
    // Operational identity only: no email, phone, private notes, Chair or life context.
    const appointments = await tx.query(
      `SELECT a.id,a.provider_id,a.service_id,a.location_id,a.starts_at,a.ends_at,a.status,a.revision,s.name AS service_name,
      COALESCE(u.name,c.name,'Customer') AS client_name,COALESCE(l.timezone,'America/Chicago') AS timezone
      FROM reserve_appointments a JOIN reserve_services s ON s.id=a.service_id LEFT JOIN reserve_users u ON u.id=a.client_id
      LEFT JOIN reserve_clients c ON c.id=a.crm_client_id LEFT JOIN reserve_locations l ON l.id=a.location_id
      WHERE a.provider_id=ANY($1::text[]) AND (a.starts_at AT TIME ZONE COALESCE(l.timezone,'America/Chicago'))::date=$2::date
      ORDER BY a.starts_at,a.id LIMIT 200`,
      [ids, date],
    );
    const blocks = await tx.query(
      "SELECT id,provider_id,starts_at,ends_at FROM reserve_blocks WHERE provider_id=ANY($1::text[]) AND ends_at>now() ORDER BY starts_at LIMIT 200",
      [ids],
    );
    return {
      providers,
      services,
      appointments,
      blocks,
      date,
      canConfigure: membership.role !== "staff",
      nativeCalendar: katieNativeBooking(),
    };
  });
}
export const workspaceMutation = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("configure"),
      input: operationInput,
      acknowledge: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("appointment"),
      id: z.uuid(),
      revision: z.number().int().positive(),
      change: z.enum([
        "cancel",
        "reschedule",
        "complete",
        "arrive",
        "undo_arrival",
        "no_show",
        "undo_no_show",
      ]),
      start: z.iso.datetime().optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("block"),
      provider: z.string().min(1),
      date: z.string(),
      start: z.string(),
      end: z.string(),
    })
    .strict(),
  z
    .object({
      action: z.literal("unblock"),
      provider: z.string().min(1),
      id: z.uuid(),
    })
    .strict(),
]);
export async function mutateBusinessWorkspace(
  db: Database,
  actor: Actor,
  business: string,
  raw: unknown,
) {
  const input = workspaceMutation.parse(raw);
  return db.transaction(async (tx) => {
    if (input.action === "configure") {
      const p = input.input;
      await scopedProvider(tx, actor, business, p.provider_id, true);
      if (p.kind === "provider" && p.location_id) {
        const rows = await tx.query(
          "SELECT 1 FROM reserve_business_provider_locations WHERE business_id=$1 AND provider_id=$2 AND location_id=$3 FOR SHARE",
          [business, p.provider_id, p.location_id],
        );
        if (!rows.length)
          throw new BookingError(
            "Location is outside this professional’s business assignment.",
            403,
          );
      }
      const adapter = transactionDatabase(tx);
      const proposal = await proposeOperation(
        adapter,
        operator(actor, p.provider_id),
        p,
      );
      // applyOperation contains the existing price snapshots, revision, affected
      // visits acknowledgement and hours validation. No global actor escapes here.
      await applyOperation(
        adapter,
        { ...actor, role: "owner", capability_overrides: [] },
        proposal.id,
        input.acknowledge,
      );
      await tx.query(
        "INSERT INTO reserve_business_events(business_id,actor_id,action) VALUES($1,$2,'configuration_updated')",
        [business, actor.id],
      );
      return { ok: true };
    }
    if (input.action === "appointment") {
      await requireBusinessAccess(tx, actor, business, "appointments.read");
      const [appointment] = await tx.query<{ provider_id: string }>(
        "SELECT provider_id FROM reserve_appointments WHERE id=$1",
        [input.id],
      );
      if (!appointment) throw new BookingError("Appointment not found.", 404);
      await scopedProvider(tx, actor, business, appointment.provider_id);
      await change(
        transactionDatabase(tx),
        operator(actor, appointment.provider_id),
        input.id,
        { action: input.change, revision: input.revision, start: input.start },
      );
      return { ok: true };
    }
    await scopedProvider(tx, actor, business, input.provider);
    if (input.action === "block")
      await blockTime(
        transactionDatabase(tx),
        operator(actor, input.provider),
        input,
      );
    else
      await removeBlock(
        tx,
        operator(actor, input.provider),
        input.id,
        input.provider,
      );
    return { ok: true };
  });
}
