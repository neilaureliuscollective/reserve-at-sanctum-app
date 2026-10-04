import test from 'node:test';
import assert from 'node:assert/strict';
import { optionalRead } from '../lib/experience/optional-read';
import { NextRequest } from 'next/server';
import { proxy } from '../proxy';

test('optional presentation expires even when a backend never settles', async () => {
  const started = Date.now();
  await assert.rejects(optionalRead(() => new Promise<never>(() => {}), 30), /unavailable/);
  assert.ok(Date.now() - started < 1000);
});
test('optional presentation preserves real results and handles late rejection', async () => {
  assert.deepEqual(await optionalRead(async () => ({ role: 'staff' })), { role: 'staff' });
  await assert.rejects(optionalRead(() => new Promise((_, reject) => setTimeout(() => reject(Error('late')), 50)), 10));
  await new Promise(resolve => setTimeout(resolve, 60));
});
test('public startup passes through proxy without account refresh or cookie mutation', async () => {
  for (const route of ['/', '/enter', '/home', '/setup', '/fix-it-shop']) {
    const response = await proxy(new NextRequest(`https://reserve.invalid${route}`, { headers: { cookie: 'sb-test-auth-token=stale' } }));
    assert.equal(response.headers.get('x-middleware-next'), '1');
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('set-cookie'), null);
  }
});
