/** Abort the transport, including response-body reads, rather than leaving an
 * auth refresh running behind a presentation timeout. Authorization stays on
 * the server; a failed refresh never grants access. */
export const authFetch: typeof fetch = (input, init) => {
  const inherited = init?.signal ?? (input instanceof Request ? input.signal : null);
  const deadline = AbortSignal.timeout(5000);
  return fetch(input, {
    ...init,
    signal: inherited ? AbortSignal.any([inherited, deadline]) : deadline,
  });
};
