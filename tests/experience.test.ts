import test from 'node:test';
import assert from 'node:assert/strict';
import { entryDestination, safeDestination } from '../lib/experience/entry';
import type { Actor } from '../lib/booking';
const actor = {id:'test',name:'Test',email:'test@example.invalid',provider_id:null,role:'client'} satisfies Actor;
test('entry maps verified roles and anonymous visitors',()=>{assert.equal(entryDestination(null),'/home');assert.equal(entryDestination(actor),'/home');for(const role of ['staff','operator','owner'] as const) assert.equal(entryDestination({...actor,role}),'/studio');});
test('deep links survive while external and malformed destinations are rejected',()=>{assert.equal(safeDestination('/book?service=hair&start=2026-10-10T12%3A00#review'),'/book?service=hair&start=2026-10-10T12%3A00#review');for(const value of ['//evil.com','/\\evil.com','https://evil.com','/\nevil',undefined]) assert.equal(safeDestination(value),'/enter');});
