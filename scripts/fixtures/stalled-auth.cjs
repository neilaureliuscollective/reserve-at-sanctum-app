// Loaded explicitly by verify-startup only; never imported by application code.
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (new URL(url).hostname === 'wfbiytzlaokchfaxgwtt.supabase.co') {
    return originalFetch('http://127.0.0.1:3007/stalled-auth', init);
  }
  return originalFetch(input, init);
};
