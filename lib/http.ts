import { BookingError } from "./booking";
import { ZodError } from "zod";
export function mutationOrigin(req: Request) {
  const expected = process.env.APP_ORIGIN;
  if (!expected)
    throw new BookingError("Application origin is not configured.", 503);
  if (req.headers.get("origin") !== new URL(expected).origin)
    throw new BookingError("Request origin is not allowed.", 403);
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new BookingError("JSON is required.", 415);
  if (Number(req.headers.get("content-length") || 0) > 16000)
    throw new BookingError("Request is too large.", 413);
}
export function failure(e: unknown) {
  if (e instanceof BookingError)
    return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof ZodError)
    return Response.json(
      { error: "Please check the details and try again." },
      { status: 400 },
    );
  console.error(
    "Reserve request failed",
    e instanceof Error ? e.message : "Unknown error",
  );
  return Response.json(
    { error: "This service is temporarily unavailable. Please try again." },
    { status: 503 },
  );
}
