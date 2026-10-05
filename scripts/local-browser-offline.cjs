// Local verification only: suppress optional Next.js package-version/telemetry
// network calls. Product requests and authentication are never intercepted.
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, ...args) => {
  const value = typeof input === 'string' ? input : input.url || String(input);
  if (value.startsWith('https://registry.npmjs.org/') || value.startsWith('https://telemetry.nextjs.org/')) return new Response('', { status: 503 });
  return originalFetch(input, ...args);
};
