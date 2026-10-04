/** Presentation only. Never use this deadline to authorize private access or
 * wrap mutations. The underlying operation is not cancelled. */
export async function optionalRead<T>(read: () => Promise<T>, milliseconds = 1800): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(read),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Optional presentation unavailable')), milliseconds);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
