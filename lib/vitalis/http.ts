import { BookingError } from "../booking-error";
import { ZodError } from "zod";
export const privateHeaders = { "Cache-Control": "no-store" };
export function vitalisFailure(e: unknown) {
  const status =
    e instanceof BookingError ? e.status : e instanceof ZodError ? 400 : 503;
  const error =
    e instanceof BookingError
      ? e.message
      : status === 400
        ? "Please check your choices and try again."
        : "Vitalis could not refresh. Please try again.";
  // Do not log database errors, request bodies, interests or identity.
  return Response.json({ error }, { status, headers: privateHeaders });
}
