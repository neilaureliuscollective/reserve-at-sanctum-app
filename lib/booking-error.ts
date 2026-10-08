/** Shared error contract: safe for permissions used in browser components. */
export class BookingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
