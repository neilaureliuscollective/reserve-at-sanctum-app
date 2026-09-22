import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

test('local storage retains committed records after an abrupt process exit', async () => {
  await mkdir('.data', { recursive: true });
  const directory = mkdtempSync(path.resolve('.data/restart-test-'));
  const run = (body: string) => spawnSync(process.execPath, ['--input-type=module', '-e',
    `import { PGlite } from '@electric-sql/pglite';
     const db = new PGlite(${JSON.stringify(directory)});
     ${body}`,
  ], { encoding: 'utf8', timeout: 30000 });
  const write = run(`await db.exec("CREATE TABLE saved_visit(id text PRIMARY KEY); INSERT INTO saved_visit VALUES('persisted')"); process.exit(0);`);
  assert.equal(write.status, 0, write.stderr);
  const read = run(`console.log((await db.query('SELECT id FROM saved_visit')).rows[0].id); await db.close();`);
  assert.equal(read.status, 0, read.stderr);
  assert.match(read.stdout, /persisted/);
});
