import { BookingError } from "./booking";
// Bound bytes before parsing and never log an invalid payload's personal text.
export async function readChairJson(
  request: Request,
  limit = 4096,
): Promise<unknown> {
  if (!request.body) throw new BookingError("A check-in is required.", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw new BookingError("Request is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const combined = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(combined));
  } catch {
    throw new BookingError("Please send a valid check-in.", 400);
  }
}
